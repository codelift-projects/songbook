# Seed Songs Documentation

This document explains the bundled seed song library architecture, data format, overriding rules, and how to manage starter songs for the **Zion Songbook**.

---

## 1. Overview & Architecture

Seed songs ship directly inside the client application bundle via `src/data/songs.seed.json`.

- **Instant Availability**: Loaded synchronously at module load time — zero network requests, zero latency on first render.
- **Storage Friendly**: Starter songs do not consume Supabase row limits or database storage.
- **Read-Only Protection**: Seed songs cannot be edited or deleted directly in the UI. Users can duplicate any seed song into an editable DB song.
- **Slug-Based Overriding**: If a church creates or imports a song in Supabase/local storage with the exact same `slug`, the DB song automatically **shadows (overrides)** the seed song across the app.

---

## 2. File Location & JSON Format

**File Path:** `src/data/songs.seed.json`

The file must be a top-level JSON array of song objects:

```json
[
  {
    "slug": "teri-stuti-aur-aradhana",
    "number": 1,
    "title": "तेरी स्तुति और आराधना",
    "title_alt": "Teri Stuti Aur Aradhana",
    "language": "hindi",
    "tags": ["worship", "praise"],
    "stanzas": [
      {
        "label": "कोरस",
        "text": "तेरी स्तुति और आराधना करता रहूँ मैं सदा,\nदिल से तूझे धन्यवाद देता रहूँ मैं सदा।"
      },
      {
        "label": "पद 1",
        "text": "सृष्टि के कण-कण में है तेरी महिमा,\nचाँद सितारों में है तेरी गरिमा,\nतू ही सहारा है, तू ही किनारा है।"
      }
    ]
  }
]
```

### Field Specifications:
- `slug` (*string, required*): Unique, URL-friendly kebab-case identifier (e.g. `"amazing-grace"`, `"ga-devache-upakar"`). Must be unique across the entire seed file.
- `number` (*number, optional*): Display song number for ordering.
- `title` (*string, required*): Primary song title in native script or English.
- `title_alt` (*string, optional*): Alternate transliteration or secondary title.
- `language` (*string, required*): Must be `"hindi"`, `"marathi"`, or `"english"`.
- `tags` (*string[], optional*): Tags or themes (defaults to `[]`).
- `stanzas` (*array, required*): Non-empty array of stanza objects, each containing:
  - `label` (*string, required*): e.g. `"कोरस"`, `"ध्रुवपद"`, `"पद 1"`, `"Verse 1"`, `"Bridge"`.
  - `text` (*string, required*): Multi-line lyric text with line breaks preserved.

---

## 3. SQL Migration (for Supabase)

To enable slug-based shadowing in Supabase, run the following SQL migration in your Supabase SQL Editor:

```sql
-- Add a stable slug to songs so seed overriding works.
alter table public.songs
  add column if not exists slug text;

create unique index if not exists songs_slug_unique
  on public.songs (slug)
  where slug is not null;
```

---

## 4. How to Generate / Update the Seed Library

1. Manage and curate songs in the Zion Songbook UI.
2. In **Manage Songs**, click **Backup All** (or select songs and click **Export** in the floating selection bar).
3. The downloaded `zion-songbook-export-*.json` file conforms to the song schema.
4. Copy the JSON array into `src/data/songs.seed.json`. Ensure every song has a unique `slug`.
5. Run `npm run build` to validate the seed file at build time.
