import os
import re
import time
import unicodedata
import hashlib
from urllib.parse import urlparse
import requests
from indic_transliteration import sanscript
from indic_transliteration.sanscript import transliterate

USER_AGENT = "IndianChurchSongAltArchiver/1.0 (+contact@example.com)"
CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "raw", "alt_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

_last_request_time = {}

def get_domain(url):
    return urlparse(url).netloc.lower()

def polite_get(url, headers=None, timeout=25, use_cache=True, retries=2):
    """
    Polite HTTP GET request with domain rate-limiting (1s per domain) and optional disk cache.
    """
    domain = get_domain(url)
    
    # Check disk cache
    if use_cache:
        url_hash = hashlib.md5(url.encode('utf-8')).hexdigest()
        cache_file = os.path.join(CACHE_DIR, f"{domain}_{url_hash}.dat")
        if os.path.exists(cache_file):
            try:
                with open(cache_file, 'r', encoding='utf-8') as f:
                    return f.read()
            except Exception:
                pass

    # Rate limiting: minimum 1.0 second per domain
    now = time.time()
    last_time = _last_request_time.get(domain, 0)
    elapsed = now - last_time
    if elapsed < 1.0:
        time.sleep(1.0 - elapsed)
    _last_request_time[domain] = time.time()

    req_headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8",
    }
    if headers:
        req_headers.update(headers)

    for attempt in range(retries + 1):
        try:
            resp = requests.get(url, headers=req_headers, timeout=timeout)
            if resp.status_code == 200:
                text = resp.text
                if use_cache:
                    try:
                        with open(cache_file, 'w', encoding='utf-8') as f:
                            f.write(text)
                    except Exception:
                        pass
                return text
            elif resp.status_code in (404, 410):
                return None
            else:
                time.sleep(1)
        except Exception:
            if attempt == retries:
                return None
            time.sleep(1.5)
    return None

def normalize_unicode(text):
    if not text:
        return ""
    text = unicodedata.normalize('NFC', text)
    text = re.sub(r'[\u200B-\u200D\uFEFF\u00A0]', ' ', text)
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    return text.strip()

def transliterate_to_roman(text):
    """
    Transliterate Devanagari string to clean Title-Cased Roman string.
    """
    if not text:
        return ""
    try:
        if re.search(r'[\u0900-\u097F]', text):
            rom = transliterate(text, sanscript.DEVANAGARI, sanscript.ITRANS)
            rom = re.sub(r'[\~\|\.\^]', '', rom)
            rom = rom.replace('aa', 'a').replace('ee', 'i').replace('oo', 'u')
            rom = re.sub(r'\s+', ' ', rom).strip()
            return rom.title()
    except Exception:
        pass
    return text.strip()

def detect_language(title, text, declared_lang=""):
    declared = (declared_lang or "").lower()
    if declared in ("hindi", "marathi", "english", "malayalam", "tamil", "telugu", "kannada", "bengali"):
        return declared

    combined = f"{title}\n{text}"
    
    if re.search(r'[\u0D00-\u0D7F]', combined):
        return "malayalam"
    if re.search(r'[\u0B80-\u0BFF]', combined):
        return "tamil"
    if re.search(r'[\u0C00-\u0C7F]', combined):
        return "telugu"
    if re.search(r'[\u0C80-\u0CFF]', combined):
        return "kannada"
    if re.search(r'[\u0980-\u09FF]', combined):
        return "bengali"

    if re.search(r'[\u0900-\u097F]', combined):
        marathi_markers = re.findall(r'(?:ळ|आहे|माझा|माझी|माझे|तुझा|तुझी|तुझे|तुझ्या|देवा|आम्ही|कडवे|स्तोत्र|ह्रदय|गात|आला)', combined)
        hindi_markers = re.findall(r'(?:है|हैं|मेरा|मेरी|मेरे|तेरा|तेरी|तेरे|हम|हमारा|कोरस|करता|सुनाएंगे|गाएंगे|यीशु|महिमा)', combined)
        if len(marathi_markers) > len(hindi_markers) + 1:
            return "marathi"
        return "hindi"

    return "english"

def classify_category(title, lyrics, tags=None):
    if tags:
        for tag in tags:
            t = tag.lower()
            if any(w in t for w in ['worship', 'adoration', 'devotional', 'prayer', 'offertory', 'communion', 'lent']):
                return "worship"
            if any(w in t for w in ['praise', 'thanksgiving', 'celebration', 'dance', 'joy', 'hosanna', 'chorus']):
                return "praise"

    combined = f"{title} {lyrics}".lower()
    praise_keywords = [
        'स्तुति', 'जय', 'हल्लेलूयाह', 'हल्लेलुया', 'धन्यवाद', 'शुक्र', 'होसन्ना', 'राजा',
        'praise', 'celebration', 'shout', 'dance', 'joy', 'triumph', 'glory', 'sing aloud',
        'गाओ', 'बजाओ', 'झूमो', 'नाचो'
    ]
    worship_keywords = [
        'आराधना', 'सजदा', 'पवित्र', 'चरणों', 'लहू', 'क्रूस', 'शांति', 'दया',
        'worship', 'adoration', 'holy', 'presence', 'grace', 'cross', 'blood', 'love',
        'bow', 'surrender', 'kneel', 'spirit', 'आत्मा'
    ]

    praise_score = sum(combined.count(w) for w in praise_keywords)
    worship_score = sum(combined.count(w) for w in worship_keywords)

    if praise_score > worship_score:
        return "praise"
    return "worship"
