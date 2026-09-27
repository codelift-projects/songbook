import raw from '../data/songs.seed.json';
import { uid, normalizeSong } from './songs.js';

/**
 * Load, validate, and normalise seed songs at module load time.
 * Runs synchronously. Throws if the file is malformed — this is a build-time
 * error the developer must fix, not a runtime error to swallow.
 */
export function loadSeedSongs() {
  if (!Array.isArray(raw)) {
    throw new Error('[seed] songs.seed.json must export an array');
  }

  const seenSlugs = new Set();

  const normalized = raw.map((song, i) => {
    const where = `songs.seed.json[${i}]`;

    if (!song || typeof song !== 'object') {
      throw new Error(`${where}: not an object`);
    }
    if (!song.slug || typeof song.slug !== 'string') {
      throw new Error(`${where}: missing "slug"`);
    }
    if (seenSlugs.has(song.slug)) {
      throw new Error(`${where}: duplicate slug "${song.slug}"`);
    }
    seenSlugs.add(song.slug);

    if (!song.title || typeof song.title !== 'string') {
      throw new Error(`${where}: missing "title"`);
    }
    if (!['hindi', 'english', 'marathi'].includes(song.language)) {
      throw new Error(`${where}: invalid language "${song.language}"`);
    }
    if (!Array.isArray(song.stanzas) || song.stanzas.length === 0) {
      throw new Error(`${where}: "stanzas" must be a non-empty array`);
    }
    song.stanzas.forEach((s, j) => {
      if (!s || typeof s.text !== 'string' || !s.text.trim()) {
        throw new Error(`${where}.stanzas[${j}]: missing text`);
      }
    });

    return normalizeSong({
      ...song,
      id: `seed:${song.slug}`, // stable, prefix-marked ID
      source: 'seed',
      stanzas: song.stanzas.map((s) => ({
        id: s.id || uid(),
        label: s.label || '',
        text: s.text,
      })),
      tags: song.tags || [],
    });
  });

  return normalized;
}

export function isSeedSong(song) {
  return song?.source === 'seed' || String(song?.id || '').startsWith('seed:');
}
