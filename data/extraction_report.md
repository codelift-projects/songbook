# Extraction & Deduplication Report

**Generated on:** 2026-09-27 19:00:47  
**Total Runtime:** 48.16 seconds  

---

## 1. Summary Statistics

| Metric | Count |
|---|---|
| **Total Raw Songs Scraped** | 1384 |
| **Final Songs in `seed.json`** | **958** |
| **Exact Duplicates Removed** | 5 |
| **Doubtful Duplicates Kept** | 14 |
| **Incomplete Songs Filtered** | 271 |
| **Other Languages Filtered (e.g. Malayalam)** | 150 |
| **Unsure Language Songs** | 0 |

---

## 2. Extraction by Source Site

| Source Website | Scraped Songs |
|---|---|
| Choirbook | 94 |
| Masih Geet | 740 |
| ChristianStack | 200 |
| Worship Lord | 1 |
| ChristianMedias | 199 |
| OpenLyrics Malayalam | 150 |

---

## 3. Final `seed.json` Breakdown

### By Language
- **English**: 41 songs
- **Hindi**: 913 songs
- **Marathi**: 4 songs

### By Category
- **Praise**: 13 songs
- **Worship**: 945 songs

---

## 4. Deduplication & Quality Highlights

- All songs strictly adhere to the 5-key schema: `title`, `title_alt`, `language`, `category`, `stanzas`.
- Hindi and Marathi titles and lyrics are preserved in Devanagari script with Roman transliterations in `title_alt`.
- Repeat markers normalized to standard `– 2`, `– 3`.
- All doubtful duplicates were retained in `seed.json` with metadata tags in `seed_raw.json` and documented in `duplicate_report.json`.
