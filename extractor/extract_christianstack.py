import re
from bs4 import BeautifulSoup
from .utils import polite_get

def extract_christianstack():
    """
    Extracts songs from ChristianStack (Marathi & Hindi lyrics).
    """
    print("[ChristianStack] Starting extraction...")
    songs = []
    
    # Check sitemap or category pagination
    category_urls = [
        "https://christianstack.com/category/lyrics/marathi/",
        "https://christianstack.com/category/lyrics/hindi/",
        "https://christianstack.com/category/lyrics/english/",
    ]
    
    post_urls = []
    
    # Try sitemap first
    sitemap_text = polite_get("https://christianstack.com/wp-sitemap-posts-post-1.xml") or polite_get("https://christianstack.com/post-sitemap.xml")
    if sitemap_text:
        soup = BeautifulSoup(sitemap_text, "xml" if "xml" in sitemap_text else "html.parser")
        for loc in soup.find_all("loc"):
            url = loc.get_text().strip()
            if url and not url.endswith(('.xml', '.jpg', '.png')) and 'christianstack.com/' in url:
                post_urls.append(url)

    # Fallback to category crawling if sitemap is empty or failed
    if not post_urls:
        for cat_base in category_urls:
            page = 1
            while page <= 10:
                page_url = f"{cat_base}page/{page}/" if page > 1 else cat_base
                html = polite_get(page_url)
                if not html:
                    break
                soup = BeautifulSoup(html, "html.parser")
                found = 0
                for a in soup.find_all("a", href=True):
                    href = a["href"]
                    if href.startswith("https://christianstack.com/") and not any(x in href for x in ['/category/', '/tag/', '/page/', '#', '/author/']):
                        if href not in post_urls:
                            post_urls.append(href)
                            found += 1
                if found == 0:
                    break
                page += 1

    post_urls = list(dict.fromkeys(post_urls))
    print(f"[ChristianStack] Found {len(post_urls)} song URLs. Crawling...")

    for idx, url in enumerate(post_urls):
        html = polite_get(url)
        if not html:
            continue
            
        soup = BeautifulSoup(html, "html.parser")
        title_el = soup.find("h1", class_=re.compile(r"entry-title|post-title|title")) or soup.find("h1")
        title = title_el.get_text().strip() if title_el else ""
        if not title:
            continue

        content_el = soup.find("div", class_=re.compile(r"entry-content|post-content|content"))
        if not content_el:
            continue

        for s in content_el(["script", "style", "iframe", "button", "nav", "form", "aside"]):
            s.decompose()
            
        for br in content_el.find_all("br"):
            br.replace_with("\n")
        for p in content_el.find_all(["p", "div", "h2", "h3", "blockquote"]):
            p.append("\n\n")

        raw_lyrics = content_el.get_text()

        tags = [a.get_text().strip() for a in soup.find_all("a", rel=re.compile(r"category|tag"))]

        lang = "marathi" if "marathi" in url.lower() or any("marathi" in t.lower() for t in tags) else "hindi"

        songs.append({
            "raw_title": title,
            "raw_lyrics": raw_lyrics,
            "source_url": url,
            "source_site": "ChristianStack",
            "tags": tags,
            "language": lang
        })

    print(f"[ChristianStack] Finished. Extracted {len(songs)} songs.")
    return songs
