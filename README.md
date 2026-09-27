# Christian Songbook - Data Extraction & Seed Pipeline

A reproducible, polite web scraping and normalization pipeline to extract Christian song lyrics in Hindi, English, and Marathi from public church songbooks, hymnals, and repositories, deduplicate them intelligently with RapidFuzz, and produce a normalized `seed.json`.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install requests beautifulsoup4 lxml rapidfuzz indic-transliteration
```

### 2. Run the Extraction Pipeline
```bash
python -m extractor.build_seed
```

---

## 📁 Project Structure

```
/extractor/
  __init__.py
  crawler.py                   # Master crawler orchestrating all site extractors
  extract_yeshugeets.py        # Yeshu Geets (Blogger JSON feeds)
  extract_choirbook.py         # Choirbook (GitHub tree & Markdown docs)
  extract_masihgeet.py         # Masih Geet (Hindi & Marathi)
  extract_christianstack.py    # ChristianStack (Marathi & Hindi)
  extract_worshiplord.py       # WorshipLord (Hindi & English)
  extract_waytochurch.py       # WayToChurch
  extract_sdahymnal.py         # SDA Hymnal Songs
  extract_christianmedias.py   # ChristianMedias
  extract_uesi.py              # UESI Jokku-Gamma Songbook
  extract_github_openlyrics.py # OpenLyrics Malayalam repository
  normalize.py                 # Schema normalization & stanza parsing
  dedupe.py                    # RapidFuzz deduplication & doubtful duplicate keeper
  build_seed.py                # Main CLI build runner
  utils.py                     # HTTP client, transliteration, rate limiter
/data/
  raw/                         # Raw scraped checkpoints & cache
  seed.json                    # Final array of songs in exact 5-key schema
  seed_raw.json                # Seed songs with full crawler metadata
  seed_incomplete.json         # Filtered songs with incomplete lyrics
  seed_other_languages.json    # Songs in other languages (e.g. Malayalam)
  seed_unsure_language.json    # Songs with unsure language classification
  duplicate_report.json        # Duplicate groups and decisions
  extraction_report.md         # Full extraction and deduplication metrics
```

---

## 📋 JSON Schema (`seed.json`)

Every song object in `seed.json` has exactly these 5 keys:

```json
[
  {
    "title": "तेरी स्तुति और आराधना",
    "title_alt": "Teri Stuti Aur Aradhana",
    "language": "hindi",
    "category": "worship",
    "stanzas": [
      {
        "label": "कोरस",
        "text": "तेरी स्तुति और आराधना करता रहूँ मैं सदा\nदिल से तूझे धन्यवाद देता रहूँ मैं सदा\nयेशु मेरे तू ही है मेरा खुदा"
      },
      {
        "label": "पद 1",
        "text": "सृष्टि के कण-कण में है तेरी महिमा\nचाँद सितारों में है तेरी गरिमा\nतूने रचाया मुझको भी अपने लिए\nजीवन दिया है तूने जीने के लिए"
      }
    ]
  }
]
```
