import os
import re
import django

def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'koperasi_backend.settings')
    django.setup()

    from orders.models import Product

    initial_products = [
        # SEMBAKO
        { "id": 1, "name": "Beras Topi Koki 5kg", "category": "Sembako", "price": 78000, "image": "BERAS TOPI KOKI.webp", "stock": 25, "desc": "Beras premium Topi Koki kualitas super, pulen dan wangi." },
        { "id": 2, "name": "Beras BMW 5kg", "category": "Sembako", "price": 65000, "image": "BERAS BMW.jpg", "stock": 30, "desc": "Beras medium BMW, pulen dan bersih." },
        { "id": 3, "name": "Beras Rojolele 5kg", "category": "Sembako", "price": 60000, "image": "BERAS ROJOLELE.jpg", "stock": 40, "desc": "Beras lokal Rojolele murah terjangkau, cocok untuk kebutuhan harian." },
        { "id": 4, "name": "Minyak Bimoli 1L", "category": "Sembako", "price": 14900, "image": "MINYAK BIMOLI.jpg", "stock": 20, "desc": "Minyak goreng Bimoli berkualitas tinggi 1 Liter." },
        { "id": 5, "name": "Minyak Sania 1L", "category": "Sembako", "price": 13900, "image": "MINYAK SANIA.jpg", "stock": 30, "desc": "Minyak goreng Sania pouch praktis 1 Liter." },
        { "id": 6, "name": "Minyak Sunco 1L", "category": "Sembako", "price": 15500, "image": "MINYAK SUNCO.jpg", "stock": 25, "desc": "Minyak goreng Sunco jernih dan sehat." },
        { "id": 7, "name": "Gula Gulaku 1kg", "category": "Sembako", "price": 17500, "image": "GULA GULAKU.jpg", "stock": 35, "desc": "Gula pasir putih murni tebu pilihan Gulaku." },
        { "id": 8, "name": "Gula Rose Brand 1kg", "category": "Sembako", "price": 17000, "image": "GULA ROSEBRAND.jpg", "stock": 20, "desc": "Gula pasir Rose Brand murni kualitas premium." },
        { "id": 9, "name": "Gula GMP 1kg", "category": "Sembako", "price": 16500, "image": "GULA GMP.jpg", "stock": 15, "desc": "Gula pasir GMP berkualitas untuk kebutuhan harian." },

        # MAKANAN DAN MINUMAN
        { "id": 10, "name": "Air Mineral Aqua 600ml", "category": "Makanan dan Minuman", "price": 3500, "image": "MINUMAN AQUA.webp", "stock": 100, "desc": "Air mineral Aqua segar dan murni." },
        { "id": 11, "name": "Teh Pucuk Harum 350ml", "category": "Makanan dan Minuman", "price": 4000, "image": "MINUMAN TEH PUCUK.jpg", "stock": 80, "desc": "Teh melati manis segar dalam kemasan botol." },
        { "id": 12, "name": "Golda Coffee 200ml", "category": "Makanan dan Minuman", "price": 3000, "image": "MINUMAN GOLDA.jpg", "stock": 120, "desc": "Minuman kopi instan siap minum rasa mantap." },
        { "id": 13, "name": "Mizone Active 500ml", "category": "Makanan dan Minuman", "price": 5000, "image": "MINUMAN MIZONE.jpg", "stock": 50, "desc": "Minuman isotonik rasa buah segar memulihkan energi." },
        { "id": 14, "name": "Susu UHT Ultra Milk 1L", "category": "Makanan dan Minuman", "price": 18500, "image": "MINUMAN ULTRAMILK.jpg", "stock": 20, "desc": "Susu cair UHT rasa plain/cokelat sehat." },
        { "id": 15, "name": "Chitato Sapi Panggang 68g", "category": "Makanan dan Minuman", "price": 11500, "image": "MAKANAN CHITATO.jpg", "stock": 30, "desc": "Keripik kentang renyah rasa sapi panggang." },
        { "id": 16, "name": "Wafer Tango Cokelat 130g", "category": "Makanan dan Minuman", "price": 8500, "image": "MAKANAN TANGO.jpg", "stock": 40, "desc": "Wafer renyah rasa cokelat krim tebal." },
        { "id": 17, "name": "Beng-Beng Cokelat Sachet", "category": "Makanan dan Minuman", "price": 2500, "image": "MAKANAN BENG-BENG.jpg", "stock": 150, "desc": "Snack wafer cokelat caramel crispy kesukaan keluarga." },
        { "id": 18, "name": "Chiki Balls Keju 55g", "category": "Makanan dan Minuman", "price": 7500, "image": "MAKANAN CHIKIBALLS.jpg", "stock": 60, "desc": "Snack bola chiki rasa keju gurih legendaris." },
        { "id": 19, "name": "Kacang Garuda Kulit 200g", "category": "Makanan dan Minuman", "price": 12500, "image": "MAKANAN KACANG GARUDA.jpg", "stock": 45, "desc": "Kacang tanah garing Garuda dengan rasa gurih alami." },

        # ATK
        { "id": 20, "name": "Pensil 2B Joyko", "category": "ATK", "price": 2000, "image": "PENSIL JOYKO.webp", "stock": 100, "desc": "Pensil Joyko berkualitas untuk keperluan menulis." },
        { "id": 21, "name": "Pulpen Kenko Gel", "category": "ATK", "price": 3500, "image": "PULPEN KENKO.jpg", "stock": 80, "desc": "Pulpen gel Kenko lancar ditulis." },
        { "id": 22, "name": "Buku Tulis Campus", "category": "ATK", "price": 6000, "image": "BUKU CAMPUS.jpeg", "stock": 50, "desc": "Buku tulis Campus tebal berkualitas tinggi." },
        { "id": 23, "name": "Penggaris Butterfly 30cm", "category": "ATK", "price": 5000, "image": "PENGGARIS BUTTERFLY.png", "stock": 40, "desc": "Penggaris plastik bening Butterfly presisi." },
        { "id": 24, "name": "Stapler Max HD-10", "category": "ATK", "price": 15000, "image": "STAPLER MAX.jpeg", "stock": 30, "desc": "Stapler Max HD-10 asli kuat dan tahan lama." },
        { "id": 25, "name": "Cutter Joyko A-300", "category": "ATK", "price": 8500, "image": "CUTTER JOYKO.jpg", "stock": 25, "desc": "Cutter Joyko tajam dengan body plastik kuat." }
    ]

    print("Memulai seeding data produk KopeRT...")
    for prod_data in initial_products:
        image_filename = prod_data["image"]
        local_rel_path = f"/images/products/{image_filename}"
        local_abs_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "images", "products", image_filename)
        
        if os.path.exists(local_abs_path):
            image_path = local_rel_path
        else:
            image_path = f"/images/category_{prod_data['category'].lower().replace(' ', '_')}.png"

        product, created = Product.objects.update_or_create(
            id=prod_data["id"],
            defaults={
                "name": prod_data["name"],
                "category": prod_data["category"],
                "price": prod_data["price"],
                "image": image_path,
                "stock": prod_data["stock"],
                "desc": prod_data["desc"]
            }
        )
        if created:
            print(f"Produk baru dibuat: {product.name} (Stok: {product.stock})")
        else:
            print(f"Produk diperbarui: {product.name} (Stok: {product.stock})")

    # Delete products not in the new 25 list
    seeded_ids = [p["id"] for p in initial_products]
    deleted_count, _ = Product.objects.exclude(id__in=seeded_ids).delete()
    if deleted_count > 0:
        print(f"Dihapus {deleted_count} produk lama yang tidak ada dalam daftar seed baru.")

    print("Seeding produk selesai dengan sukses!")

if __name__ == "__main__":
    main()
