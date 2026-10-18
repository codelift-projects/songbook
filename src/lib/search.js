import { soundKey, devToRoman, hasDevanagari } from './translit.js';

const DEV_DIGITS = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
};

export function normalizeNumerals(text) {
  return String(text || '').replace(/[०-९]/g, (ch) => DEV_DIGITS[ch] || ch);
}

/**
 * Calculates Levenshtein edit distance between two strings
 */
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = Array(b.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      let val;
      if (a[i - 1] === b[j - 1]) val = row[j - 1];
      else val = Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

/**
 * Tokenize string into lowercase alphanumeric words, preserving Devanagari matras (\p{M})
 */
function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Matches a query token against a title word
 */
function matchWordInTitle(qToken, targetWord) {
  if (!qToken || !targetWord) return 0;
  if (qToken === targetWord) return 100;
  if (targetWord.startsWith(qToken)) return 80;
  // Typo tolerance: 1 edit difference for words with 3+ chars
  if (qToken.length >= 3 && targetWord.length >= 3) {
    if (Math.abs(qToken.length - targetWord.length) <= 1 && levenshtein(qToken, targetWord) <= 1) {
      return 60;
    }
  }
  return 0;
}

/**
 * Matches a query token against a body/stanza word
 */
function matchWordInBody(qToken, targetWord) {
  if (!qToken || !targetWord) return 0;
  if (qToken === targetWord) return 100;
  if (qToken.length >= 3 && targetWord.startsWith(qToken)) return 70;
  // Typo tolerance: 1 edit difference for words with 3+ chars
  if (qToken.length >= 3 && targetWord.length >= 3) {
    if (Math.abs(qToken.length - targetWord.length) <= 1 && levenshtein(qToken, targetWord) <= 1) {
      return 50;
    }
  }
  return 0;
}

function matchTokenAgainstWordList(qToken, wordList, isTitle = false) {
  let maxScore = 0;
  for (const w of wordList) {
    const score = isTitle ? matchWordInTitle(qToken, w) : matchWordInBody(qToken, w);
    if (score > maxScore) {
      maxScore = score;
      if (maxScore === 100) break;
    }
  }
  return maxScore;
}

/** Precompute normalised bilingual index for a song */
export function buildIndex(song) {
  const songNumber = song.number != null ? String(song.number) : '';
  const title = String(song.title || '');
  const titleAlt = String(song.title_alt || '');
  const titleRoman = hasDevanagari(title) ? devToRoman(title) : '';
  
  const body = (song.stanzas || []).map((s) => s.text || '').join(' ');
  const bodyRoman = hasDevanagari(body) ? devToRoman(body) : '';

  const fullTitle = `${title} ${titleAlt} ${titleRoman}`.trim();
  const fullBody = `${body} ${bodyRoman}`.trim();

  const titleRawTokens = tokenize(fullTitle);
  const bodyRawTokens = tokenize(fullBody);

  const titleSoundTokens = tokenize(soundKey(fullTitle));
  const bodySoundTokens = tokenize(soundKey(fullBody));

  return {
    id: song.id,
    number: songNumber,
    rawTitle: fullTitle.toLowerCase(),
    rawBody: fullBody.toLowerCase(),
    titleRawTokens,
    bodyRawTokens,
    titleSoundTokens,
    bodySoundTokens,
  };
}

const GENERIC_PREFIXES = new Set(['geet', 'गीत', 'song', 'songs', 'bhajan', 'भजन']);

/** Parse and normalize user search query with bilingual intelligence */
export function parseQuery(raw) {
  const q = String(raw || '').trim();
  if (!q) return { raw: '', empty: true };

  const normQ = normalizeNumerals(q);

  // Match: "117", "गीत 117", "गीत नं 117", "geet 117", "geet #117", "song 117", "#117"
  const numMatch = normQ.match(/^(?:#\s*|(?:song|no|num|number|geet|गीत)\s*(?:नं\.?|नंबर)?\s*[:\-\.]?\s*#?\s*)(\d+)$/i);
  const pureNumMatch = /^\d+$/.test(normQ);
  const targetNumber = numMatch ? numMatch[1] : (pureNumMatch ? normQ : null);

  let rawTokens = tokenize(q);
  let soundTokens = tokenize(soundKey(q));

  // If user typed "गीत तेरे आसन" or "geet tere aasan", strip the generic word "गीत"/"geet"
  if (rawTokens.length > 1 && GENERIC_PREFIXES.has(rawTokens[0])) {
    rawTokens = rawTokens.slice(1);
    soundTokens = tokenize(soundKey(rawTokens.join(' ')));
  }

  return {
    raw: q,
    lower: q.toLowerCase(),
    normNumerals: normQ,
    empty: false,
    targetNumber,
    rawTokens,
    soundTokens,
  };
}

/**
 * Bilingual search scoring:
 * - Empty query: returns 1 for all songs (shows all songs).
 * - Number query: ONLY returns songs matching the number (exact match = 2000, prefix = 1000).
 * - Text query: Tokens must match either raw or phonetic form in title or body.
 * - Heavy weighting on title matches.
 */
export function scoreSongMatch(index, q) {
  if (!q || q.empty || !q.raw) return 1;

  // 1. Song Number Search (Strict & Fast)
  if (q.targetNumber) {
    if (index.number === q.targetNumber) return 2000;
    if (index.number.startsWith(q.targetNumber)) return 1000;
    return 0;
  }

  // 2. Exact Title Phrase Match (Devanagari or Transliterated)
  const isDirectTitleMatch = index.rawTitle.includes(q.lower);

  const count = Math.max(q.rawTokens.length, q.soundTokens.length);
  if (count === 0) return 0;

  let totalScore = 0;
  let matchedTokens = 0;

  for (let i = 0; i < count; i++) {
    const rawTok = q.rawTokens[i] || '';
    const soundTok = q.soundTokens[i] || (rawTok ? soundKey(rawTok) : '');

    // Title matching (Raw or Phonetic)
    const titleScore = Math.max(
      rawTok ? matchTokenAgainstWordList(rawTok, index.titleRawTokens, true) : 0,
      soundTok ? matchTokenAgainstWordList(soundTok, index.titleSoundTokens, true) : 0
    );

    // Body matching (Raw or Phonetic)
    const bodyScore = Math.max(
      rawTok ? matchTokenAgainstWordList(rawTok, index.bodyRawTokens, false) : 0,
      soundTok ? matchTokenAgainstWordList(soundTok, index.bodySoundTokens, false) : 0
    );

    const bestScore = Math.max(titleScore * 4, bodyScore);

    if (bestScore > 0) {
      matchedTokens++;
      totalScore += bestScore;
    }
  }

  // If none matched, or fewer than required matched:
  if (matchedTokens === 0) return 0;

  // In multi-word queries, require at least 80% of tokens to match
  if (count > 2 && matchedTokens < count - 1) return 0;
  if (count === 2 && matchedTokens < 2) return 0;
  if (count === 1 && matchedTokens < 1) return 0;

  if (isDirectTitleMatch) totalScore += 500;

  return totalScore;
}

export function songMatches(index, q) {
  return scoreSongMatch(index, q) > 0;
}
