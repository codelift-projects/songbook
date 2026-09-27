import re
from bs4 import BeautifulSoup
from .utils import polite_get

def extract_sdahymnal():
    """
    Extracts songs from SDA Hymnal Songs.
    """
    print("[SDAHymnal] Starting extraction...")
    songs = []
    
    sitemap_urls = [
        "https://sdahymnalsongs.com/wp-sitemap-posts-post-1.xml",
        "https://sdahymnalsongs.com/post-sitemap.xml",
        "https://sdahymnalsongs.com/sitemap.xml"
    ]
    
    post_urls = []
    for sm_url in sitemap_urls:
        sm_text = polite_get(sm_url)
        if sm_text:
            soup = BeautifulSoup(sm_text, "xml" if "xml" in sm_text else "html.parser")
            for loc in soup.find_all("loc"):
                url = loc.get_text().strip()
                if url and not url.endswith(('.xml', '.jpg', '.png')) and 'sdahymnalsongs.com/' in url:
                    post_urls.append(url)
            if post_urls:
                break

    post_urls = list(dict.fromkeys(post_urls))[:200]
    print(f"[SDAHymnal] Found {len(post_urls)} song URLs. Crawling...")

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

        songs.append({
            "raw_title": title,
            "raw_lyrics": raw_lyrics,
            "source_url": url,
            "source_site": "SDA Hymnal Songs",
            "tags": tags,
            "language": "english"
        })

    print(f"[SDAHymnal] Finished. Extracted {len(songs)} songs.")
    return songs
