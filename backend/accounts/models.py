from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('warga', 'Warga'),
        ('user', 'User'),
    )
    
    GENDER_CHOICES = (
        ('L', 'Laki-laki'),
        ('P', 'Perempuan'),
    )

    MEMBER_TIER_CHOICES = (
        ('silver', 'Silver'),
        ('gold', 'Gold'),
        ('platinum', 'Platinum'),
    )
    
    nama = models.CharField(max_length=150, verbose_name="Nama Lengkap")
    phone_number = models.CharField(max_length=20, unique=True, verbose_name="Nomor Telepon")
    address = models.TextField(blank=True, null=True, verbose_name="Alamat Default")
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='user')
    nik = models.CharField(max_length=16, unique=True, blank=True, null=True, verbose_name="NIK")
    
    # Override email to be unique
    email = models.EmailField(unique=True, verbose_name="Alamat Email")

    # Alfagift/A-Member profile fields
    date_of_birth = models.DateField(blank=True, null=True, verbose_name="Tanggal Lahir")
    gender = models.CharField(max_length=2, choices=GENDER_CHOICES, blank=True, null=True, verbose_name="Jenis Kelamin")
    
    points = models.IntegerField(default=0, verbose_name="A-Poin")
    stamps = models.IntegerField(default=0, verbose_name="Stamp Digital")
    member_tier = models.CharField(max_length=15, choices=MEMBER_TIER_CHOICES, default='silver', verbose_name="Tingkat Member")
    
    # 6-digit transaction PIN for COD / security confirmation
    pin = models.CharField(max_length=6, blank=True, null=True, verbose_name="PIN Transaksi")

    # Set required fields for createsuperuser command
    REQUIRED_FIELDS = ['email', 'nama', 'phone_number']

    def __str__(self):
        return f"{self.nama} ({self.role})"


class WargaVerification(models.Model):
    nik = models.CharField(max_length=16, unique=True, verbose_name="NIK")
    token = models.CharField(max_length=10, unique=True, blank=True, verbose_name="Token Unik")
    is_used = models.BooleanField(default=False, verbose_name="Sudah Digunakan")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Tanggal Dibuat")

    def save(self, *args, **kwargs):
        if not self.token:
            import secrets
            import string
            alphabet = string.ascii_uppercase + string.digits
            while True:
                candidate = ''.join(secrets.choice(alphabet) for _ in range(8))
                if not WargaVerification.objects.filter(token=candidate).exists():
                    self.token = candidate
                    break
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.nik} - {self.token} ({'Used' if self.is_used else 'Unused'})"

class AddressBook(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses', verbose_name="Warga")
    label = models.CharField(max_length=50, verbose_name="Label Alamat (misal: Rumah, Kantor)")
    recipient_name = models.CharField(max_length=150, verbose_name="Nama Penerima")
    phone_number = models.CharField(max_length=20, verbose_name="Nomor Telepon Penerima")
    full_address = models.TextField(verbose_name="Alamat Lengkap")
    is_default = models.BooleanField(default=False, verbose_name="Alamat Utama")

    class Meta:
        ordering = ['-is_default', 'id']

    def __str__(self):
        return f"{self.label} - {self.recipient_name} ({self.user.nama})"
