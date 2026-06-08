from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, BasePermission
from rest_framework.decorators import action
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum

from .models import AddressBook, WargaVerification
from .serializers import (
    UserRegisterSerializer, 
    UserSerializer, 
    UserProfileUpdateSerializer,
    AddressBookSerializer,
    ChangePasswordSerializer,
    ChangePinSerializer,
    WargaRegisterSerializer,
    WargaVerificationSerializer,
    AdminUserSerializer
)

User = get_user_model()

def update_user_tier(user):
    if user.role == 'admin':
        return
    # Import dynamically to avoid circular dependencies
    from orders.models import Order
    thirty_days_ago = timezone.now() - timedelta(days=30)
    total_spent = Order.objects.filter(
        user=user,
        payment_status='paid',
        created_at__gte=thirty_days_ago
    ).aggregate(total=Sum('total_price'))['total'] or 0
    
    total_spent = float(total_spent)
    
    # SILVER: Rp0 s.d Rp749.999
    # GOLD: Rp750.000 s.d Rp1.999.999
    # PLATINUM: Minimal Rp2.000.000 atau lebih
    if total_spent >= 2000000:
        user.member_tier = 'platinum'
    elif total_spent >= 750000:
        user.member_tier = 'gold'
    else:
        user.member_tier = 'silver'
        
    user.save()

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data.copy()
        if 'username' not in data and 'email' in data:
            data['username'] = data['email']
            
        serializer = UserRegisterSerializer(data=data)
        if serializer.is_valid():
            user = serializer.save()
            user_data = UserSerializer(user).data
            return Response({
                "message": "Registrasi warga berhasil dilakukan.",
                "user": user_data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class WargaRegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data.copy()
        if 'username' not in data and 'email' in data:
            data['username'] = data['email']
            
        serializer = WargaRegisterSerializer(data=data)
        if serializer.is_valid():
            user = serializer.save()
            user_data = UserSerializer(user).data
            return Response({
                "message": "Registrasi warga RT berhasil dilakukan.",
                "user": user_data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'

class WargaVerificationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminRole]
    serializer_class = WargaVerificationSerializer
    queryset = WargaVerification.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=False, methods=['post'], url_path='bulk-create')
    def bulk_create(self, request):
        niks_input = request.data.get('niks')
        if not niks_input:
            return Response({"detail": "Daftar NIK wajib diisi."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Handle string or list
        if isinstance(niks_input, str):
            import re
            niks_list = [n.strip() for n in re.split(r'[\n,]+', niks_input) if n.strip()]
        elif isinstance(niks_input, list):
            niks_list = [str(n).strip() for n in niks_input if str(n).strip()]
        else:
            return Response({"detail": "Format NIK tidak valid. Harus berupa list atau string terpisah koma/baris baru."}, status=status.HTTP_400_BAD_REQUEST)

        # Remove duplicates
        niks_list = list(dict.fromkeys(niks_list))

        created_count = 0
        skipped_count = 0
        errors = []
        results = []

        from django.db import transaction
        try:
            with transaction.atomic():
                for nik in niks_list:
                    if len(nik) > 16 or not nik.isdigit():
                        errors.append(f"NIK '{nik}' tidak valid (harus angka maksimal 16 digit).")
                        skipped_count += 1
                        continue
                    
                    if WargaVerification.objects.filter(nik=nik).exists():
                        existing = WargaVerification.objects.get(nik=nik)
                        results.append(WargaVerificationSerializer(existing).data)
                        skipped_count += 1
                        continue
                        
                    w_ver = WargaVerification(nik=nik)
                    w_ver.save()
                    results.append(WargaVerificationSerializer(w_ver).data)
                    created_count += 1
        except Exception as e:
            return Response({"detail": f"Terjadi kesalahan saat memproses: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            "message": f"Berhasil memproses {len(niks_list)} NIK.",
            "created_count": created_count,
            "skipped_count": skipped_count,
            "errors": errors,
            "results": results
        }, status=status.HTTP_201_CREATED)

class AdminUserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminRole]
    serializer_class = AdminUserSerializer
    queryset = User.objects.all().order_by('-date_joined')


class UserMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        update_user_tier(request.user)
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

class UserProfileUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        serializer = UserProfileUpdateSerializer(
            request.user, 
            data=request.data, 
            partial=True, 
            context={'request': request}
        )
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                "message": "Profil berhasil diperbarui.",
                "user": UserSerializer(user).data
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AddressBookViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = AddressBookSerializer

    def get_queryset(self):
        return AddressBook.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=['post'], url_path='set-default')
    def set_default(self, request, pk=None):
        address = self.get_object()
        AddressBook.objects.filter(user=request.user).update(is_default=False)
        address.is_default = True
        address.save()
        return Response({
            "message": "Alamat utama berhasil diperbarui.",
            "addresses": AddressBookSerializer(self.get_queryset(), many=True).data
        }, status=status.HTTP_200_OK)

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({"message": "Kata sandi berhasil diubah."}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ChangePinView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePinSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = request.user
            user.pin = serializer.validated_data['new_pin']
            user.save()
            return Response({"message": "PIN keamanan berhasil disimpan."}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VerifyPinView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        pin = request.data.get('pin')
        if not pin:
            return Response({"detail": "PIN transaksi wajib diisi."}, status=status.HTTP_400_BAD_REQUEST)
        if not request.user.pin:
            return Response({"detail": "Anda belum mengatur PIN transaksi. Silakan atur di halaman profil."}, status=status.HTTP_400_BAD_REQUEST)
        if request.user.pin == pin:
            return Response({"valid": True, "message": "PIN transaksi terverifikasi."}, status=status.HTTP_200_OK)
        return Response({"detail": "PIN transaksi salah. Silakan coba lagi."}, status=status.HTTP_400_BAD_REQUEST)
