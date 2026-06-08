from django.db import models
from django.conf import settings

class Product(models.Model):
    name = models.CharField(max_length=200, verbose_name="Nama Produk")
    category = models.CharField(max_length=100, verbose_name="Kategori / Tipe Barang")
    price = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Harga")
    image = models.CharField(max_length=500, default="📦", verbose_name="Emoji / Gambar")
    stock = models.PositiveIntegerField(default=0, verbose_name="Stok")
    desc = models.TextField(blank=True, null=True, verbose_name="Deskripsi")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

class Order(models.Model):
    SHIPPING_CHOICES = (
        ('pickup', 'Ambil Sendiri'),
        ('delivery', 'Kirim ke Rumah'),
    )
    
    PAYMENT_STATUS_CHOICES = (
        ('pending', 'Pending / Belum Bayar'),
        ('paid', 'Lunas / Terbayar'),
        ('failed', 'Gagal'),
        ('expired', 'Kedaluwarsa'),
    )
    
    SHIPPING_STATUS_CHOICES = (
        ('proses', 'Diproses'),
        ('siap_diambil', 'Siap Diambil'),
        ('sedang_diantar', 'Sedang Diantar'),
        ('selesai', 'Selesai'),
    )

    PAYMENT_METHOD_CHOICES = (
        ('midtrans', 'Midtrans (Online)'),
        ('cod', 'Bayar di Tempat (COD)'),
    )
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='orders', verbose_name="Warga")
    order_id = models.CharField(max_length=50, unique=True, verbose_name="ID Pesanan")
    total_price = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Total Pembayaran")
    
    shipping_method = models.CharField(max_length=20, choices=SHIPPING_CHOICES, default='pickup', verbose_name="Metode Pengiriman")
    delivery_address = models.TextField(blank=True, null=True, verbose_name="Alamat Pengiriman")
    
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='midtrans', verbose_name="Metode Pembayaran")
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending', verbose_name="Status Pembayaran")
    shipping_status = models.CharField(max_length=20, choices=SHIPPING_STATUS_CHOICES, default='proses', verbose_name="Status Pengiriman")
    
    snap_token = models.CharField(max_length=255, blank=True, null=True, verbose_name="Snap Token Midtrans")
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Tanggal Dibuat")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Tanggal Diperbarui")

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.order_id} - {self.user.nama} ({self.payment_status})"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product_id = models.IntegerField(verbose_name="ID Produk")
    product_name = models.CharField(max_length=150, verbose_name="Nama Produk")
    quantity = models.PositiveIntegerField(default=1, verbose_name="Jumlah")
    price = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Harga Satuan")

    def __str__(self):
        return f"{self.product_name} x {self.quantity}"


class LoyaltyAuditLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='loyalty_logs')
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='loyalty_logs')
    points_earned = models.IntegerField(verbose_name="Poin Didapat")
    stamps_earned = models.IntegerField(verbose_name="Stamp Didapat")
    amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Nominal Belanja")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Tanggal Didistribusikan")

    def __str__(self):
        return f"{self.user.nama} - {self.points_earned} Pts, {self.stamps_earned} Stamps (Order: {self.order.order_id})"
