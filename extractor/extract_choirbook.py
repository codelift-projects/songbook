import json
import urllib.parse
from bs4 import BeautifulSoup
from .utils import polite_get

def extract_choirbook():
    """
    Extracts all Hindi and English songs from choirbook.github.io.
    """
    print("[Choirbook] Starting extraction...")
    songs = []
    
    tree_url = "https://api.github.com/repos/choirbook/choirbook.github.io/git/trees/master?recursive=1"
    tree_resp = polite_get(tree_url, headers={"User-Agent": "node"})
    
    md_files = []
    if tree_resp:
        try:
            tree_data = json.loads(tree_resp)
            md_files = [
                f["path"] for f in tree_data.get("tree", [])
                if f["path"].startswith("docs/") and f["path"].endswith(".md") and f["path"] != "docs/index.md"
            ]
        except Exception as e:
            print(f"[Choirbook] Error parsing tree JSON: {e}")

    # Fallback to direct static index if API fails
    if not md_files:
        index_html = polite_get("https://choirbook.github.io/index.html")
        if index_html:
            soup = BeautifulSoup(index_html, "html.parser")
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if href.endswith(".html") and ("english/" in href or "hindi/" in href):
                    md_path = "docs/" + href.replace(".html", ".md")
                    md_files.append(md_path)

    print(f"[Choirbook] Found {len(md_files)} song files. Fetching...")

    for path in md_files:
        encoded_path = urllib.parse.quote(path)
        raw_url = f"https://raw.githubusercontent.com/choirbook/choirbook.github.io/master/{encoded_path}"
        content = polite_get(raw_url)
        if not content:
            continue

        filename = path.split("/")[-1].replace(".md", "")
        is_hindi = "/hindi/" in path

        # Tags from frontmatter
        tags = []
        if content.startswith("---"):
            fm_end = content.find("---", 3)
            if fm_end != -1:
                fm_block = content[3:fm_end]
                for line in fm_block.split("\n"):
                    line = line.strip()
                    if line.startswith("- "):
                        tags.append(line[2:].strip())

        songs.append({
            "raw_title": filename,
            "raw_lyrics": content,
            "source_url": f"https://choirbook.github.io/{path.replace('docs/', '').replace('.md', '.html')}",
            "source_site": "Choirbook",
            "tags": tags,
            "language": "hindi" if is_hindi else "english"
        })

    print(f"[Choirbook] Finished. Extracted {len(songs)} songs.")
    return songs
