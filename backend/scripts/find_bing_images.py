import re
import os

def main():
    try:
        html_path = "backend/bing.html"
        if not os.path.exists(html_path):
            html_path = "bing.html"
            
        with open(html_path, "r", encoding="utf-8") as f:
            html = f.read()
            
        print(f"Reading from: {html_path}")
        print(f"HTML size: {len(html)} characters")
        
        # 1. Let's find any URLs containing image extensions
        img_links = re.findall(r'(https?://[^\s"\'<>]+?\.(?:jpg|jpeg|png|webp))', html)
        print(f"\nFound {len(img_links)} image URLs ending in extensions:")
        for idx, u in enumerate(list(dict.fromkeys(img_links))[:15]):
            print(f"{idx+1}: {u}")
            
        # 2. Let's search for "murl" again but case-insensitively or differently
        murl_matches = re.findall(r'murl&quot;:&quot;([^&]+?)&quot;', html, re.IGNORECASE)
        print(f"\nFound {len(murl_matches)} matches for murl (unescaped):")
        for idx, u in enumerate(list(dict.fromkeys(murl_matches))[:5]):
            print(f"{idx+1}: {u}")
            
        # 3. Check for typical image result container structures, e.g., class="iusc"
        # Bing uses <a class="iusc" ... d="{"murl":"https://..."}"
        iusc_matches = re.findall(r'class="iusc"[^>]*?d=&quot;({[^&]+?})&quot;', html)
        print(f"\nFound {len(iusc_matches)} matches for class iusc data block:")
        for idx, u in enumerate(iusc_matches[:5]):
            print(f"{idx+1}: {u[:200]}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
