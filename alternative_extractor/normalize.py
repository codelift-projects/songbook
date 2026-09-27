import re
from .utils import normalize_unicode, transliterate_to_roman, classify_category, detect_language

REPEAT_PATTERNS = [
    (re.compile(r'[\(\[\{]\s*(?:x\s*|×\s*)?([2-9])\s*[\)\]\}]', re.IGNORECASE), r' – \1'),
    (re.compile(r'(?:x|×)\s*([2-9])\b', re.IGNORECASE), r' – \1'),
    (re.compile(r'\(\s*२\s*\)'), ' – 2'),
    (re.compile(r'\(\s*३\s*\)'), ' – 3'),
    (re.compile(r'\(\s*४\s*\)'), ' – 4'),
]

SECTION_HEADING_MAP = {
    'chorus': 'कोरस',
    'sthayi': 'कोरस',
    'mukhda': 'कोरस',
    'refrain': 'कोरस',
    'कोरस': 'कोरस',
    'स्थायी': 'कोरस',
    'मुखड़ा': 'कोरस',
    'टेक': 'कोरस',
    'ध्रुपद': 'कोरस',
    'ध्रुवपद': 'कोरस',
    'verse': 'पद',
    'verse 1': 'पद 1',
    'verse 2': 'पद 2',
    'verse 3': 'पद 3',
    'verse 4': 'पद 4',
    'verse 5': 'पद 5',
    'antara': 'पद',
    'antara 1': 'पद 1',
    'antara 2': 'पद 2',
    'पद': 'पद',
    'अंतरा': 'पद',
    'कडवे': 'कडवे',
    'कडवे १': 'कडवे १',
    'कडवे २': 'कडवे २',
    'bridge': 'ब्रिज',
    'पुल': 'पुल',
    'ब्रिज': 'ब्रिज',
}

def clean_line(line, language):
    if not line:
        return ""
    line = normalize_unicode(line)
    line = re.sub(r'\[[A-Ga-g0-9#/bmsusmajdim\s\.\,\-\+\*]+\]', '', line)
    for pattern, repl in REPEAT_PATTERNS:
        line = pattern.sub(repl, line)
    line = re.sub(r'<[^>]+>', '', line)
    
    words = line.split()
    if words and all(re.match(r'^[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add)?[0-9]?(?:/[A-G](?:#|b)?)?$', w, re.IGNORECASE) for w in words):
        return ""
        
    if re.search(r'(?:share on|subscribe|lyrics by|written by|chord progression|tab by|download mp3|copyright)', line, re.IGNORECASE):
        return ""

    line = re.sub(r'\s+', ' ', line).strip()
    return line

def clean_raw_lyrics_to_stanzas(raw_text, language):
    if not raw_text:
        return []
        
    text = normalize_unicode(raw_text)
    text = re.sub(r'^---\r?\n[\s\S]*?\r?\n---', '', text).strip()
    text = re.sub(r'^#+\s+.*$', '', text, flags=re.MULTILINE)
    text = re.sub(r'===\s*".*?"', '', text)
    
    blocks = re.split(r'\n\s*\n+', text)
    raw_stanzas = []
    
    for block in blocks:
        lines = block.split('\n')
        label = ""
        lyric_lines = []
        
        for idx, line in enumerate(lines):
            clean = line.strip()
            if not clean:
                continue
                
            header_match = re.match(r'^(?:\[|\()?(?:chorus|verse\s*\d*|antara\s*\d*|कडवे\s*\d*|पद\s*\d*|कोरस|अंतरा|bridge|pre-?chorus|refrain|sthayi|स्थायी|मुखड़ा)(?:\s*\d*)?(?:\:|\)|\])?$', clean, re.IGNORECASE)
            if header_match and idx == 0:
                header_raw = clean.strip('[]():').lower()
                if language in ('hindi', 'marathi'):
                    label = SECTION_HEADING_MAP.get(header_raw, 'पद')
                else:
                    if 'chorus' in header_raw or 'refrain' in header_raw:
                        label = 'Chorus'
                    elif 'bridge' in header_raw:
                        label = 'Bridge'
                    else:
                        label = 'Verse'
                continue
                
            cl = clean_line(clean, language)
            if cl:
                if language in ('hindi', 'marathi'):
                    is_devanagari = bool(re.search(r'[\u0900-\u097F]', cl))
                    if not is_devanagari and re.search(r'[a-zA-Z]{3,}', cl):
                        continue
                lyric_lines.append(cl)
                
        if lyric_lines:
            stanza_text = "\n".join(lyric_lines).strip()
            if stanza_text:
                raw_stanzas.append({
                    "label": label,
                    "text": stanza_text
                })
                
    verse_counter = 1
    has_chorus = any(s["label"] in ('कोरस', 'Chorus') for s in raw_stanzas)
    
    for i, s in enumerate(raw_stanzas):
        if not s["label"]:
            if language in ('hindi', 'marathi'):
                if i == 0 and not has_chorus:
                    s["label"] = "कोरस"
                else:
                    if language == 'marathi':
                        s["label"] = f"कडवे {verse_counter}"
                    else:
                        s["label"] = f"पद {verse_counter}"
                    verse_counter += 1
            else:
                if i == 0 and not has_chorus:
                    s["label"] = "Verse 1"
                else:
                    s["label"] = f"Verse {verse_counter}"
                    verse_counter += 1
        else:
            if s["label"] == 'पद':
                s["label"] = f"पद {verse_counter}"
                verse_counter += 1
            elif s["label"] == 'कडवे':
                s["label"] = f"कडवे {verse_counter}"
                verse_counter += 1
            elif s["label"] == 'Verse':
                s["label"] = f"Verse {verse_counter}"
                verse_counter += 1

    if len(raw_stanzas) > 8:
        unique_stanzas = []
        seen_texts = set()
        for s in raw_stanzas:
            t_key = s["text"].lower()
            if s["label"] in ('कोरस', 'Chorus') and t_key in seen_texts:
                continue
            seen_texts.add(t_key)
            unique_stanzas.append(s)
        raw_stanzas = unique_stanzas[:8]

    return raw_stanzas

