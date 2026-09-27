import os
import json
from .extract_yeshugeets import extract_yeshugeets
from .extract_masihgeet import extract_masihgeet
from .extract_christianstack import extract_christianstack
from .extract_worshiplord import extract_worshiplord
from .extract_waytochurch import extract_waytochurch
from .extract_sdahymnal import extract_sdahymnal
from .extract_christianmedias import extract_christianmedias
from .extract_choirbook import extract_choirbook
from .extract_uesi import extract_uesi
from .extract_github_openlyrics import extract_github_openlyrics

RAW_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "raw")
os.makedirs(RAW_DATA_DIR, exist_ok=True)

def crawl_all_sources():
    """
    Crawls all Christian song sources and aggregates raw extracted songs.
    """
    all_raw = []
    stats = {}

    extractors = [
        ("Yeshu Geets", extract_yeshugeets),
        ("Choirbook", extract_choirbook),
        ("Masih Geet", extract_masihgeet),
        ("ChristianStack", extract_christianstack),
        ("Worship Lord", extract_worshiplord),
        ("WaytoChurch", extract_waytochurch),
        ("SDA Hymnal Songs", extract_sdahymnal),
        ("ChristianMedias", extract_christianmedias),
        ("UESI Songbook", extract_uesi),
        ("OpenLyrics Malayalam", extract_github_openlyrics),
    ]

    for site_name, fn in extractors:
        try:
            print(f"\n==========================================")
            print(f" Crawling: {site_name}")
            print(f"==========================================")
            extracted = fn()
            all_raw.extend(extracted)
            stats[site_name] = len(extracted)
        except Exception as e:
            print(f"Error in {site_name} extractor: {e}")
            stats[site_name] = 0

    # Save aggregated raw checkpoint
    checkpoint_file = os.path.join(RAW_DATA_DIR, "all_scraped_raw.json")
    with open(checkpoint_file, "w", encoding="utf-8") as f:
        json.dump(all_raw, f, ensure_ascii=False, indent=2)

    print(f"\n[Crawler] Completed crawling. Total raw items extracted: {len(all_raw)}")
    return all_raw, stats
