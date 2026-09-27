/* ============================================================
 * Devanagari (Hindi + Marathi) ⇄ Roman normalisation for search.
 *
 * Both Devanagari and loose Roman spellings map to a common
 * phonetic key, so:
 *    "jis nam me hai sakti"   ⟷  "जिस नाम में है शक्ति"
 *    "ga devache upakar"      ⟷  "गा देवाचे उपकार"
 *    "yeshu masih"            ⟷  "यीशु मसीह" / "येशू ख्रिस्त"
 * ============================================================ */

const DEVANAGARI = /[\u0900-\u097F]/;
const VIRAMA = '\u094D'; // ्

const CONSONANTS = {
  'क': 'k',   'ख': 'kh',  'ग': 'g',   'घ': 'gh',  'ङ': 'ng',
  'च': 'ch',  'छ': 'chh', 'ज': 'j',   'झ': 'jh',  'ञ': 'ny',
  'ट': 't',   'ठ': 'th',  'ड': 'd',   'ढ': 'dh',  'ण': 'n',
  'त': 't',   'थ': 'th',  'द': 'd',   'ध': 'dh',  'न': 'n',
  'प': 'p',   'फ': 'ph',  'ब': 'b',   'भ': 'bh',  'म': 'm',
  'य': 'y',   'र': 'r',   'ल': 'l',   'व': 'v',   'ळ': 'l',
  'श': 'sh',  'ष': 'sh',  'स': 's',   'ह': 'h',
  'क़': 'q',   'ख़': 'kh',  'ग़': 'g',  'ज़': 'z',
  'ड़': 'r',   'ढ़': 'rh',  'फ़': 'f',
};

const MATRAS = {
  'ा': 'aa', 'ि': 'i',  'ी': 'ee', 'ु': 'u',  'ू': 'oo',
  'ृ': 'ri', 'ॄ': 'ri', 'े': 'e',  'ै': 'ai', 'ो': 'o',
  'ौ': 'au', 'ॉ': 'o',  'ॅ': 'e',
};

const STANDALONE = {
  'अ': 'a',  'आ': 'aa', 'इ': 'i',  'ई': 'ee', 'उ': 'u',  'ऊ': 'oo',
  'ऋ': 'ri', 'ॠ': 'ri', 'ऌ': 'li', 'ॡ': 'li',
  'ए': 'e',  'ऐ': 'ai', 'ओ': 'o',  'औ': 'au', 'ऍ': 'e',  'ऑ': 'o',
  'ं': 'n',  'ँ': 'n',  'ः': 'h',  'ऽ': '',   '्': '',
  '०': '0',  '१': '1',  '२': '2',  '३': '3',  '४': '4',
  '५': '5',  '६': '6',  '७': '7',  '८': '8',  '९': '9',
  '।': ' ',  '॥': ' ',
};

export function hasDevanagari(input) {
  return DEVANAGARI.test(String(input || ''));
}

/** Devanagari → Roman transliteration */
export function devToRoman(input) {
  const raw = String(input || '')
    .replace(/ज्ञ/g, 'dny') // Marathi dnya / Hindi gya
    .replace(/क्ष/g, 'ksh')
    .replace(/श्र/g, 'shr')
    .replace(/त्र/g, 'tr');

  const chars = [...raw];
  let out = '';

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const next = chars[i + 1];

    if (CONSONANTS[ch]) {
      out += CONSONANTS[ch];
      const hasVowel = next && (MATRAS[next] || next === VIRAMA);
      if (!hasVowel) out += 'a';
    } else if (ch === VIRAMA) {
      // skip – conjunct marker
    } else if (MATRAS[ch]) {
      out += MATRAS[ch];
    } else if (STANDALONE[ch] !== undefined) {
      out += STANDALONE[ch];
    } else {
      out += ch;
    }
  }

  // Drop final 'a' at word boundaries
  return out.replace(/a(?=\s|$)/g, '');
}

/** Primary phonetic normaliser */
export function soundKey(input) {
  let s = String(input || '').toLowerCase().trim();
  if (!s) return '';
  if (hasDevanagari(s)) s = devToRoman(s);

  // keep letters, digits, spaces
  s = s.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!s) return '';

  // 1. Vowel lengths and diphthongs
  s = s.replace(/aa+/g, 'a');
  s = s.replace(/ee+|ii+/g, 'i');
  s = s.replace(/oo+|uu+/g, 'u');
  s = s.replace(/ai+|ay+/g, 'e');
  s = s.replace(/ei+|ey+/g, 'e');
  s = s.replace(/au+|ou+|aw+/g, 'o');

  // 2. Repeated consonant collapse (ajj -> aj, rabb -> rab, dill -> dil, stutti -> stuti)
  s = s.replace(/([b-df-hj-np-tv-z])\1+/g, '$1');

  // 3. Common religious/worship phonetic variants
  s = s.replace(/\byeshu\b|\byishu\b|\byeeshu\b|\beishu\b|\bjesu\b|\bjesus\b/g, 'yesu');
  s = s.replace(/\bhallelujah\b|\bhalleluia\b|\bhaleluya\b|\bhalleluyah\b|\bhalleluiyah\b/g, 'haleluya');
  s = s.replace(/\bkrupa\b|\bkripa\b|\bkrpa\b/g, 'krupa');
  s = s.replace(/\bprabhu\b|\bprabu\b|\bprbhu\b/g, 'prabu');

  // 4. Marathi & Hindi digraphs
  s = s.replace(/dny|jny|gy/g, 'dny');
  s = s.replace(/ksh/g, 'x');

  // 5. Aspirates → base consonant
  s = s.replace(/chh/g, 'ch');
  s = s.replace(/kh/g, 'k');
  s = s.replace(/gh/g, 'g');
  s = s.replace(/jh/g, 'j');
  s = s.replace(/th/g, 't');
  s = s.replace(/dh/g, 'd');
  s = s.replace(/ph/g, 'f');
  s = s.replace(/bh/g, 'b');

  // 6. Sibilants / Labials (v & w equivalence, z & j equivalence)
  s = s.replace(/sh/g, 's');
  s = s.replace(/v/g, 'w');
  s = s.replace(/z/g, 'j');
  s = s.replace(/q/g, 'k');

  // 7. Common Hindi anusvara grammatical endings (men->me, hain->hai)
  s = s.replace(/\b([a-z]+)en\b/g, '$1e');
  s = s.replace(/\b([a-z]+)ain\b/g, '$1ai');

  return s;
}

/**
 * Alternate vowel key (i ⟷ e, u ⟷ o)
 */
export function altKey(input) {
  let s = soundKey(input);
  if (!s) return '';
  return s.replace(/i/g, 'e').replace(/u/g, 'o');
}

/** Consonant skeleton */
export function skeletonKey(input) {
  const s = soundKey(input);
  if (!s) return '';
  return s.replace(/[aeiou]/g, '').replace(/\s+/g, ' ').trim();
}
