import json
import re
from bs4 import BeautifulSoup
from .utils import polite_get

def extract_yeshugeets():
    """
    Extracts songs from Yeshu Geets using Blogger JSON Feed API.
    """
    print("[YeshuGeets] Starting extraction...")
    songs = []
    start_index = 1
    max_results = 150
    total_fetched = 0

    while True:
        url = f"https://www.yeshugeets.site/feeds/posts/default?alt=json&max-results={max_results}&start-index={start_index}"
        resp_text = polite_get(url)
        if not resp_text:
            break

        try:
            data = json.loads(resp_text)
            feed = data.get("feed", {})
            entries = feed.get("entry", [])
            if not entries:
                break

            for entry in entries:
                title_obj = entry.get("title", {})
                title = title_obj.get("$t", "").strip()
                
                # Extract URL
                post_url = ""
                for link in entry.get("link", []):
                    if link.get("rel") == "alternate":
                        post_url = link.get("href", "")
                        break
                        
                # Extract Categories / Tags
                tags = [c.get("term", "") for c in entry.get("category", []) if c.get("term")]
                
                # Extract Content
                content_obj = entry.get("content", {}) or entry.get("summary", {})
                html_content = content_obj.get("$t", "")
                
                if not html_content:
                    continue
                    
                soup = BeautifulSoup(html_content, "html.parser")
                
                # Remove scripts, styles, share buttons
                for s in soup(["script", "style", "iframe", "button"]):
                    s.decompose()
                    
                # Replace <br> and <p> with newlines
                for br in soup.find_all("br"):
                    br.replace_with("\n")
                for p in soup.find_all(["p", "div"]):
                    p.append("\n\n")
                    
                raw_lyrics = soup.get_text()
                
                # Determine language
                language = "hindi"
                if any("marathi" in t.lower() for t in tags):
                    language = "marathi"
                elif any("english" in t.lower() for t in tags):
                    language = "english"
                    
                songs.append({
                    "raw_title": title,
                    "raw_lyrics": raw_lyrics,
                    "source_url": post_url or url,
                    "source_site": "Yeshu Geets",
                    "tags": tags,
                    "language": language
                })

            total_fetched += len(entries)
            print(f"[YeshuGeets] Fetched {total_fetched} songs so far...")
            
            # Check if there are more
            if len(entries) < max_results:
                break
            start_index += len(entries)
            
        except Exception as e:
            print(f"[YeshuGeets] Error parsing feed at start {start_index}: {e}")
            break

    print(f"[YeshuGeets] Finished. Extracted {len(songs)} total songs.")
    return songs
