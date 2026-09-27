import re
from bs4 import BeautifulSoup
from .utils import polite_get

def extract_masihgeet():
    """
    Extracts songs from Masih Geet (Hindi & Marathi).
    """
    print("[MasihGeet] Starting extraction...")
    songs = []
    
    # Try sitemap first
    sitemap_urls = [
        "https://masihgeet.in/wp-sitemap-posts-post-1.xml",
        "https://masihgeet.in/post-sitemap.xml",
        "https://masihgeet.in/sitemap.xml"
    ]
    
    post_urls = []
    for sm_url in sitemap_urls:
        sm_text = polite_get(sm_url)
        if sm_text:
            soup = BeautifulSoup(sm_text, "xml" if "xml" in sm_text else "html.parser")
            locs = soup.find_all("loc")
            for loc in locs:
                url = loc.get_text().strip()
                if url and not url.endswith(('.xml', '.jpg', '.png', '/category/', '/tag/', '/author/')) and 'masihgeet.in/' in url:
                    post_urls.append(url)
            if post_urls:
                break

    # If sitemap not accessible, fallback to category pages
    if not post_urls:
        categories = [
            "https://masihgeet.in/category/worship-songs/",
            "https://masihgeet.in/category/worship-songs/marathi-christian-song/",
            "https://masihgeet.in/category/hindi-christian-songs/",
        ]
        for cat in categories:
            cat_html = polite_get(cat)
            if cat_html:
                soup = BeautifulSoup(cat_html, "html.parser")
                for a in soup.find_all("a", href=True):
                    href = a["href"]
                    if href.startswith("https://masihgeet.in/") and not any(x in href for x in ['/category/', '/tag/', '/page/', '#']):
                        post_urls.append(href)

    post_urls = list(dict.fromkeys(post_urls)) # deduplicate
    print(f"[MasihGeet] Found {len(post_urls)} song URLs. Crawling...")

    for idx, url in enumerate(post_urls):
        html = polite_get(url)
        if not html:
            continue
            
        soup = BeautifulSoup(html, "html.parser")
        
        # Extract title
        title_el = soup.find("h1", class_=re.compile(r"entry-title|post-title|title"))
        if not title_el:
            title_el = soup.find("h1")
        title = title_el.get_text().strip() if title_el else ""
        if not title:
            continue

        # Extract content
        content_el = soup.find("div", class_=re.compile(r"entry-content|post-content|content"))
        if not content_el:
            continue

        for s in content_el(["script", "style", "iframe", "button", "nav", "form", "aside"]):
            s.decompose()
            
        for br in content_el.find_all("br"):
            br.replace_with("\n")
        for p in content_el.find_all(["p", "div", "h2", "h3", "h4", "blockquote"]):
            p.append("\n\n")

        raw_lyrics = content_el.get_text()

        # Tags / Categories
        tags = []
        for cat_a in soup.find_all("a", rel=re.compile(r"category")):
            tags.append(cat_a.get_text().strip())

        lang = "marathi" if "marathi" in url.lower() or any("marathi" in t.lower() for t in tags) else "hindi"

        songs.append({
            "raw_title": title,
            "raw_lyrics": raw_lyrics,
            "source_url": url,
            "source_site": "Masih Geet",
            "tags": tags,
            "language": lang
        })
        
        if (idx + 1) % 50 == 0:
            print(f"[MasihGeet] Processed {idx + 1}/{len(post_urls)} songs...")

    print(f"[MasihGeet] Finished. Extracted {len(songs)} songs.")
    return songs
