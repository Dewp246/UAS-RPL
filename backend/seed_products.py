import os
import re
import django

def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'koperasi_backend.settings')
    django.setup()

    from orders.models import Product

    initial_products = [
        # 1. Beras & Produk tepung
        { "id": 1, "name": "Beras Premium 5kg", "category": "Beras & Produk tepung", "price": 78000, "image": "🌾", "stock": 25, "desc": "Beras premium kualitas super, pulen dan wangi." },
        { "id": 2, "name": "Beras Medium 5kg", "category": "Beras & Produk tepung", "price": 62500, "image": "🌾", "stock": 30, "desc": "Beras medium standar BULOG, pulen dan bersih." },
        { "id": 3, "name": "Beras Murah 5kg", "category": "Beras & Produk tepung", "price": 52500, "image": "🌾", "stock": 40, "desc": "Beras lokal murah terjangkau, cocok untuk kebutuhan harian." },
        { "id": 4, "name": "Beras Organik 1kg", "category": "Beras & Produk tepung", "price": 20000, "image": "🌾", "stock": 15, "desc": "Beras organik sehat bebas pestisida." },
        { "id": 5, "name": "Tepung Beras Rose Brand 1kg", "category": "Beras & Produk tepung", "price": 9500, "image": "🥡", "stock": 20, "desc": "Tepung beras murni Rose Brand berkualitas." },

        # 2. Minyak goreng & margarin
        { "id": 6, "name": "Minyak Goreng Jagung 1L", "category": "Minyak goreng & margarin", "price": 13000, "image": "🧴", "stock": 15, "desc": "Minyak goreng jagung sehat rendah kolesterol." },
        { "id": 7, "name": "Minyak Goreng Kelapa 1L", "category": "Minyak goreng & margarin", "price": 16000, "image": "🧴", "stock": 10, "desc": "Minyak goreng kelapa murni, jernih dan sehat." },
        { "id": 8, "name": "Minyak Goreng Filma Refill 2L", "category": "Minyak goreng & margarin", "price": 26000, "image": "🧴", "stock": 25, "desc": "Minyak goreng Filma kemasan isi ulang 2 Liter." },
        { "id": 9, "name": "Minyak Goreng Bimoli 1L", "category": "Minyak goreng & margarin", "price": 14900, "image": "🧴", "stock": 20, "desc": "Minyak goreng Bimoli berkualitas tinggi 1 Liter." },
        { "id": 10, "name": "Minyak Goreng Sania Pouch 1L", "category": "Minyak goreng & margarin", "price": 13900, "image": "🧴", "stock": 30, "desc": "Minyak goreng Sania pouch praktis 1 Liter." },

        # 3. Gula & gula merah
        { "id": 11, "name": "Gula Pasir Gulaku 1kg", "category": "Gula & gula merah", "price": 17500, "image": "🍬", "stock": 35, "desc": "Gula pasir putih murni tebu pilihan." },
        { "id": 12, "name": "Gula Merah Kelapa 1kg", "category": "Gula & gula merah", "price": 13000, "image": "🥮", "stock": 20, "desc": "Gula merah kelapa asli tanpa pemanis buatan." },
        { "id": 13, "name": "Gula Aren Asli 1kg", "category": "Gula & gula merah", "price": 15000, "image": "🥮", "stock": 15, "desc": "Gula aren bubuk murni kualitas premium." },

        # 4. Tepung terigu & tepung lainnya
        { "id": 14, "name": "Tepung Terigu Segitiga Biru 1kg", "category": "Tepung terigu & tepung lainnya", "price": 11000, "image": "🥡", "stock": 30, "desc": "Tepung terigu protein sedang serbaguna." },
        { "id": 15, "name": "Tepung Terigu Cakra Kembar 1kg", "category": "Tepung terigu & tepung lainnya", "price": 12500, "image": "🥡", "stock": 25, "desc": "Tepung terigu protein tinggi, cocok untuk roti dan mi." },

        # 5. Telur & produk telur
        { "id": 16, "name": "Telur Ayam Negeri (Per Butir)", "category": "Telur & produk telur", "price": 2700, "image": "🥚", "stock": 100, "desc": "Telur ayam negeri segar eceran per butir." },
        { "id": 17, "name": "Telur Ayam Negeri 1kg", "category": "Telur & produk telur", "price": 29000, "image": "🥚", "stock": 15, "desc": "Telur ayam negeri segar kiloan." },
        { "id": 18, "name": "Telur Bebek Mentah (Per Butir)", "category": "Telur & produk telur", "price": 3200, "image": "🥚", "stock": 50, "desc": "Telur bebek segar berkualitas tinggi." },
        { "id": 19, "name": "Telur Asin Matang (Per Butir)", "category": "Telur & produk telur", "price": 4500, "image": "🥚", "stock": 40, "desc": "Telur asin gurih masir matang siap konsumsi." },

        # 6. Susu & produk olahan susu
        { "id": 20, "name": "Susu UHT Indomilk 1L", "category": "Susu & produk olahan susu", "price": 13500, "image": "🥛", "stock": 20, "desc": "Susu cair UHT rasa plain/cokelat sehat." },
        { "id": 21, "name": "Susu Bubuk Dancow 250g", "category": "Susu & produk olahan susu", "price": 18000, "image": "🥛", "stock": 15, "desc": "Susu bubuk bernutrisi tinggi untuk keluarga." },
        { "id": 22, "name": "Susu Kental Manis Frisian Flag 400g", "category": "Susu & produk olahan susu", "price": 9500, "image": "🥫", "stock": 30, "desc": "Susu kental manis kaleng serbaguna." },

        # 7. Mie / Mi instan
        { "id": 23, "name": "Indomie Goreng Spesial", "category": "Mie / Mi instan", "price": 3100, "image": "🍜", "stock": 120, "desc": "Mie instan goreng favorit legendaris." },
        { "id": 24, "name": "Mie Sedaap Singapore Laksa", "category": "Mie / Mi instan", "price": 4000, "image": "🍜", "stock": 80, "desc": "Mie instan kuah premium rasa laksa singapura." },

        # 8. Kopi & teh sachet / bubuk
        { "id": 25, "name": "Kopi Bubuk Kapal Api 100g", "category": "Kopi & teh sachet / bubuk", "price": 13500, "image": "☕", "stock": 40, "desc": "Kopi bubuk hitam murni mantap aroma kopinya." },
        { "id": 26, "name": "Kopi Kapal Api Mix Sachet", "category": "Kopi & teh sachet / bubuk", "price": 3000, "image": "☕", "stock": 150, "desc": "Kopi instan dengan gula siap seduh." },
        { "id": 27, "name": "Teh Celup Sariwangi isi 25", "category": "Kopi & teh sachet / bubuk", "price": 3000, "image": "🍵", "stock": 60, "desc": "Teh celup aroma melati nikmat." },
        { "id": 28, "name": "Teh Herbal Kepala Djenggot Sachet", "category": "Kopi & teh sachet / bubuk", "price": 5000, "image": "🍵", "stock": 35, "desc": "Teh hijau herbal berkhasiat tinggi." },

        # 9. Camilan & biskuit (Sereal & Sarapan)
        { "id": 29, "name": "Sereal Gandum Oatmeal 500g", "category": "Camilan & biskuit", "price": 13500, "image": "🥣", "stock": 15, "desc": "Sereal gandum oatmeal sehat untuk sarapan." },
        { "id": 30, "name": "Sereal Jagung Cornflakes 250g", "category": "Camilan & biskuit", "price": 10500, "image": "🥣", "stock": 20, "desc": "Sereal jagung renyah bergizi." },

        # 10. Bumbu dapur instan & dasar (serbuk/kering)
        { "id": 31, "name": "Garam Beryodium Segitiga Emas 1kg", "category": "Bumbu dapur instan & dasar (serbuk/kering)", "price": 11500, "image": "🧂", "stock": 40, "desc": "Garam halus beryodium untuk memasak masakan sehat." },
        { "id": 32, "name": "Garam Kasar Krosok 1kg", "category": "Bumbu dapur instan & dasar (serbuk/kering)", "price": 6800, "image": "🧂", "stock": 30, "desc": "Garam kasar/krosok alami." },
        { "id": 33, "name": "Kecap Manis Bango 600ml Refill", "category": "Bumbu dapur instan & dasar (serbuk/kering)", "price": 12000, "image": "🧴", "stock": 25, "desc": "Kecap manis kental Bango kedelai hitam pilihan." },
        { "id": 34, "name": "Kecap Asin ABC 600ml", "category": "Bumbu dapur instan & dasar (serbuk/kering)", "price": 11000, "image": "🧴", "stock": 20, "desc": "Kecap asin ABC gurih penyedap masakan." },

        # 10. Bumbu dapur instan & dasar (serbuk/kering) [Saus & Sambal]
        { "id": 35, "name": "Saus Tomat ABC 600ml", "category": "Bumbu dapur instan & dasar (serbuk/kering)", "price": 13500, "image": "🧴", "stock": 25, "desc": "Saus tomat ABC segar pelengkap hidangan." },
        { "id": 36, "name": "Saus Tomat Premium Heinz 325g", "category": "Bumbu dapur instan & dasar (serbuk/kering)", "price": 17500, "image": "🧴", "stock": 15, "desc": "Saus tomat premium Heinz rasa kaya." },
        { "id": 37, "name": "Saus Tiram Saori 200ml", "category": "Bumbu dapur instan & dasar (serbuk/kering)", "price": 12500, "image": "🧴", "stock": 30, "desc": "Saus tiram Saori penyedap tumisan oriental." },
        { "id": 38, "name": "Sambal Botol Indofood 200ml", "category": "Bumbu dapur instan & dasar (serbuk/kering)", "price": 6500, "image": "🧴", "stock": 35, "desc": "Sambal pedas botolan praktis." },

        # 10. Bumbu dapur instan & dasar (serbuk/kering) [Bumbu Kering]
        { "id": 39, "name": "Merica Bubuk Ladaku 50g", "category": "Bumbu dapur instan & dasar (serbuk/kering)", "price": 6500, "image": "🧂", "stock": 50, "desc": "Merica bubuk murni kualitas premium." },
        { "id": 40, "name": "Ketumbar Bubuk Desaku 50g", "category": "Bumbu dapur instan & dasar (serbuk/kering)", "price": 5500, "image": "🧂", "stock": 45, "desc": "Ketumbar bubuk murni aroma harum." },
        { "id": 41, "name": "Kunyit Bubuk Desaku 50g", "category": "Bumbu dapur instan & dasar (serbuk/kering)", "price": 5500, "image": "🧂", "stock": 40, "desc": "Kunyit bubuk praktis pewarna alami makanan." },
        { "id": 42, "name": "Bumbu Racik Nasi Goreng Sachet", "category": "Bumbu dapur instan & dasar (serbuk/kering)", "price": 4000, "image": "🧂", "stock": 100, "desc": "Bumbu praktis nasi goreng instan." },

        # 11. Produk kalengan & olahan
        { "id": 43, "name": "Buah Nanas Kalengan Del Monte 240g", "category": "Produk kalengan & olahan", "price": 12500, "image": "🥫", "stock": 20, "desc": "Buah nanas segar dalam sirup kaleng." },
        { "id": 44, "name": "Buah Pear Kalengan 240g", "category": "Produk kalengan & olahan", "price": 12500, "image": "🥫", "stock": 15, "desc": "Buah pear segar dalam sirup kaleng." },
        { "id": 45, "name": "Kacang Polong Kalengan 240g", "category": "Produk kalengan & olahan", "price": 7500, "image": "🥫", "stock": 25, "desc": "Kacang polong segar kalengan pelengkap sop/tumisan." },
        { "id": 46, "name": "Kacang Merah Kalengan 240g", "category": "Produk kalengan & olahan", "price": 8500, "image": "🥫", "stock": 20, "desc": "Kacang merah olahan dalam kaleng." },

        # 9. Camilan & biskuit (47-50)
        { "id": 47, "name": "Biskuit Roma Kelapa 300g", "category": "Camilan & biskuit", "price": 3000, "image": "🍪", "stock": 50, "desc": "Biskuit Roma Kelapa renyah kesukaan keluarga." },
        { "id": 48, "name": "Biskuit Sandwich Nextar Choco 100g", "category": "Camilan & biskuit", "price": 2800, "image": "🍪", "stock": 40, "desc": "Biskuit lembut Nextar isi cokelat lumer." },
        { "id": 49, "name": "Permen Kopiko Sachet", "category": "Camilan & biskuit", "price": 2000, "image": "🍬", "stock": 100, "desc": "Permen rasa kopi murni harum mantap." },
        { "id": 50, "name": "Cokelat Batang Silverqueen 100g", "category": "Camilan & biskuit", "price": 12500, "image": "🍫", "stock": 30, "desc": "Cokelat susu dengan kacang mete renyah." },

        # 13. Kacang kacangan & snack tradisional
        { "id": 51, "name": "Kacang Tanah Kupas 250g", "category": "Kacang kacangan & snack tradisional", "price": 6500, "image": "🥜", "stock": 30, "desc": "Kacang tanah kupas berkualitas siap goreng." },
        { "id": 52, "name": "Kacang Hijau Pilihan 250g", "category": "Kacang kacangan & snack tradisional", "price": 8500, "image": "🫘", "stock": 25, "desc": "Kacang hijau pilihan, cocok untuk bubur sehat." },
        { "id": 53, "name": "Kacang Kedelai Mentah 1kg", "category": "Kacang kacangan & snack tradisional", "price": 10000, "image": "🫘", "stock": 20, "desc": "Kacang kedelai kuning mentah untuk pembuatan tempe/susu." },

        # 11. Produk kalengan & olahan (Sayuran beku & Daging)
        { "id": 54, "name": "Kacang Panjang Beku 250g", "category": "Produk kalengan & olahan", "price": 6500, "image": "🥦", "stock": 15, "desc": "Kacang panjang potong beku praktis." },
        { "id": 55, "name": "Wortel Potong Beku 250g", "category": "Produk kalengan & olahan", "price": 5500, "image": "🥦", "stock": 20, "desc": "Wortel potong dadu beku segar." },
        { "id": 56, "name": "Daging Sapi Segar 1kg", "category": "Produk kalengan & olahan", "price": 135000, "image": "🥩", "stock": 10, "desc": "Daging sapi bagian paha/sup segar kualitas prima." },
        { "id": 57, "name": "Daging Ayam Broiler 1 Ekor", "category": "Produk kalengan & olahan", "price": 29500, "image": "🍗", "stock": 15, "desc": "Daging ayam broiler segar ukuran sedang utuh." },
        { "id": 58, "name": "Ikan Kembung Segar 1kg", "category": "Produk kalengan & olahan", "price": 41500, "image": "🐟", "stock": 12, "desc": "Ikan kembung tangkapan nelayan lokal segar harian." },
        { "id": 59, "name": "Ikan Tongkol Segar 1kg", "category": "Produk kalengan & olahan", "price": 33500, "image": "🐟", "stock": 10, "desc": "Ikan tongkol segar kaya protein." },
        { "id": 60, "name": "Ikan Bandeng Segar 1kg", "category": "Produk kalengan & olahan", "price": 33500, "image": "🐟", "stock": 10, "desc": "Ikan bandeng segar pilihan warga." },

        # 10. Bumbu dapur instan & dasar (Sayuran segar & Bumbu dasar)
        { "id": 61, "name": "Bawang Merah Lokal 1kg", "category": "Bumbu dapur instan & dasar (serbuk/kering)", "price": 40500, "image": "🧅", "stock": 15, "desc": "Bawang merah kupas bersih lokal wangi." },
        { "id": 62, "name": "Bawang Putih Kating 1kg", "category": "Bumbu dapur instan & dasar (serbuk/kering)", "price": 23500, "image": "🧅", "stock": 18, "desc": "Bawang putih Kating siung besar berkualitas." },
        { "id": 63, "name": "Jahe Gajah Segar 1kg", "category": "Bumbu dapur instan & dasar (serbuk/kering)", "price": 25000, "image": "🫚", "stock": 12, "desc": "Jahe gajah pedas hangat berkhasiat." },
        { "id": 64, "name": "Bawang Bombay Segar 1kg", "category": "Bumbu dapur instan & dasar (serbuk/kering)", "price": 25000, "image": "🧅", "stock": 15, "desc": "Bawang bombay impor segar manis gurih." },
        { "id": 65, "name": "Jagung Pipilan Kuning 1kg", "category": "Bumbu dapur instan & dasar (serbuk/kering)", "price": 6500, "image": "🌽", "stock": 25, "desc": "Jagung manis pipil siap masak bakwan/sup." },
        { "id": 66, "name": "Wortel Lokal Segar 1kg", "category": "Bumbu dapur instan & dasar (serbuk/kering)", "price": 32500, "image": "🥕", "stock": 20, "desc": "Wortel segar kaya vitamin A." },
        { "id": 67, "name": "Tomat Merah Segar 1kg", "category": "Bumbu dapur instan & dasar (serbuk/kering)", "price": 26500, "image": "🍅", "stock": 15, "desc": "Tomat merah segar manis asam alami." },
        { "id": 68, "name": "Kubis/Kol Segar 1kg", "category": "Bumbu dapur instan & dasar (serbuk/kering)", "price": 17500, "image": "🥬", "stock": 15, "desc": "Kubis/kol renyah cocok untuk sup." },
        { "id": 69, "name": "Sawi Hijau Segar 1 Ikat", "category": "Bumbu dapur instan & dasar (serbuk/kering)", "price": 3000, "image": "🥬", "stock": 30, "desc": "Sayur sawi hijau ikat segar harian." },
        { "id": 70, "name": "Kentang Dieng Segar 1kg", "category": "Bumbu dapur instan & dasar (serbuk/kering)", "price": 21500, "image": "🥔", "stock": 20, "desc": "Kentang Dieng kualitas super, empuk digoreng." },
        { "id": 71, "name": "Kacang Panjang Segar 1 Ikat", "category": "Bumbu dapur instan & dasar (serbuk/kering)", "price": 7000, "image": "🥬", "stock": 20, "desc": "Kacang panjang segar renyah." },

        # 12. Minuman cair (sachet, UHT, sirup)
        { "id": 72, "name": "Susu Cair Milo Sachet", "category": "Minuman cair (sachet, UHT, sirup)", "price": 3000, "image": "🥛", "stock": 80, "desc": "Minuman susu cokelat Milo sachet instan." },
        { "id": 73, "name": "Chocolatos Cokelat Sachet", "category": "Minuman cair (sachet, UHT, sirup)", "price": 4000, "image": "☕", "stock": 100, "desc": "Minuman bubuk rasa cokelat premium." },
        { "id": 74, "name": "Sirup Marjan Stroberi 460ml", "category": "Minuman cair (sachet, UHT, sirup)", "price": 7000, "image": "🧴", "stock": 25, "desc": "Sirup manis rasa stroberi segar." },
        { "id": 75, "name": "Sirup Maple Premium 250ml", "category": "Minuman cair (sachet, UHT, sirup)", "price": 25000, "image": "🧴", "stock": 10, "desc": "Sirup maple asli pelengkap pancake." },

        # 9. Camilan & biskuit (Selai & Mentega)
        { "id": 76, "name": "Selai Kacang Skippy 400g", "category": "Camilan & biskuit", "price": 15000, "image": "🥫", "stock": 15, "desc": "Selai kacang krimi Skippy lezat." },
        { "id": 77, "name": "Selai Stroberi Morin 400g", "category": "Camilan & biskuit", "price": 12500, "image": "🥫", "stock": 20, "desc": "Selai buah stroberi manis asam segar." },

        # 7. Mie / Mi instan (Mie spesial)
        { "id": 78, "name": "Mie Telur Cap 3 Ayam", "category": "Mie / Mi instan", "price": 5500, "image": "🍜", "stock": 50, "desc": "Mie telur kering siap olah." },

        # 2. Minyak goreng & margarin (Margarin & oles)
        { "id": 79, "name": "Margarin Blue Band 250g", "category": "Minyak goreng & margarin", "price": 7500, "image": "🧈", "stock": 40, "desc": "Margarin Blue Band bernutrisi untuk olesan roti." },
        { "id": 80, "name": "Mentega Kacang Premium 400g", "category": "Minyak goreng & margarin", "price": 15000, "image": "🧈", "stock": 15, "desc": "Mentega rasa kacang olesan gurih." },

        # 14. Sabun, deterjen, perlengkapan kebersihan
        { "id": 81, "name": "Sabun Mandi Giv Batang", "category": "Sabun, deterjen, perlengkapan kebersihan", "price": 5200, "image": "🧼", "stock": 60, "desc": "Sabun mandi Giv batang wangi segar." },
        { "id": 82, "name": "Detergen Rinso Bubuk 250g", "category": "Sabun, deterjen, perlengkapan kebersihan", "price": 5000, "image": "🧼", "stock": 45, "desc": "Detergen bubuk anti noda pakaian bersih." },
        { "id": 83, "name": "Cairan Cuci Piring Mama Lemon", "category": "Sabun, deterjen, perlengkapan kebersihan", "price": 2500, "image": "🧼", "stock": 70, "desc": "Sabun cuci piring wangi lemon bersih kesat." },

        # 15. Kertas tisu & alat tulis sederhana
        { "id": 84, "name": "Kertas Tisu Roll Tessa", "category": "Kertas tisu & alat tulis sederhana", "price": 3000, "image": "🧻", "stock": 80, "desc": "Tisu gulung/roll toilet Tessa ekstra lembut." },
        { "id": 85, "name": "Kertas Tisu Wajah Paseo 250s", "category": "Kertas tisu & alat tulis sederhana", "price": 13500, "image": "🧻", "stock": 40, "desc": "Tisu wajah Paseo lembut higienis pack besar." },
        { "id": 86, "name": "Kertas Tisu Wajah Paseo 100s", "category": "Kertas tisu & alat tulis sederhana", "price": 8200, "image": "🧻", "stock": 50, "desc": "Tisu wajah Paseo pack sedang." },
        { "id": 87, "name": "Tisu Basah Paseo Pack", "category": "Kertas tisu & alat tulis sederhana", "price": 6000, "image": "🧻", "stock": 40, "desc": "Tisu basah antiseptik pembersih tangan." },

        # 16. Hand sanitizer / antiseptik / kesehatan ringan
        { "id": 88, "name": "Plester Hansaplast Kain isi 10", "category": "Hand sanitizer / antiseptik / kesehatan ringan", "price": 1000, "image": "🩹", "stock": 150, "desc": "Plester obat elastis penutup luka." },
        { "id": 89, "name": "Tolak Angin Sido Muncul Sachet", "category": "Hand sanitizer / antiseptik / kesehatan ringan", "price": 4500, "image": "🍵", "stock": 200, "desc": "Obat herbal alami meredakan masuk angin." },
        { "id": 90, "name": "Minyak Kayu Putih Cap Lang 60ml", "category": "Hand sanitizer / antiseptik / kesehatan ringan", "price": 16000, "image": "🧴", "stock": 35, "desc": "Minyak kayu putih murni meredakan perut kembung." },

        # 15. Kertas tisu & alat tulis sederhana (Alat tulis)
        { "id": 91, "name": "Pulpen Standar AE7 Hitam", "category": "Kertas tisu & alat tulis sederhana", "price": 2000, "image": "🖊️", "stock": 100, "desc": "Pulpen tinta hitam standar lancar ditulis." },
        { "id": 92, "name": "Pensil 2B Castell", "category": "Kertas tisu & alat tulis sederhana", "price": 1500, "image": "✏️", "stock": 80, "desc": "Pensil ujian OMR berkualitas tinggi." },
        { "id": 93, "name": "Amplop Putih Paperline isi 10", "category": "Kertas tisu & alat tulis sederhana", "price": 500, "image": "✉️", "stock": 200, "desc": "Amplop surat putih perekat kuat per lembar." },
        { "id": 94, "name": "Pulpen Mini Kenko Gel", "category": "Kertas tisu & alat tulis sederhana", "price": 3500, "image": "🖊️", "stock": 60, "desc": "Pulpen gel mini praktis dibawa." },
        { "id": 95, "name": "Label Harga Joyko", "category": "Kertas tisu & alat tulis sederhana", "price": 1800, "image": "🏷️", "stock": 50, "desc": "Label stiker kertas kecil untuk harga barang." },

        # 9. Camilan & biskuit (Snack tambahan)
        { "id": 96, "name": "Superstar Wafer Cokelat 1 Box", "category": "Camilan & biskuit", "price": 1250, "image": "🍫", "stock": 120, "desc": "Wafer bersalut cokelat renyah." },
        { "id": 97, "name": "Sasa Bumbu MSG Gurih 50g", "category": "Bumbu dapur instan & dasar (serbuk/kering)", "price": 1500, "image": "🧂", "stock": 100, "desc": "Penyedap rasa masakan MSG Sasa." },
        { "id": 98, "name": "Regal Marie Sachet 120g", "category": "Camilan & biskuit", "price": 1800, "image": "🍪", "stock": 60, "desc": "Biskuit marie Regal legendaris lezat bergizi." },
        { "id": 99, "name": "Roma Kelapa Sandwich Cokelat", "category": "Camilan & biskuit", "price": 9000, "image": "🍪", "stock": 35, "desc": "Biskuit Roma Kelapa isi krim cokelat tebal." },
        { "id": 100, "name": "Sari Gandum Sandwich Cokelat 115g", "category": "Camilan & biskuit", "price": 2500, "image": "🍪", "stock": 45, "desc": "Biskuit sandwich gandum utuh isi cokelat." },
    ]

    category_images = {
        "Beras & Produk tepung": "/images/category_sembako.png",
        "Minyak goreng & margarin": "/images/category_minyak.png",
        "Gula & gula merah": "/images/category_sembako.png",
        "Tepung terigu & tepung lainnya": "/images/category_sembako.png",
        "Telur & produk telur": "/images/category_sembako.png",
        "Susu & produk olahan susu": "/images/category_susu.png",
        "Mie / Mi instan": "/images/category_mie.png",
        "Kopi & teh sachet / bubuk": "/images/category_susu.png",
        "Camilan & biskuit": "/images/category_camilan.png",
        "Bumbu dapur instan & dasar (serbuk/kering)": "/images/category_sembako.png",
        "Produk kalengan & olahan": "/images/category_sembako.png",
        "Minuman cair (sachet, UHT, sirup)": "/images/category_susu.png",
        "Kacang kacangan & snack tradisional": "/images/category_camilan.png",
        "Sabun, deterjen, perlengkapan kebersihan": "/images/category_kebersihan.png",
        "Kertas tisu & alat tulis sederhana": "/images/category_atk.png",
        "Hand sanitizer / antiseptik / kesehatan ringan": "/images/category_kesehatan.png"
    }

    def slugify(text):
        text = text.lower()
        text = re.sub(r'[^a-z0-9\s-]', '', text)
        text = re.sub(r'[\s-]+', '-', text)
        return text.strip('-')

    print("Memulai seeding data produk KopeRT...")
    for prod_data in initial_products:
        slug = slugify(prod_data["name"])
        local_rel_path = f"/images/products/{slug}.png"
        local_abs_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "images", "products", f"{slug}.png")
        
        if os.path.exists(local_abs_path):
            image_path = local_rel_path
        else:
            image_path = category_images.get(prod_data["category"], prod_data["image"])

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

    print("Seeding produk selesai dengan sukses!")

if __name__ == "__main__":
    main()
