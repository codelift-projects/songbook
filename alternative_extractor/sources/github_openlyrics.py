import json
import urllib.parse
import xml.etree.ElementTree as ET
from ..utils import polite_get

def extract_github_openlyrics():
    """
    Extracts songs from GitHub OpenLyrics repositories (beniza/malayalam_songbook_openlyrics).
    """
    print("[Source 1: OpenLyrics] Fetching repository tree...")
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
            print(f"[OpenLyrics] Tree error: {e}")

    print(f"[OpenLyrics] Found {len(xml_files)} OpenLyrics song files. Fetching...")
    
    # Process up to 250 files for comprehensive coverage
    for idx, path in enumerate(xml_files[:250]):
        encoded_path = urllib.parse.quote(path)
        raw_url = f"https://raw.githubusercontent.com/beniza/malayalam_songbook_openlyrics/master/{encoded_path}"
        xml_text = polite_get(raw_url)
        if not xml_text:
            continue

        try:
            root = ET.fromstring(xml_text.encode('utf-8'))
            
            # Title
            title = ""
            for t in root.iter():
                if t.tag.endswith("title") and t.text:
                    title = t.text.strip()
                    break
            if not title:
                title = path.split("/")[-1].replace(".xml", "")

            # Verses
            stanzas = []
            for verse in root.iter():
                if verse.tag.endswith("verse"):
                    v_name = verse.attrib.get("name", "")
                    lines = []
                    for line_el in verse.iter():
                        if line_el.tag.endswith("lines") and line_el.text:
                            for text_seg in line_el.itertext():
                                if text_seg and text_seg.strip():
                                    lines.append(text_seg.strip())
                    if lines:
                        # Label mapping
                        if "c" in v_name.lower():
                            label = "कोरस"
                        elif "v" in v_name.lower():
                            v_num = "".join(filter(str.isdigit, v_name)) or "1"
                            label = f"पद {v_num}"
                        else:
                            label = v_name or "पद 1"

                        stanzas.append({
                            "label": label,
                            "text": "\n".join(lines).strip()
                        })

            if title and len(stanzas) >= 2:
                songs.append({
                    "raw_title": title,
                    "raw_lyrics": "\n\n".join(s["text"] for s in stanzas),
                    "source_url": raw_url,
                    "source_site": "GitHub OpenLyrics",
                    "tags": ["Malayalam", "OpenLyrics"],
                    "language": "malayalam"
                })
        except Exception:
            pass

    print(f"[OpenLyrics] Finished. Extracted {len(songs)} Malayalam songs.")
    return songs
