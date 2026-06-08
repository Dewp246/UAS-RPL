import os
import re
import sys
import shutil
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'koperasi_backend.settings')
django.setup()

from orders.models import Product

def slugify(text):
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    text = re.sub(r'[\s-]+', '-', text)
    return text.strip('-')

def get_template_for_product(name, category):
    name_lower = name.lower()
    category_lower = category.lower()
    
    # 1. Telur
    if "telur" in category_lower or "telur" in name_lower:
        return "3d_egg_carton.png"
        
    # 2. Mie / Mi instan
    if "mie" in category_lower or "mie" in name_lower or "mi " in name_lower:
        return "3d_noodle_pack.png"
        
    # 3. Susu & minuman cokelat/bubuk
    if "susu" in category_lower or "susu" in name_lower or "milo" in name_lower or "chocolatos" in name_lower:
        return "3d_milk_carton.png"
        
    # 4. Bottles / Liquid items (Cooking Oil, Sauces, Syrups, Liquid Soaps, Eucalyptus Oil)
    if (
        "minyak goreng" in name_lower or 
        "bimoli" in name_lower or 
        "filma" in name_lower or 
        "sania" in name_lower or
        "kecap" in name_lower or 
        "saus" in name_lower or 
        "sambal" in name_lower or 
        "saori" in name_lower or
        "sirup" in name_lower or 
        "marjan" in name_lower or 
        "maple" in name_lower or
        "mama lemon" in name_lower or 
        "kayu putih" in name_lower or 
        "sanitizer" in name_lower
    ):
        return "3d_bottle_packaging.png"
        
    # 5. Canned and Fresh/Frozen Meat/Fish
    if (
        "kalengan" in category_lower or 
        "kaleng" in name_lower or 
        "del monte" in name_lower or
        "daging" in name_lower or 
        "ikan" in name_lower or 
        "ayam" in name_lower or 
        "bandeng" in name_lower or 
        "kembung" in name_lower or 
        "tongkol" in name_lower or
        "pears" in name_lower or
        "nanas" in name_lower or
        "polong" in name_lower
    ):
        return "3d_metal_can.png"
        
    # 6. Cardboard Box packaging (Tea boxes, Coffee packs, Tissue boxes, Stationery boxes, Plaster boxes)
    if (
        "teh" in category_lower or 
        "kopi" in category_lower or 
        "tisu" in name_lower or 
        "tissue" in name_lower or
        "paseo" in name_lower or 
        "tessa" in name_lower or
        "sariwangi" in name_lower or 
        "djenggot" in name_lower or 
        "kapal api" in name_lower or
        "sereal" in name_lower or 
        "oatmeal" in name_lower or 
        "cornflakes" in name_lower or
        "pulpen" in name_lower or 
        "pensil" in name_lower or 
        "amplop" in name_lower or 
        "label" in name_lower or
        "hansaplast" in name_lower or 
        "tolak angin" in name_lower or
        "biskuit" in name_lower or 
        "roma" in name_lower or 
        "nextar" in name_lower or 
        "regal" in name_lower or 
        "marie" in name_lower or 
        "superstar" in name_lower
    ):
        return "3d_box_packaging.png"
        
    # 7. Bag/Sachet packaging (Rice, Flour, Sugar, Salt, Spice sachets, Detergent bags, Nuts, Candy, Margarine/Butter packets)
    # This is a safe fallback for all other dry bag/packet items
    return "3d_bag_packaging.png"

def main():
    if hasattr(sys.stdout, 'reconfigure'):
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass
            
    print("=== Distributing 3D Product Images ===")
    
    frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "images", "products"))
    print(f"Products directory: {frontend_dir}")
    
    products = Product.objects.all().order_by('id')
    total_products = products.count()
    print(f"Processing {total_products} products in database...")
    
    success_count = 0
    
    for idx, product in enumerate(products, 1):
        slug = slugify(product.name)
        filename = f"{slug}.png"
        dest_path = os.path.join(frontend_dir, filename)
        
        template_name = get_template_for_product(product.name, product.category)
        template_path = os.path.join(frontend_dir, template_name)
        
        if not os.path.exists(template_path):
            print(f"[{idx}/{total_products}] Warning: Template '{template_name}' not found at '{template_path}'!")
            continue
            
        try:
            shutil.copy2(template_path, dest_path)
            print(f"[{idx}/{total_products}] Mapped '{product.name}' -> '{template_name}' ({filename})")
            success_count += 1
        except Exception as e:
            print(f"[{idx}/{total_products}] Error copying for '{product.name}': {e}")
            
    print(f"\n=== Completed! Successfully mapped {success_count}/{total_products} products. ===")

if __name__ == "__main__":
    main()