def normalize_song_record(raw_song):
    raw_title = raw_song.get("raw_title") or raw_song.get("title") or ""
    raw_lyrics = raw_song.get("raw_lyrics") or raw_song.get("lyrics") or ""
    source_url = raw_song.get("source_url") or ""
    source_site = raw_song.get("source_site") or ""
    tags = raw_song.get("tags") or []
    
    declared_lang = raw_song.get("language") or ""
    detected_lang = detect_language(raw_title, raw_lyrics, declared_lang)
    
    clean_title = normalize_unicode(raw_title)
    clean_title = re.sub(
        r'\s*[\(\[\{]?(?:lyrics\s*(?:in\s*(?:hindi|english|marathi))?(?:\s*(?:&|and)\s*in\s*(?:hindi|english|marathi))?|christian\s*song|worship\s*song|hindi\s*christian\s*song)[\)\]\}]?',
        '',
        clean_title,
        flags=re.IGNORECASE
    ).strip()
    clean_title = re.sub(r'^(?:[0-9]+[\.\-\s]+|(?:lyrics|song|गीत)\s*[\:\-\–]\s*)', '', clean_title, flags=re.IGNORECASE).strip()

    title_alt = ""
    if detected_lang in ('hindi', 'marathi'):
        paren_match = re.search(r'([a-zA-Z\s,]+)\s*[\(\[](.*[\u0900-\u097F].*)[\)\]]', clean_title)
        if paren_match:
            title_alt = paren_match.group(1).strip()
            clean_title = paren_match.group(2).strip()
        else:
            paren_match2 = re.search(r'(.*[\u0900-\u097F].*)\s*[\(\[](.*[a-zA-Z].*)[\)\]]', clean_title)
            if paren_match2:
                clean_title = paren_match2.group(1).strip()
                title_alt = paren_match2.group(2).strip()

    clean_title = re.sub(r'[\(\[\{]\s*[\)\]\}]', '', clean_title).strip()

    provided_alt = raw_song.get("title_alt") or raw_song.get("raw_title_alt")
    if provided_alt and provided_alt != clean_title:
        title_alt = normalize_unicode(provided_alt)
    elif not title_alt:
        if detected_lang in ('hindi', 'marathi'):
            title_alt = transliterate_to_roman(clean_title)
        else:
            title_alt = clean_title

    if not title_alt:
        title_alt = clean_title

    category = classify_category(clean_title, raw_lyrics, tags)
    stanzas = clean_raw_lyrics_to_stanzas(raw_lyrics, detected_lang)
    
    is_incomplete = False
    reasons = []
    
    if len(stanzas) < 2:
        is_incomplete = True
        reasons.append("fewer than 2 stanzas")
    if not clean_title:
        is_incomplete = True
        reasons.append("missing title")
        
    for s in stanzas:
        if not s.get("text") or not s.get("label"):
            is_incomplete = True
            reasons.append("empty stanza text or label")
            
    final_song = {
        "title": clean_title,
        "title_alt": title_alt,
        "language": detected_lang,
        "category": category,
        "stanzas": stanzas
    }
    
    meta = {
        "source_url": source_url,
        "source_site": source_site,
        "raw_title": raw_title,
        "extraction_confidence": 0.95 if not is_incomplete else 0.5,
        "duplicate_suspect": False,
        "duplicate_group_id": None,
        "incomplete": is_incomplete,
        "incomplete_reasons": reasons,
    }
    
    return final_song, meta
