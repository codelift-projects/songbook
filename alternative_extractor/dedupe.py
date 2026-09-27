import re
import unicodedata
from rapidfuzz import fuzz

SOURCE_PRIORITY = {
    "GitHub OpenLyrics": 1,
    "JioSaavn API": 2,
    "CMS India Archives": 3,
    "Internet Archive (Public Domain)": 4,
    "Hugging Face Dataset": 5,
}

def get_source_score(source_site):
    return SOURCE_PRIORITY.get(source_site, 99)

def normalize_key(text):
    if not text:
        return ""
    text = unicodedata.normalize('NFC', text).lower()
    text = re.sub(r'[^\w\s\u0900-\u097F]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def build_song_keys(song):
    title_key = normalize_key(song.get("title", ""))
    stanzas = song.get("stanzas", [])
    first_line_key = ""
    if stanzas and stanzas[0].get("text"):
        lines = [l.strip() for l in stanzas[0]["text"].split("\n") if l.strip()]
        if lines:
            first_line_key = normalize_key(lines[0])
            
    all_lines = [s.get("text", "") for s in stanzas]
    full_lyrics_key = normalize_key(" ".join(all_lines))
    
    return title_key, first_line_key, full_lyrics_key

def deduplicate_songs(song_records):
    by_lang = {}
    for item in song_records:
        song, meta = item
        lang = song.get("language", "hindi")
        by_lang.setdefault(lang, []).append(item)

    kept_all = []
    duplicate_report = []
    total_exact_removed = 0
    total_doubtful_kept = 0
    group_counter = 1

    for lang, items in by_lang.items():
        processed = []
        
        for current in items:
            cur_song, cur_meta = current
            cur_t_key, cur_fl_key, cur_lyr_key = build_song_keys(cur_song)
            cur_source = cur_meta.get("source_site", "")
            cur_stanzas_len = len(cur_song.get("stanzas", []))
            cur_char_len = sum(len(s.get("text", "")) for s in cur_song.get("stanzas", []))
            
            matched = False
            
            for idx, existing in enumerate(processed):
                ex_song, ex_meta = existing
                ex_t_key, ex_fl_key, ex_lyr_key = build_song_keys(ex_song)
                ex_source = ex_meta.get("source_site", "")
                ex_stanzas_len = len(ex_song.get("stanzas", []))
                ex_char_len = sum(len(s.get("text", "")) for s in ex_song.get("stanzas", []))
                
                title_sim = fuzz.token_set_ratio(cur_t_key, ex_t_key)
                fl_sim = fuzz.token_set_ratio(cur_fl_key, ex_fl_key) if (cur_fl_key and ex_fl_key) else 0

                if title_sim < 75 and fl_sim < 80:
                    continue

                lyrics_sim = fuzz.token_set_ratio(cur_lyr_key, ex_lyr_key)

                # 1. Exact Duplicate
                if (title_sim >= 98 and lyrics_sim >= 98) or (title_sim >= 90 and lyrics_sim >= 95):
                    cur_prio = get_source_score(cur_source)
                    ex_prio = get_source_score(ex_source)
                    
                    prefer_cur = False
                    if cur_stanzas_len > ex_stanzas_len:
                        prefer_cur = True
                    elif cur_stanzas_len == ex_stanzas_len:
                        if cur_char_len > ex_char_len:
                            prefer_cur = True
                        elif cur_char_len == ex_char_len:
                            if cur_prio < ex_prio:
                                prefer_cur = True
                                
                    if prefer_cur:
                        processed[idx] = current

                    total_exact_removed += 1
                    duplicate_report.append({
                        "duplicate_group_id": f"EXACT_{group_counter}",
                        "language": lang,
                        "type": "exact_duplicate_removed",
                        "kept": cur_song["title"] if prefer_cur else ex_song["title"],
                        "kept_url": cur_meta.get("source_url") if prefer_cur else ex_meta.get("source_url"),
                        "removed_url": ex_meta.get("source_url") if prefer_cur else cur_meta.get("source_url"),
                        "similarity_scores": {
                            "title_similarity": title_sim,
                            "lyrics_similarity": lyrics_sim
                        }
                    })
                    group_counter += 1
                    matched = True
                    break

                # 2. Doubtful Duplicate
                elif (title_sim >= 80 and 80 <= lyrics_sim < 95) or (fl_sim >= 90 and 80 <= lyrics_sim < 95):
                    group_id = f"DOUBTFUL_{group_counter}"
                    group_counter += 1
                    
                    cur_meta["duplicate_suspect"] = True
                    cur_meta["duplicate_group_id"] = group_id
                    ex_meta["duplicate_suspect"] = True
                    ex_meta["duplicate_group_id"] = group_id
                    
                    total_doubtful_kept += 1
                    duplicate_report.append({
                        "duplicate_group_id": group_id,
                        "language": lang,
                        "type": "doubtful_duplicate_kept",
                        "kept": [cur_song["title"], ex_song["title"]],
                        "urls": [cur_meta.get("source_url"), ex_meta.get("source_url")],
                        "similarity_scores": {
                            "title_similarity": title_sim,
                            "first_line_similarity": fl_sim,
                            "lyrics_similarity": lyrics_sim
                        },
                        "decision": "Kept both songs in seed.json"
                    })
            
            if not matched:
                processed.append(current)
                
        kept_all.extend(processed)

    stats = {
        "exact_duplicates_removed": total_exact_removed,
        "doubtful_duplicates_kept": total_doubtful_kept
    }
    
    return kept_all, duplicate_report, stats
