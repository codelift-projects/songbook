import re
from bs4 import BeautifulSoup
from ..utils import polite_get

def extract_cms_india():
    """
    Extracts public-domain Christian songs from CMS India Archives (thecmsindia.org).
    """
    print("[Source 5: CMS India] Fetching public domain directory...")
    songs = []
    
    base_urls = [
        "https://thecmsindia.org/directory-of-christian-songs/english/english-songs",
        "https://thecmsindia.org/directory-of-christian-songs/malayalam"
    ]

    song_links = []
    for base in base_urls:
        html = polite_get(base)
        if not html:
            continue
        soup = BeautifulSoup(html, "html.parser")
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if "/directory-of-christian-songs/" in href and not href.endswith(('/english-songs', '/malayalam', '#')):
                if href.startswith("http"):
                    song_links.append(href)
                else:
                    song_links.append("https://thecmsindia.org" + href)

    song_links = list(dict.fromkeys(song_links))[:100]
    print(f"[CMS India] Found {len(song_links)} song pages. Crawling...")

    for url in song_links:
        html = polite_get(url)
        if not html:
            continue

        soup = BeautifulSoup(html, "html.parser")
        
        # Title
        title_el = soup.find(["h1", "h2", "h3"], class_=re.compile(r"title|heading|entry")) or soup.find("h1")
        title = title_el.get_text().strip() if title_el else ""
        if not title:
            continue

        content_el = soup.find("div", class_=re.compile(r"content|body|entry|lyrics")) or soup.find("article")
        if not content_el:
            continue

        for s in content_el(["script", "style", "nav", "button", "aside"]):
            s.decompose()
            
        for br in content_el.find_all("br"):
            br.replace_with("\n")
        for p in content_el.find_all(["p", "div", "blockquote"]):
            p.append("\n\n")

        raw_lyrics = content_el.get_text().strip()
        if len(raw_lyrics) < 40:
            continue

        lang = "english" if "english" in url.lower() else "malayalam"

        songs.append({
            "raw_title": title,
            "raw_lyrics": raw_lyrics,
            "source_url": url,
            "source_site": "CMS India Archives",
            "tags": ["CMS India", "Public Domain", lang],
            "language": lang
        })

    print(f"[CMS India] Finished. Extracted {len(songs)} songs.")
    return songs
