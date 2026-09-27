import json
import urllib.parse
from ..utils import polite_get

SEARCH_QUERIES = [
    ("Hindi Christian worship songs", "hindi"),
    ("Hindi Christian praise songs", "hindi"),
    ("Marathi Christian songs", "marathi"),
    ("Yeshu geet Hindi", "hindi"),
    ("Masih geet Marathi", "marathi"),
    ("Yeshu ke geet", "hindi"),
]

def extract_jiosaavn():
    """
    Extracts songs with lyrics using JioSaavn API endpoints.
    """
    print("[Source 2: JioSaavn API] Querying Christian songs and lyrics...")
    songs = []
    seen_ids = set()

    for query, default_lang in SEARCH_QUERIES:
        q_enc = urllib.parse.quote(query)
        api_url = f"https://saavn.dev/api/search/songs?query={q_enc}&limit=30"
        
        resp_text = polite_get(api_url)
        if not resp_text:
            # Fallback wrapper endpoint
            api_url = f"https://jiosaavn-api.vercel.app/search?query={q_enc}"
            resp_text = polite_get(api_url)
            
        if not resp_text:
            continue

        try:
            data = json.loads(resp_text)
            results = []
            if isinstance(data, dict):
                results = data.get("data", {}).get("results", []) or data.get("results", []) or []
            elif isinstance(data, list):
                results = data

            for item in results:
                song_id = item.get("id") or item.get("song_id")
                if not song_id or song_id in seen_ids:
                    continue
                seen_ids.add(song_id)

                title = item.get("name") or item.get("title") or item.get("song") or ""
                has_lyrics = item.get("hasLyrics") or item.get("has_lyrics") or False
                lyrics_snippet = item.get("lyrics") or ""

                # Fetch lyrics if available
                full_lyrics = ""
                if has_lyrics or not lyrics_snippet:
                    lyrics_url = f"https://saavn.dev/api/songs/{song_id}/lyrics"
                    lyr_resp = polite_get(lyrics_url)
                    if lyr_resp:
                        try:
                            lyr_data = json.loads(lyr_resp)
                            full_lyrics = lyr_data.get("data", {}).get("lyrics", "") or lyr_data.get("lyrics", "")
                        except Exception:
                            pass

                if not full_lyrics and isinstance(lyrics_snippet, str) and len(lyrics_snippet) > 40:
                    full_lyrics = lyrics_snippet

                if full_lyrics:
                    # Clean up html <br> in JioSaavn lyrics
                    clean_lyr = full_lyrics.replace("<br>", "\n").replace("<br/>", "\n").replace("<br />", "\n")
                    
                    lang = item.get("language") or default_lang
                    
                    songs.append({
                        "raw_title": title,
                        "raw_lyrics": clean_lyr,
                        "source_url": item.get("url") or f"https://www.jiosaavn.com/song/{song_id}",
                        "source_site": "JioSaavn API",
                        "tags": ["Christian", "JioSaavn", query],
                        "language": lang
                    })
        except Exception as e:
            print(f"[JioSaavn] Parse error for query '{query}': {e}")

    print(f"[JioSaavn] Finished. Extracted {len(songs)} songs with lyrics.")
    return songs
