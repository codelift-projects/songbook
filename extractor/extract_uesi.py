import re
from bs4 import BeautifulSoup
from .utils import polite_get

def extract_uesi():
    """
    Extracts songs from UESI Songbook (Jokku-Gamma / UESI).
    """
    print("[UESI] Starting extraction...")
    songs = []
    
    # Check possible UESI / Jokku-gamma pages
    urls_to_check = [
        "https://jokku-gamma.github.io/index.html",
        "https://jokku-gamma.github.io/songs.html",
        "https://jokku-gamma.github.io/hindi.html",
        "https://jokku-gamma.github.io/english.html",
    ]
    
    for url in urls_to_check:
        html = polite_get(url)
        if not html:
            continue
        soup = BeautifulSoup(html, "html.parser")
        
        # Look for song items or links
        song_blocks = soup.find_all(["div", "article", "section"], class_=re.compile(r"song|lyrics|item"))
        for block in song_blocks:
            title_el = block.find(["h1", "h2", "h3", "h4", "strong"])
            title = title_el.get_text().strip() if title_el else ""
            if not title:
                continue
            for s in block(["script", "style", "button"]):
                s.decompose()
            for br in block.find_all("br"):
                br.replace_with("\n")
            for p in block.find_all(["p", "div"]):
                p.append("\n\n")
            raw_lyrics = block.get_text()
            
            songs.append({
                "raw_title": title,
                "raw_lyrics": raw_lyrics,
                "source_url": url,
                "source_site": "UESI Songbook",
                "tags": ["UESI"],
                "language": "english" if bool(re.match(r'^[a-zA-Z0-9\s]+$', title)) else "hindi"
            })

    print(f"[UESI] Finished. Extracted {len(songs)} songs.")
    return songs
