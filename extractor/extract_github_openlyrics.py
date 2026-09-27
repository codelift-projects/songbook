import json
import urllib.parse
import xml.etree.ElementTree as ET
from .utils import polite_get

def extract_github_openlyrics():
    """
    Extracts Malayalam Christian songs from beniza/malayalam_songbook_openlyrics GitHub repository.
    These are tagged as language: 'malayalam' and saved to seed_other_languages.json.
    """
    print("[OpenLyrics] Starting extraction of Malayalam OpenLyrics repository...")
    songs = []
    
    tree_url = "https://api.github.com/repos/beniza/malayalam_songbook_openlyrics/git/trees/master?recursive=1"
    tree_resp = polite_get(tree_url, headers={"User-Agent": "node"})
    
    xml_files = []
    if tree_resp:
        try:
            tree_data = json.loads(tree_resp)
            xml_files = [
                f["path"] for f in tree_data.get("tree", [])
                if f["path"].startswith("songs/") and f["path"].endswith(".xml")
            ]
        except Exception as e:
            print(f"[OpenLyrics] Error reading tree: {e}")

    print(f"[OpenLyrics] Found {len(xml_files)} OpenLyrics files. Fetching...")
    
    # Process up to 100 for polite rate/speed
    sample_files = xml_files[:150]

    for idx, path in enumerate(sample_files):
        encoded_path = urllib.parse.quote(path)
        raw_url = f"https://raw.githubusercontent.com/beniza/malayalam_songbook_openlyrics/master/{encoded_path}"
        xml_text = polite_get(raw_url)
        if not xml_text:
            continue

        try:
            # Parse OpenLyrics XML
            root = ET.fromstring(xml_text.encode('utf-8'))
            
            # Find title
            title = ""
            for t in root.iter():
                if t.tag.endswith("title") and t.text:
                    title = t.text.strip()
                    break
                    
            if not title:
                title = path.split("/")[-1].replace(".xml", "")

            # Find verses
            stanzas = []
            for verse in root.iter():
                if verse.tag.endswith("verse"):
                    v_name = verse.attrib.get("name", "")
                    lines = []
                    for line_el in verse.iter():
                        if line_el.tag.endswith("lines") and line_el.text:
                            # Handle <br/> inside lines
                            for text_seg in line_el.itertext():
                                if text_seg and text_seg.strip():
                                    lines.append(text_seg.strip())
                    if lines:
                        stanzas.append({
                            "label": v_name or "Verse",
                            "text": "\n".join(lines).strip()
                        })

            if title and stanzas:
                songs.append({
                    "raw_title": title,
                    "raw_lyrics": "\n\n".join(s["text"] for s in stanzas),
                    "source_url": raw_url,
                    "source_site": "OpenLyrics Malayalam",
                    "tags": ["Malayalam", "OpenLyrics"],
                    "language": "malayalam"
                })

        except Exception as e:
            pass

    print(f"[OpenLyrics] Finished. Extracted {len(songs)} Malayalam songs.")
    return songs
