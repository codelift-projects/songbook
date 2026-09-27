# Alternative Christian Songbook Extraction Pipeline

A multi-source data extraction pipeline that retrieves Christian song lyrics from non-scraping and structured sources (GitHub OpenLyrics repositories, JioSaavn Unofficial APIs, Internet Archive public-domain OCR texts, Hugging Face datasets, and CMS India archives), normalises them to the unified 5-key schema, deduplicates them using RapidFuzz, and outputs `seed.json`.

---

## 🚀 Quick Start

### 1. Install Requirements
```bash
pip install requests beautifulsoup4 lxml rapidfuzz indic-transliteration
```

### 2. Run the Alternative Extraction Pipeline
```bash
python -m alternative_extractor.build_seed
```
To run with a full fresh network fetch:
```bash
python -m alternative_extractor.build_seed --crawl
```

---

## 📁 Project Structure

```
/alternative_extractor/
  sources/
    github_openlyrics.py       # Source 1: GitHub OpenLyrics XML parser (beniza/malayalam_songbook_openlyrics)
    jiosaavn_api.py            # Source 2: JioSaavn API query & full lyrics extractor
    internet_archive.py        # Source 3: Internet Archive public-domain OCR songbooks
    huggingface_datasets.py    # Source 4: Hugging Face Indic Christian dataset search
    cms_india.py               # Source 5: CMS India public domain hymns directory
  normalize.py                 # Unified 5-key schema normalizer & Devanagari cleaner
  dedupe.py                    # RapidFuzz similarity deduplication & doubtful keeper
  build_seed.py                # Main pipeline entrypoint
  utils.py                     # HTTP client, transliteration, rate limiter, language/category detectors
  README.md
/data/
  seed.json                    # Final song array in 5-key schema
  seed_raw.json                # Seed songs with full provenance metadata
  seed_incomplete.json         # Filtered songs (< 2 stanzas or missing lyrics)
  seed_other_languages.json    # Malayalam, Telugu, Tamil, etc.
  seed_unsure_language.json    # Ambiguous language songs
  duplicate_report.json        # Duplicate groups and similarity decisions
  extraction_report.md         # Full extraction and deduplication metrics
```

---

## 📋 Exact Schema (`seed.json`)

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
