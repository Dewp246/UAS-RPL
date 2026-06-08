import os
import re
import sys
import django
from PIL import Image, ImageDraw, ImageFont

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'koperasi_backend.settings')
django.setup()

from orders.models import Product

def slugify(text):
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    text = re.sub(r'[\s-]+', '-', text)
    return text.strip('-')

def extract_size(name):
    # Match patterns like "5kg", "1L", "250g", "600ml", "400g", "100g", "250s", "10s", etc.
    match = re.search(r'\b(\d+\s*(?:kg|l|g|ml|sachet|pcs|roll|butir|ekor|box|s))\b', name, re.IGNORECASE)
    if match:
        return match.group(1)
    
    # Fallback to check for words like "Per Butir", "1 Ikat", "1 Box", "1 Ekor", "Pack"
    match_words = re.search(r'\b(per\s+\w+|\d+\s+\w+|pack)\b', name, re.IGNORECASE)
    if match_words:
        return match_words.group(1)
    
    return ""

def clean_name(name, size_text):
    if size_text:
        # Case insensitive replace of size_text
        pattern = re.compile(re.escape(size_text), re.IGNORECASE)
        cleaned = pattern.sub("", name)
        # Clean up double spaces, empty parentheses, and leading/trailing spaces
        cleaned = re.sub(r'\(\s*\)', '', cleaned)
        cleaned = re.sub(r'\s+', ' ', cleaned)
        return cleaned.strip()
    return name

