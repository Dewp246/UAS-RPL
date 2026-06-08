from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import WargaVerification
from orders.models import Product, Order, OrderItem
from accounts.views import update_user_tier
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

class KopeRTTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create Admin
        self.admin = User.objects.create_superuser(
            username='admin@kopert.com',
            email='admin@kopert.com',
            password='password123',
            nama='RT Admin',
            phone_number='0811111111'
        )
        self.admin.role = 'admin'
        self.admin.save()
        
        # Create mock NIK verification token
        self.warga_nik = '3273123456789012'
        self.verification = WargaVerification.objects.create(
            nik=self.warga_nik
        )
        self.warga_token = self.verification.token

        # Create some test products
        self.rice = Product.objects.create(
            name='Beras Pandan Wangi 5kg',
            category='Beras & Produk tepung',
            price=75000.00,
            stock=100,
            desc='Beras kualitas super'
        )
        self.oil = Product.objects.create(
            name='Minyak Goreng Bimoli 2L',
            category='Minyak goreng & margarin',
            price=35000.00,
            stock=50,
            desc='Minyak kelapa sawit premium'
        )

    def test_admin_can_create_and_delete_nik_verification(self):
        # Authenticate as admin
        self.client.force_authenticate(user=self.admin)
        
        # Create verification token
        response = self.client.post('/api/auth/admin/warga-verification/', {'nik': '1234567890123456'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['nik'], '1234567890123456')
        self.assertTrue(len(response.data['token']) == 8)
        
        # Delete verification
        verification_id = response.data['id']
        response_delete = self.client.delete(f'/api/auth/admin/warga-verification/{verification_id}/')
        self.assertEqual(response_delete.status_code, status.HTTP_204_NO_CONTENT)

    def test_warga_registration_with_token(self):
        # Register warga using valid NIK and token
        payload = {
            'username': 'warga1@kopert.com',
            'email': 'warga1@kopert.com',
            'password': 'password123',
            'nama': 'Ahmad Warga',
            'phone_number': '081234567890',
            'address': 'RT 04 No. 12',
            'nik': self.warga_nik,
            'token': self.warga_token
        }
        
        response = self.client.post('/api/auth/warga-register/', payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user']['role'], 'warga')
        self.assertEqual(response.data['user']['nik'], self.warga_nik)
        
        # Verification token should be marked as used
        self.verification.refresh_from_db()
        self.assertTrue(self.verification.is_used)

        # Attempt to register again with same verification should fail
        response_dup = self.client.post('/api/auth/warga-register/', payload)
        self.assertEqual(response_dup.status_code, status.HTTP_400_BAD_REQUEST)

    def test_general_user_registration(self):
        payload = {
            'username': 'user1@gmail.com',
            'email': 'user1@gmail.com',
            'password': 'password123',
            'nama': 'Budi Pengunjung',
            'phone_number': '089876543210',
            'address': 'Jl. Sukajadi No. 55'
        }
        response = self.client.post('/api/auth/register/', payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user']['role'], 'user')
        self.assertIsNone(response.data['user']['nik'])

    def test_dynamic_discounts_in_serializer(self):
        # Helper to check prices for a specific role and tier combination
        def get_prices_for_user(role, tier):
            user = User.objects.create(
                username=f'{role}_{tier}@test.com',
                email=f'{role}_{tier}@test.com',
                role=role,
                member_tier=tier,
                phone_number=f'08999_{role[:2]}_{tier[:2]}'
            )
            self.client.force_authenticate(user=user)
            response = self.client.get(f'/api/products/{self.rice.id}/')
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            return response.data['price'], response.data['original_price']

        # Warga RT Silver: 4%
        price, orig = get_prices_for_user('warga', 'silver')
        self.assertEqual(orig, 75000.0)
        self.assertEqual(price, round(75000.0 * 0.96, 2))

        # Warga RT Gold: 6%
        price, _ = get_prices_for_user('warga', 'gold')
        self.assertEqual(price, round(75000.0 * 0.94, 2))

        # Warga RT Platinum: 8.5%
        price, _ = get_prices_for_user('warga', 'platinum')
        self.assertEqual(price, round(75000.0 * 0.915, 2))

        # Non-Warga (User) Silver: 0%
        price, _ = get_prices_for_user('user', 'silver')
        self.assertEqual(price, 75000.0)

        # Non-Warga (User) Gold: 1%
        price, _ = get_prices_for_user('user', 'gold')
        self.assertEqual(price, round(75000.0 * 0.99, 2))

        # Non-Warga (User) Platinum: 2.5%
        price, _ = get_prices_for_user('user', 'platinum')
        self.assertEqual(price, round(75000.0 * 0.975, 2))

    def test_secure_order_create_pricing_and_stock(self):
        # Create a user
        warga = User.objects.create(
            username='wargacheckout@kopert.com',
            email='wargacheckout@kopert.com',
            role='warga',
            member_tier='silver', # 4% discount
            phone_number='08122334455'
        )
        self.client.force_authenticate(user=warga)

        # Let's order 2 rice and 1 oil
        # Rice: 75,000 * 0.96 = 72,000 * 2 = 144,000
        # Oil: 35,000 * 0.96 = 33,600 * 1 = 33,600
        # Total: 177,600
        payload = {
            'shipping_method': 'pickup',
            'payment_method': 'midtrans',
            'items': [
                {'product_id': self.rice.id, 'quantity': 2},
                {'product_id': self.oil.id, 'quantity': 1}
            ]
        }
        
        response = self.client.post('/api/orders/create/', payload, format='json')
        if response.status_code != status.HTTP_201_CREATED:
            print("ORDER CREATION FAILED. ERROR DATA:", response.data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(float(response.data['order']['total_price']), 177600.0)
        
        # Verify stock decremented
        self.rice.refresh_from_db()
        self.oil.refresh_from_db()
        self.assertEqual(self.rice.stock, 98)
        self.assertEqual(self.oil.stock, 49)

    def test_tiering_updates_on_payment(self):
        # Create user
        warga = User.objects.create(
            username='wargatier@kopert.com',
            email='wargatier@kopert.com',
            role='warga',
            member_tier='silver',
            phone_number='0812999999'
        )
        
        # Create an order for that user
        order = Order.objects.create(
            user=warga,
            order_id="KOP-TEST-12345",
            total_price=800000.00, # Gold tier boundary is 750,000 s.d 1,999,999
            shipping_method='pickup',
            payment_method='cod',
            payment_status='pending',
            shipping_status='proses'
        )
        OrderItem.objects.create(
            order=order,
            product_id=self.rice.id,
            product_name=self.rice.name,
            quantity=1,
            price=800000.00
        )
        
        # Authenticate admin to mark it as paid
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/orders/admin-update/', {
            'order_id': order.order_id,
            'payment_status': 'paid'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify user tier updated to gold
        warga.refresh_from_db()
        self.assertEqual(warga.member_tier, 'gold')
        
        # Points and stamps: 800,000 / 10,000 = 80 points, 800,000 / 50,000 = 16 stamps
        self.assertEqual(warga.points, 80)
        self.assertEqual(warga.stamps, 16)

    def test_bulk_nik_verification_token_creation(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            'niks': "1111111111111111, 2222222222222222\n3333333333333333"
        }
        response = self.client.post('/api/auth/admin/warga-verification/bulk-create/', payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['created_count'], 3)
        self.assertEqual(len(response.data['results']), 3)
        
        # Test duplicate skip
        response_dup = self.client.post('/api/auth/admin/warga-verification/bulk-create/', payload)
        self.assertEqual(response_dup.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response_dup.data['created_count'], 0)
        self.assertEqual(response_dup.data['skipped_count'], 3)

    def test_admin_user_management(self):
        self.client.force_authenticate(user=self.admin)
        
        # Create a user to manage
        test_user = User.objects.create(
            username='user_manage@test.com',
            email='user_manage@test.com',
            role='user',
            member_tier='silver',
            phone_number='081234567800'
        )
        
        # List users
        response = self.client.get('/api/auth/admin/users/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) >= 2) # Admin + test_user
        
        # Partially update
        response_patch = self.client.patch(
            f'/api/auth/admin/users/{test_user.id}/',
            {'role': 'warga', 'member_tier': 'platinum'},
            format='json'
        )
        self.assertEqual(response_patch.status_code, status.HTTP_200_OK)
        test_user.refresh_from_db()
        self.assertEqual(test_user.role, 'warga')
        self.assertEqual(test_user.member_tier, 'platinum')
        
        # Delete user
        response_delete = self.client.delete(f'/api/auth/admin/users/{test_user.id}/')
        self.assertEqual(response_delete.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(id=test_user.id).exists())

    def test_admin_dashboard_stats(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/orders/admin/dashboard-stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_revenue', response.data)
        self.assertIn('order_velocity', response.data)
        self.assertIn('active_users', response.data)
        self.assertIn('critical_stock', response.data)
        self.assertIn('trends', response.data)

    def test_admin_cod_pin_verification(self):
        # Create citizen with PIN
        citizen = User.objects.create(
            username='warga_pin@test.com',
            email='warga_pin@test.com',
            role='warga',
            member_tier='silver',
            phone_number='081234567899',
            pin='123456'
        )
        
        # Create COD order
        order = Order.objects.create(
            user=citizen,
            order_id="KOP-COD-PIN-TEST",
            total_price=50000.0,
            shipping_method='delivery',
            payment_method='cod',
            payment_status='pending',
            shipping_status='proses'
        )
        
        self.client.force_authenticate(user=self.admin)
        
        # Try wrong PIN
        response = self.client.post('/api/orders/admin/verify-cod-pin/', {
            'order_id': order.order_id,
            'pin': '000000'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Try correct PIN
        response_correct = self.client.post('/api/orders/admin/verify-cod-pin/', {
            'order_id': order.order_id,
            'pin': '123456'
        })
        self.assertEqual(response_correct.status_code, status.HTTP_200_OK)
        
        # Verify order and citizens points/stamps
        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'paid')
        self.assertEqual(order.shipping_status, 'selesai')
        
        citizen.refresh_from_db()
        self.assertEqual(citizen.points, 5) # 50000 // 10000 = 5
        self.assertEqual(citizen.stamps, 1) # 50000 // 50000 = 1

    def test_admin_financial_reconciliation(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/orders/admin/reconciliation/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('daily_reconciliation', response.data)

