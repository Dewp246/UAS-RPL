import urllib.request
import urllib.parse
import json
import sys

def test_wikimedia(query):
    print(f"\nSearching Wikimedia Commons for: '{query}'")
    encoded_query = urllib.parse.quote(query)
    # Search API
    url = f"https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch={encoded_query}&format=json&srnamespace=6"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36'
    }
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as response:
            res_data = response.read().decode('utf-8')
            
        data = json.loads(res_data) 
        search_results = data.get('query', {}).get('search', [])
        print(f"Found {len(search_results)} files.")
        
        for idx, item in enumerate(search_results[:3]):
            title = item.get('title')
            # Get image URL by querying image info
            info_url = f"https://commons.wikimedia.org/w/api.php?action=query&titles={urllib.parse.quote(title)}&prop=imageinfo&iiprop=url&format=json"
            info_req = urllib.request.Request(info_url, headers=headers)
            with urllib.request.urlopen(info_req, timeout=10) as info_resp:
                info_data = json.loads(info_resp.read().decode('utf-8'))
                
            pages = info_data.get('query', {}).get('pages', {})
            for p_id in pages:
                img_info = pages[p_id].get('imageinfo', [])
                if img_info:
                    print(f"File {idx+1}: {title}\n   URL: {img_info[0].get('url')}")
                    
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)

if __name__ == "__main__":
    test_wikimedia("Indomie")
    test_wikimedia("Instant noodles")
    test_wikimedia("Rice bag")
