import re
import json
from ..utils import polite_get

ARCHIVE_ITEMS = [
    {
        "id": "andhra-christian-songs",
        "default_lang": "telugu",
        "title_prefix": "Andhra Christian Song"
    },
    {
        "id": "18-songs-full-lyrics-book-tamil-english",
        "default_lang": "tamil",
        "title_prefix": "Tamil Christian Song"
    }
]

def extract_internet_archive():
    """
    Fetches public-domain songbook OCR text files from Internet Archive.
    """
    print("[Source 3: Internet Archive] Fetching public domain OCR text...")
    songs = []

    for item in ARCHIVE_ITEMS:
        ident = item["id"]
        meta_url = f"https://archive.org/metadata/{ident}"
        meta_text = polite_get(meta_url)
        if not meta_text:
            continue

        try:
            meta_json = json.loads(meta_text)
            files = meta_json.get("files", [])
            
            # Find djvu.txt or ocr text file
            txt_file = None
            for f in files:
                name = f.get("name", "")
                if name.endswith(("_djvu.txt", "_ocr.txt", ".txt")) and not name.endswith("_meta.txt"):
                    txt_file = name
                    break

            if not txt_file:
                continue

            text_url = f"https://archive.org/download/{ident}/{txt_file}"
            raw_ocr = polite_get(text_url)
            if not raw_ocr:
                continue

            # Split OCR text into songs by numbered headings or blank page breaks
            song_chunks = re.split(r'\n(?=(?:Song\s*\d+|Gitam\s*\d+|\d{1,3}[\.\-\s]+[A-Z\u0900-\u0DFF]))', raw_ocr)
            
            for chunk in song_chunks:
                lines = [l.strip() for l in chunk.split("\n") if l.strip()]
                if len(lines) < 6:  # Skip tiny fragments / page headers
                    continue

                # First line as title
                raw_title = lines[0]
                lyrics_body = "\n".join(lines[1:])
                
                # Check for Christian keywords
                if not re.search(r'(?:jesus|yeshu|deva|prabhu|kristu|christ|alleluia|hymn|song|lord|stuti|bhajan)', chunk, re.IGNORECASE):
                    continue

                songs.append({
                    "raw_title": raw_title,
                    "raw_lyrics": lyrics_body,
                    "source_url": f"https://archive.org/details/{ident}",
                    "source_site": "Internet Archive (Public Domain)",
                    "tags": ["Public Domain", "Internet Archive", item["default_lang"]],
                    "language": item["default_lang"]
                })

        except Exception as e:
            print(f"[Internet Archive] Error parsing item {ident}: {e}")

    print(f"[Internet Archive] Finished. Extracted {len(songs)} songs from archives.")
    return songs
