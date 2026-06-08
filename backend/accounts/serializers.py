from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import AddressBook, WargaVerification

User = get_user_model()

class WargaVerificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = WargaVerification
        fields = ('id', 'nik', 'token', 'is_used', 'created_at')
        read_only_fields = ('id', 'token', 'is_used', 'created_at')

class UserSerializer(serializers.ModelSerializer):
    # Determine if PIN is set (to not expose PIN directly in JSON)
    has_pin = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'nama', 'phone_number', 'address', 
            'role', 'nik', 'date_of_birth', 'gender', 'points', 'stamps', 'member_tier', 'has_pin'
        )
        read_only_fields = ('id', 'role', 'points', 'stamps', 'member_tier')

    def get_has_pin(self, obj):
        return bool(obj.pin)

class WargaRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    nik = serializers.CharField(required=True, max_length=16)
    token = serializers.CharField(required=True, max_length=10)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'nama', 'phone_number', 'address', 'nik', 'token')

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email ini sudah terdaftar.")
        return value

    def validate_phone_number(self, value):
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError("Nomor telepon ini sudah terdaftar.")
        return value

    def validate(self, attrs):
        nik = attrs.get('nik')
        token = attrs.get('token')
        
        if not nik.isdigit() or len(nik) != 16:
            raise serializers.ValidationError({"nik": "NIK harus berupa 16 digit angka."})

        # Check if NIK already used in another User account
        if User.objects.filter(nik=nik).exists():
            raise serializers.ValidationError({"nik": "NIK ini sudah mendaftarkan akun."})
            
        try:
            verification = WargaVerification.objects.get(nik=nik, token=token.upper(), is_used=False)
        except WargaVerification.DoesNotExist:
            raise serializers.ValidationError({"token": "Kombinasi NIK dan Token tidak ditemukan atau sudah digunakan."})
            
        attrs['verification_obj'] = verification
        return attrs

    def create(self, validated_data):
        verification = validated_data.pop('verification_obj')
        username = validated_data.get('username')
        if not username:
            username = validated_data['email']
            
        user = User.objects.create_user(
            username=username,
            email=validated_data['email'],
            password=validated_data['password'],
            nama=validated_data['nama'],
            phone_number=validated_data['phone_number'],
            address=validated_data.get('address', ''),
            role='warga',
            nik=validated_data['nik']
        )
        
        # Mark verification token as used
        verification.is_used = True
        verification.save()
        
        return user

class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'nama', 'phone_number', 'address')

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email ini sudah terdaftar.")
        return value

    def validate_phone_number(self, value):
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError("Nomor telepon ini sudah terdaftar.")
        return value

    def create(self, validated_data):
        username = validated_data.get('username')
        if not username:
            username = validated_data['email']
            
        user = User.objects.create_user(
            username=username,
            email=validated_data['email'],
            password=validated_data['password'],
            nama=validated_data['nama'],
            phone_number=validated_data['phone_number'],
            address=validated_data.get('address', ''),
            role='user'
        )
        return user

class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('nama', 'phone_number', 'date_of_birth', 'gender', 'address')

    def validate_phone_number(self, value):
        user = self.context['request'].user
        if User.objects.exclude(id=user.id).filter(phone_number=value).exists():
            raise serializers.ValidationError("Nomor telepon ini sudah digunakan oleh warga lain.")
        return value

class AddressBookSerializer(serializers.ModelSerializer):
    class Meta:
        model = AddressBook
        fields = ('id', 'label', 'recipient_name', 'phone_number', 'full_address', 'is_default')
        read_only_fields = ('id',)

    def create(self, validated_data):
        user = self.context['request'].user
        
        # If this is the user's first address, force it to be default
        if not AddressBook.objects.filter(user=user).exists():
            validated_data['is_default'] = True
            
        # If is_default is True, make other addresses non-default
        if validated_data.get('is_default', False):
            AddressBook.objects.filter(user=user).update(is_default=False)
            
        return AddressBook.objects.create(user=user, **validated_data)

    def update(self, instance, validated_data):
        user = self.context['request'].user
        if validated_data.get('is_default', False):
            AddressBook.objects.filter(user=user).update(is_default=False)
        return super().update(instance, validated_data)

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, style={'input_type': 'password'})
    new_password = serializers.CharField(required=True, min_length=6, style={'input_type': 'password'})

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Kata sandi lama tidak cocok.")
        return value

class ChangePinSerializer(serializers.Serializer):
    old_pin = serializers.CharField(required=False, allow_blank=True, max_length=6, min_length=6)
    new_pin = serializers.CharField(required=True, max_length=6, min_length=6)

    def validate_new_pin(self, value):
        if not value.isdigit():
            raise serializers.ValidationError("PIN harus berupa 6 digit angka.")
        return value

    def validate(self, attrs):
        user = self.context['request'].user
        # Only check old PIN if they already have one set
        if user.pin:
            old_pin = attrs.get('old_pin')
            if not old_pin:
                raise serializers.ValidationError({"old_pin": "PIN lama wajib diisi."})
            if user.pin != old_pin:
                raise serializers.ValidationError({"old_pin": "PIN lama salah."})
        return attrs

class AdminUserSerializer(serializers.ModelSerializer):
    has_pin = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'nama', 'phone_number', 'address', 
            'role', 'nik', 'date_of_birth', 'gender', 'points', 'stamps', 'member_tier', 'has_pin'
        )
        read_only_fields = ('id', 'has_pin')

    def get_has_pin(self, obj):
        return bool(obj.pin)

