import { soundKey, devToRoman, hasDevanagari } from './translit.js';

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
 * Tokenize string into lowercase alphanumeric words
 */
function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
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
  // For body words, prefix matching if query token has >= 3 chars
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

/** Precompute normalised index for a song */
export function buildIndex(song) {
  const songNumber = song.number != null ? String(song.number) : '';
  const title = String(song.title || '');
  const titleAlt = String(song.title_alt || '');
  const body = (song.stanzas || []).map((s) => s.text || '').join(' ');

  const titleRawTokens = tokenize(`${title} ${titleAlt}`);
  const bodyRawTokens = tokenize(body);

  const titleSoundTokens = tokenize(soundKey(`${title} ${titleAlt}`));
  const bodySoundTokens = tokenize(soundKey(body));

  return {
    id: song.id,
    number: songNumber,
    rawTitle: `${title} ${titleAlt}`.toLowerCase(),
    rawBody: body.toLowerCase(),
    titleRawTokens,
    bodyRawTokens,
    titleSoundTokens,
    bodySoundTokens,
  };
}

/** Parse and normalize user search query */
export function parseQuery(raw) {
  const q = String(raw || '').trim();
  if (!q) return { raw: '', empty: true };

  const numPrefixMatch = q.match(/^(?:#\s*|\b(?:song|no|num|number)\b[.\s]*)\s*(\d+)$/i);
  const pureNumMatch = /^\d+$/.test(q);
  const targetNumber = numPrefixMatch ? numPrefixMatch[1] : (pureNumMatch ? q : null);

  const rawTokens = tokenize(q);
  const soundTokens = tokenize(soundKey(q));

  return {
    raw: q,
    lower: q.toLowerCase(),
    empty: false,
    targetNumber,
    rawTokens,
    soundTokens,
  };
}

/**
 * Strict search scoring:
 * - Empty query: returns 1 for all songs (shows all songs).
 * - Number query: ONLY returns songs matching the number.
 * - Text query: EVERY token in query MUST match the song. Songs with missing tokens get 0.
 * - Returns score > 0 on match, 0 on no match.
 */
export function scoreSongMatch(index, q) {
  if (!q || q.empty || !q.raw) return 1;

  // 1. Song Number Search (Strict)
  if (q.targetNumber) {
    if (index.number === q.targetNumber) return 1000;
    if (index.number.startsWith(q.targetNumber)) return 500;
    return 0;
  }

  // 2. Exact Title Phrase Match
  const isDirectTitleMatch = index.rawTitle.includes(q.lower);

  const count = Math.max(q.rawTokens.length, q.soundTokens.length);
  if (count === 0) return 0;

  let totalScore = 0;

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

    const bestScore = Math.max(titleScore * 3, bodyScore);

    // STRICT REQUIREMENT: Every query token MUST match in this song!
    if (bestScore === 0) {
      return 0;
    }

    totalScore += bestScore;
  }

  if (isDirectTitleMatch) totalScore += 200;

  return totalScore;
}

export function songMatches(index, q) {
  return scoreSongMatch(index, q) > 0;
}
