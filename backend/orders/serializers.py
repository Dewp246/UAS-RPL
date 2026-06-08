from rest_framework import serializers
from .models import Order, OrderItem, Product
from accounts.serializers import UserSerializer

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ('id', 'name', 'category', 'price', 'image', 'stock', 'desc', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        request = self.context.get('request')
        
        # Save the original price in representation
        representation['original_price'] = float(instance.price)
        
        if request and request.user and request.user.is_authenticated:
            user = request.user
            discount = 0.0
            if user.role == 'warga':
                if user.member_tier == 'platinum':
                    discount = 0.085
                elif user.member_tier == 'gold':
                    discount = 0.06
                else:
                    discount = 0.04
            elif user.role == 'user':
                if user.member_tier == 'platinum':
                    discount = 0.025
                elif user.member_tier == 'gold':
                    discount = 0.01
                else:
                    discount = 0.0
            
            # Apply discount
            discounted_price = round(float(instance.price) * (1.0 - discount), 2)
            representation['price'] = discounted_price
        else:
            representation['price'] = float(instance.price)
            
        return representation

class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ('id', 'product_id', 'product_name', 'quantity', 'price')

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    user = UserSerializer(read_only=True)

    class Meta:
        model = Order
        fields = (
            'id', 'order_id', 'user', 'total_price', 
            'shipping_method', 'delivery_address', 'payment_method',
            'payment_status', 'shipping_status', 
            'snap_token', 'items', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'order_id', 'payment_status', 'shipping_status', 'snap_token', 'created_at', 'updated_at')

class OrderCreateSerializer(serializers.Serializer):
    shipping_method = serializers.ChoiceField(choices=Order.SHIPPING_CHOICES)
    delivery_address = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    payment_method = serializers.ChoiceField(choices=Order.PAYMENT_METHOD_CHOICES, default='midtrans')
    items = serializers.ListField(
        child=serializers.DictField(),
        allow_empty=False,
        help_text="Format: [{'product_id': 1, 'product_name': '...', 'quantity': 1, 'price': 10000}]"
    )

    def validate(self, attrs):
        method = attrs.get('shipping_method')
        address = attrs.get('delivery_address')
        if method == 'delivery' and not address:
            raise serializers.ValidationError({"delivery_address": "Alamat pengiriman wajib diisi jika memilih metode antar ke rumah."})
        return attrs

from .models import LoyaltyAuditLog

class LoyaltyAuditLogSerializer(serializers.ModelSerializer):
    user_nama = serializers.CharField(source='user.nama', read_only=True)
    user_nik = serializers.CharField(source='user.nik', read_only=True)
    order_id_code = serializers.CharField(source='order.order_id', read_only=True)

    class Meta:
        model = LoyaltyAuditLog
        fields = ('id', 'user', 'user_nama', 'user_nik', 'order', 'order_id_code', 'points_earned', 'stamps_earned', 'amount', 'created_at')

