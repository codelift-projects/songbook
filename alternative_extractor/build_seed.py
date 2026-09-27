import os
import sys
import json
import time
from .sources.github_openlyrics import extract_github_openlyrics
from .sources.jiosaavn_api import extract_jiosaavn
from .sources.internet_archive import extract_internet_archive
from .sources.huggingface_datasets import extract_huggingface
from .sources.cms_india import extract_cms_india
from .normalize import normalize_song_record
from .dedupe import deduplicate_songs

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
RAW_DATA_DIR = os.path.join(DATA_DIR, "raw")
os.makedirs(RAW_DATA_DIR, exist_ok=True)

def sort_key(song):
    lang_order = {"hindi": 1, "english": 2, "marathi": 3}
    l_score = lang_order.get(song.get("language", ""), 99)
    
    cat_order = {"worship": 1, "praise": 2}
    c_score = cat_order.get(song.get("category", ""), 99)
    
    title = song.get("title", "")
    return (l_score, c_score, title)

def build_seed(crawl_fresh=False):
    start_time = time.time()
    print("==================================================================")
    print(" Alternative Christian Songbook Extraction Pipeline")
    print(" (OpenLyrics, JioSaavn API, Internet Archive, HuggingFace, CMS India)")
    print("==================================================================")

    raw_file = os.path.join(RAW_DATA_DIR, "alt_all_scraped_raw.json")
    all_raw = []
    site_stats = {}

    if not crawl_fresh and os.path.exists(raw_file):
        print(f"[Build] Loading cached alternative raw songs from {raw_file}...")
        with open(raw_file, "r", encoding="utf-8") as f:
            all_raw = json.load(f)
        for s in all_raw:
            site = s.get("source_site", "Unknown")
            site_stats[site] = site_stats.get(site, 0) + 1
    else:
        sources = [
            ("GitHub OpenLyrics", extract_github_openlyrics),
            ("JioSaavn API", extract_jiosaavn),
            ("Internet Archive (Public Domain)", extract_internet_archive),
            ("Hugging Face Dataset", extract_huggingface),
            ("CMS India Archives", extract_cms_india),
        ]

        for source_name, fn in sources:
            try:
                print(f"\n--- Extracting from: {source_name} ---")
                extracted = fn()
                all_raw.extend(extracted)
                site_stats[source_name] = len(extracted)
            except Exception as e:
                print(f"Error in {source_name}: {e}")
                site_stats[source_name] = 0

        # Checkpoint
        with open(raw_file, "w", encoding="utf-8") as f:
            json.dump(all_raw, f, ensure_ascii=False, indent=2)

    print(f"\n[Extraction Total] Total items retrieved: {len(all_raw)}")

    # Normalization
    valid_records = []
    incomplete_records = []
    other_language_records = []
    unsure_language_records = []

    for raw_song in all_raw:
        song, meta = normalize_song_record(raw_song)
        lang = song.get("language", "")
        
        if meta.get("incomplete"):
            incomplete_records.append({"song": song, "metadata": meta})
        elif lang in ("hindi", "english", "marathi"):
            valid_records.append((song, meta))
        elif lang in ("malayalam", "tamil", "telugu", "kannada", "bengali"):
            other_language_records.append({"song": song, "metadata": meta})
        else:
            unsure_language_records.append({"song": song, "metadata": meta})

    print(f"[Normalization] Valid (Hindi/English/Marathi): {len(valid_records)}, Incomplete: {len(incomplete_records)}, Other Languages: {len(other_language_records)}")

    # Deduplication
    kept_records, duplicate_report, dedupe_stats = deduplicate_songs(valid_records)
    kept_records.sort(key=lambda item: sort_key(item[0]))

    final_seed_songs = [item[0] for item in kept_records]
    final_seed_raw = [{"song": item[0], "metadata": item[1]} for item in kept_records]

    # Save deliverables
    seed_json_path = os.path.join(DATA_DIR, "seed.json")
    with open(seed_json_path, "w", encoding="utf-8") as f:
        json.dump(final_seed_songs, f, ensure_ascii=False, indent=2)

    seed_raw_path = os.path.join(DATA_DIR, "seed_raw.json")
    with open(seed_raw_path, "w", encoding="utf-8") as f:
        json.dump(final_seed_raw, f, ensure_ascii=False, indent=2)

    seed_incomplete_path = os.path.join(DATA_DIR, "seed_incomplete.json")
    with open(seed_incomplete_path, "w", encoding="utf-8") as f:
        json.dump(incomplete_records, f, ensure_ascii=False, indent=2)

    seed_other_path = os.path.join(DATA_DIR, "seed_other_languages.json")
    with open(seed_other_path, "w", encoding="utf-8") as f:
        json.dump(other_language_records, f, ensure_ascii=False, indent=2)

    seed_unsure_path = os.path.join(DATA_DIR, "seed_unsure_language.json")
    with open(seed_unsure_path, "w", encoding="utf-8") as f:
        json.dump(unsure_language_records, f, ensure_ascii=False, indent=2)

    dup_report_path = os.path.join(DATA_DIR, "duplicate_report.json")
    with open(dup_report_path, "w", encoding="utf-8") as f:
        json.dump(duplicate_report, f, ensure_ascii=False, indent=2)

    # Extraction report
    elapsed = round(time.time() - start_time, 2)
    report_md_path = os.path.join(DATA_DIR, "extraction_report.md")
    
    lang_counts = {}
    cat_counts = {}
    for s in final_seed_songs:
        l = s.get("language", "unknown")
        c = s.get("category", "unknown")
        lang_counts[l] = lang_counts.get(l, 0) + 1
        cat_counts[c] = cat_counts.get(c, 0) + 1

    report_content = f"""# Alternative Song Extraction & Deduplication Report

**Generated on:** {time.strftime('%Y-%m-%d %H:%M:%S')}  
**Total Runtime:** {elapsed} seconds  

---

## 1. Summary Statistics

| Metric | Count |
|---|---|
| **Total Raw Songs Retrieved** | {len(all_raw)} |
| **Final Songs in `seed.json`** | **{len(final_seed_songs)}** |
| **Exact Duplicates Removed** | {dedupe_stats.get('exact_duplicates_removed', 0)} |
| **Doubtful Duplicates Kept** | {dedupe_stats.get('doubtful_duplicates_kept', 0)} |
| **Incomplete Songs Filtered** | {len(incomplete_records)} |
| **Other Languages (Malayalam/Telugu/Tamil)** | {len(other_language_records)} |
| **Unsure Language Songs** | {len(unsure_language_records)} |

---

## 2. Extraction by Alternative Source

| Source | Songs Extracted |
|---|---|
"""
    for site, count in site_stats.items():
        report_content += f"| {site} | {count} |\n"

    report_content += f"""
---

## 3. Final `seed.json` Breakdown

### By Language
"""
    for l, cnt in sorted(lang_counts.items()):
        report_content += f"- **{l.capitalize()}**: {cnt} songs\n"

    report_content += f"""
### By Category
"""
    for c, cnt in sorted(cat_counts.items()):
        report_content += f"- **{c.capitalize()}**: {cnt} songs\n"

    report_content += f"""
---

## 4. Quality & Compliance Checklist

- [x] Strict 5-key schema: `title`, `title_alt`, `language`, `category`, `stanzas`.
- [x] Devanagari script for Hindi/Marathi songs, Roman script for English.
- [x] Standard repeat markers (`– 2`, `– 3`).
- [x] All doubtful duplicates kept with group IDs and metadata.
- [x] Non-Hindi/Marathi/English songs routed to `seed_other_languages.json`.
"""

    with open(report_md_path, "w", encoding="utf-8") as f:
        f.write(report_content)

    print(f"\n==================================================================")
    print(f" ALTERNATIVE PIPELINE BUILD COMPLETE ({elapsed}s)")
    print(f" Total songs in seed.json: {len(final_seed_songs)}")
    print(f" Exact duplicates removed: {dedupe_stats.get('exact_duplicates_removed', 0)}")
    print(f" Doubtful duplicates kept: {dedupe_stats.get('doubtful_duplicates_kept', 0)}")
    print(f" Incomplete skipped: {len(incomplete_records)}")
    print(f" Other languages: {len(other_language_records)}")
    print(f" Outputs saved to: {DATA_DIR}")
    print(f"==================================================================")

if __name__ == "__main__":
    fresh = "--crawl" in sys.argv
    build_seed(crawl_fresh=fresh)
