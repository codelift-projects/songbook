/**
 * Merge seed and DB songs into one list.
 *
 * Rules:
 *   - DB songs with the same slug as a seed song SHADOW the seed song.
 *   - Everything else is concatenated.
 *   - Sorted by number, then title (uses the same collator as songs.js).
 */
export function mergeSongs(seedSongs = [], dbSongs = []) {
  const bySlug = new Map();

  for (const s of seedSongs) {
    const key = s.slug || s.id;
    bySlug.set(key, { ...s, source: 'seed' });
  }

  for (const s of dbSongs) {
    const key = s.slug || s.id;
    // DB always wins over seed on slug collision
    bySlug.set(key, { ...s, source: 'db' });
  }

  const merged = [...bySlug.values()].map((s) => ({
    ...s,
    source: s.source || 'db',
  }));

  return sortSongs(merged);
}

/* Local copy of the sorter to avoid a circular import with songs.js */
function sortSongs(list) {
  return [...list].sort((a, b) => {
    const an = a.number ?? Number.MAX_SAFE_INTEGER;
    const bn = b.number ?? Number.MAX_SAFE_INTEGER;
    if (an !== bn) return an - bn;
    return (a.title || '').localeCompare(b.title || '', ['hi', 'en', 'mr']);
  });
}