def draw_product_image(name, category, size_text, dest_path):
    width, height = 400, 400
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 1. Choose color palette based on category
    color_schemes = {
        "Beras & Produk tepung": ((230, 240, 255), (180, 210, 255)), # Soft Blue
        "Minyak goreng & margarin": ((255, 248, 220), (255, 220, 150)), # Golden Warm
        "Gula & gula merah": ((255, 240, 245), (255, 192, 203)), # Soft Pink/Rose
        "Tepung terigu & tepung lainnya": ((245, 245, 220), (222, 184, 135)), # Wheat/Beige
        "Telur & produk telur": ((255, 245, 238), (255, 218, 185)), # Peach
        "Susu & produk olahan susu": ((240, 248, 255), (200, 220, 245)), # Dairy Blue
        "Mie / Mi instan": ((255, 235, 235), (255, 180, 180)), # Light Red/Noodle Orange
        "Kopi & teh sachet / bubuk": ((245, 235, 220), (210, 180, 140)), # Coffee Brown
        "Camilan & biskuit": ((255, 240, 230), (255, 200, 170)), # Orange Cookies
        "Bumbu dapur instan & dasar (serbuk/kering)": ((240, 255, 240), (180, 230, 180)), # Mint Green
        "Produk kalengan & olahan": ((245, 245, 245), (210, 215, 220)), # Metallic Silver
        "Minuman cair (sachet, UHT, sirup)": ((240, 255, 255), (180, 240, 240)), # Aqua/Cyan
        "Kacang kacangan & snack tradisional": ((250, 240, 230), (230, 200, 170)), # Peanut Wood
        "Sabun, deterjen, perlengkapan kebersihan": ((224, 255, 255), (173, 216, 230)), # Clean Sky Blue
        "Kertas tisu & alat tulis sederhana": ((255, 255, 240), (240, 240, 200)), # Stationery Yellow
        "Hand sanitizer / antiseptik / kesehatan ringan": ((240, 255, 250), (180, 220, 210)), # Medical Teal
    }
    
    bg_start, bg_end = color_schemes.get(category, ((245, 247, 250), (220, 225, 235)))
    
    # Draw background gradient
    for y in range(height):
        r = int(bg_start[0] + (bg_end[0] - bg_start[0]) * (y / height))
        g = int(bg_start[1] + (bg_end[1] - bg_start[1]) * (y / height))
        b = int(bg_start[2] + (bg_end[2] - bg_start[2]) * (y / height))
        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))
        
    # Draw modern Card Container
    card_margin = 35
    card_rect = [card_margin, card_margin, width - card_margin, height - card_margin]
    draw.rounded_rectangle(card_rect, radius=24, fill=(255, 255, 255, 235), outline=(255, 255, 255, 255), width=2)
    
    # Load Fonts
    font_paths = [
        "C:\\Windows\\Fonts\\segoeuib.ttf", 
        "C:\\Windows\\Fonts\\arialbd.ttf",  
        "C:\\Windows\\Fonts\\tahoma.ttf",
    ]
    font_path_reg = [
        "C:\\Windows\\Fonts\\segoeui.ttf",  
        "C:\\Windows\\Fonts\\arial.ttf",    
    ]
    
    bold_font = None
    reg_font = None
    small_font = None
    
    for path in font_paths:
        if os.path.exists(path):
            try:
                bold_font = ImageFont.truetype(path, 22)
                break
            except Exception:
                pass
    if not bold_font:
        bold_font = ImageFont.load_default()
        
    for path in font_path_reg:
        if os.path.exists(path):
            try:
                reg_font = ImageFont.truetype(path, 14)
                small_font = ImageFont.truetype(path, 11)
                break
            except Exception:
                pass
    if not reg_font:
        reg_font = ImageFont.load_default()
        small_font = ImageFont.load_default()
        
    # Draw Category Emblem / Tag
    draw.rounded_rectangle([card_margin + 20, card_margin + 18, width - card_margin - 20, card_margin + 46], 
                           radius=8, fill=(240, 244, 250, 255))
    draw.text((width // 2, card_margin + 32), category.upper(), fill=(100, 115, 140, 255), font=small_font, anchor="mm")
    
    # Draw Product Icon circle
    icon_y = height // 2 - 30
    draw.ellipse([width // 2 - 42, icon_y - 42, width // 2 + 42, icon_y + 42], fill=(245, 247, 252, 255), outline=bg_end, width=2)
    
    # Category Emojis
    emojis = {
        "Beras & Produk tepung": "🌾",
        "Minyak goreng & margarin": "🧴",
        "Gula & gula merah": "🍬",
        "Tepung terigu & tepung lainnya": "🥡",
        "Telur & produk telur": "🥚",
        "Susu & produk olahan susu": "🥛",
        "Mie / Mi instan": "🍜",
        "Kopi & teh sachet / bubuk": "☕",
        "Camilan & biskuit": "🍪",
        "Bumbu dapur instan & dasar (serbuk/kering)": "🧂",
        "Produk kalengan & olahan": "🥫",
        "Minuman cair (sachet, UHT, sirup)": "🥤",
        "Kacang kacangan & snack tradisional": "🥜",
        "Sabun, deterjen, perlengkapan kebersihan": "🧼",
        "Kertas tisu & alat tulis sederhana": "📝",
        "Hand sanitizer / antiseptik / kesehatan ringan": "🩹",
    }
    emoji_char = emojis.get(category, "📦")
    
    emoji_font = None
    try:
        emoji_font = ImageFont.truetype("C:\\Windows\\Fonts\\seguiemj.ttf", 36)
    except Exception:
        try:
            emoji_font = ImageFont.truetype("C:\\Windows\\Fonts\\arial.ttf", 36)
        except Exception:
            emoji_font = ImageFont.load_default()
            
    draw.text((width // 2, icon_y), emoji_char, fill=(0, 0, 0, 255), font=emoji_font, anchor="mm")
    
    # Clean product title
    display_name = clean_name(name, size_text)
    
    # Wrap text
    words = display_name.split()
    lines = []
    current_line = []
    for word in words:
        current_line.append(word)
        test_str = " ".join(current_line)
        bbox = draw.textbbox((0, 0), test_str, font=bold_font)
        w = bbox[2] - bbox[0]
        if w > (width - card_margin * 2 - 40):
            current_line.pop()
            lines.append(" ".join(current_line))
            current_line = [word]
    lines.append(" ".join(current_line))
    
    # Draw text lines
    text_y = height // 2 + 50
    for idx, line in enumerate(lines[:2]):
        line_y = text_y + (idx * 26)
        draw.text((width // 2, line_y), line, fill=(40, 50, 70, 255), font=bold_font, anchor="mm")
        
    # Draw Size Pill Badge
    if size_text:
        badge_y = height - card_margin - 35
        badge_w = 90
        badge_h = 24
        draw.rounded_rectangle([width // 2 - badge_w // 2, badge_y - badge_h // 2, width // 2 + badge_w // 2, badge_y + badge_h // 2],
                               radius=12, fill=bg_end + (255,))
        draw.text((width // 2, badge_y), size_text, fill=(70, 85, 110, 255), font=small_font, anchor="mm")
        
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    img.save(dest_path, "PNG")

def main():
    # Force UTF-8 output encoding for Windows command prompts
    if hasattr(sys.stdout, 'reconfigure'):
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass
            
    print("=== Generating Custom Product Images ===")
    
    frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "images", "products"))
    os.makedirs(frontend_dir, exist_ok=True)
    print(f"Saving to: {frontend_dir}")
    
    products = Product.objects.all().order_by('id')
    total_products = products.count()
    print(f"Processing {total_products} products...")
    
    for idx, product in enumerate(products, 1):
        slug = slugify(product.name)
        filename = f"{slug}.png"
        dest_path = os.path.join(frontend_dir, filename)
        
        size_text = extract_size(product.name)
        print(f"[{idx}/{total_products}] Generating image for: {product.name} (Size: '{size_text}')")
        
        draw_product_image(product.name, product.category, size_text, dest_path)
        
    print("=== Generation Complete! ===")

if __name__ == "__main__":
    main()
