import { supabase, isSupabaseConfigured } from './supabase.js';
import { loadSeedSongs } from './seed.js';

const LIBRARY_CACHE_KEY = 'church-songbook:library_cache:v4';
const LAST_SYNC_KEY = 'church-songbook:last_sync_timestamp';

/**
 * Get client-side cached song library.
 * Available synchronously in 0ms without network call.
 */
export function getCachedLibrary() {
  try {
    const raw = localStorage.getItem(LIBRARY_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading cached library:', err);
  }

  // Fallback to bundled seed songs if cache is not yet established
  try {
    const seeds = loadSeedSongs();
    saveCachedLibrary(seeds);
    return seeds;
  } catch (err) {
    console.error('Error loading initial seeds:', err);
    return [];
  }
}

/**
 * Save song library to local client cache.
 */
export function saveCachedLibrary(songs) {
  try {
    if (Array.isArray(songs)) {
      localStorage.setItem(LIBRARY_CACHE_KEY, JSON.stringify(songs));
    }
  } catch (err) {
    console.error('Error saving cached library:', err);
  }
}

export function getLastSyncTime() {
  try {
    return localStorage.getItem(LAST_SYNC_KEY) || null;
  } catch {
    return null;
  }
}

export function setLastSyncTime(isoString) {
  try {
    localStorage.setItem(LAST_SYNC_KEY, isoString);
  } catch {}
}

/**
 * Save a single song to Supabase DB and update local cache.
 * Stores in `missing_songs` table with status 'song_item' and attempts `songs` table.
 */
export async function saveSongToDb(song) {
  if (!song) return;

  const songId = String(song.id || `song-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  const lookupKey = `song:${songId}`;

  const payload = {
    ...song,
    id: songId,
    updated_at: new Date().toISOString(),
  };

  // 1. Always update local cache synchronously
  try {
    const current = getCachedLibrary();
    const idx = current.findIndex((s) => String(s.id) === songId);
    let nextList;
    if (idx >= 0) {
      nextList = [...current];
      nextList[idx] = { ...nextList[idx], ...payload };
    } else {
      nextList = [payload, ...current];
    }
    saveCachedLibrary(nextList);
  } catch (cacheErr) {
    console.warn('Could not update local cache for song:', cacheErr);
  }

  // 2. Persist to Supabase if configured
  if (!isSupabaseConfigured || !supabase) return payload;

  try {
    // Upsert into missing_songs with status 'song_item'
    const { data: existing } = await supabase
      .from('missing_songs')
      .select('id')
      .eq('keyword', lookupKey)
      .eq('status', 'song_item')
      .limit(1);

    if (existing && existing.length > 0) {
      await supabase
        .from('missing_songs')
        .update({
          notes: JSON.stringify(payload),
          created_at: new Date().toISOString(),
        })
        .eq('id', existing[0].id);
    } else {
      await supabase
        .from('missing_songs')
        .insert([
          {
            keyword: lookupKey,
            notes: JSON.stringify(payload),
            status: 'song_item',
          },
        ]);
    }

    // Also attempt saving to public.songs if table exists
    try {
      await supabase
        .from('songs')
        .upsert([
          {
            id: songId,
            number: payload.number != null ? Number(payload.number) : null,
            title: payload.title,
            title_alt: payload.title_alt || null,
            language: payload.language || 'hindi',
            type: payload.type || 'worship',
            beat: payload.beat || null,
            tempo: payload.tempo != null ? Number(payload.tempo) : null,
            stanzas: payload.stanzas || [],
            updated_at: new Date().toISOString(),
          },
        ]);
    } catch {
      // Table may not exist; missing_songs is primary
    }
  } catch (err) {
    console.warn('Error saving song to Supabase DB:', err.message);
  }

  return payload;
}

/**
 * Delete a song from Supabase DB and local cache.
 */
export async function deleteSongFromDb(id) {
  if (!id) return;

  const songId = String(id);
  const lookupKey = `song:${songId}`;

  // 1. Remove from local cache
  try {
    const current = getCachedLibrary();
    const filtered = current.filter((s) => String(s.id) !== songId);
    saveCachedLibrary(filtered);
  } catch (cacheErr) {
    console.warn('Could not remove song from local cache:', cacheErr);
  }

  // 2. Remove from Supabase
  if (!isSupabaseConfigured || !supabase) return;

  try {
    await supabase
      .from('missing_songs')
      .delete()
      .eq('keyword', lookupKey)
      .eq('status', 'song_item');

    try {
      await supabase.from('songs').delete().eq('id', songId);
    } catch {}
  } catch (err) {
    console.warn('Error deleting song from Supabase DB:', err.message);
  }
}

/**
 * Fetch all songs and metadata from Supabase DB with progress tracking.
 *
 * @param {Function} onProgress Callback receiving percentage number (0 to 100)
 * @returns {Promise<Array>} Fresh songs list merged with client cache
 */
export async function syncSongsFromDb(onProgress = () => {}) {
  onProgress(10);

  if (!isSupabaseConfigured || !supabase) {
    onProgress(100);
    return getCachedLibrary();
  }

  try {
    onProgress(20);

    // 1. Fetch all song_item records from Supabase
    const { data: dbRecords, error: dbErr } = await supabase
      .from('missing_songs')
      .select('*')
      .eq('status', 'song_item');

    if (dbErr) {
      console.warn('Error fetching song_item from Supabase:', dbErr.message);
    }

    onProgress(45);

    // 2. Also try fetching from songs table if present
    let directSongs = [];
    try {
      const { data: rawSongs } = await supabase.from('songs').select('*');
      if (Array.isArray(rawSongs)) directSongs = rawSongs;
    } catch {}

    onProgress(60);

    // 3. Fetch song_meta (beat, tempo, type overrides)
    const { data: metaRecords } = await supabase
      .from('missing_songs')
      .select('*')
      .eq('status', 'song_meta');

    const metaMap = new Map();
    if (Array.isArray(metaRecords)) {
      metaRecords.forEach((row) => {
        try {
          const meta = typeof row.notes === 'string' ? JSON.parse(row.notes) : row.notes;
          if (meta) {
            if (meta.songId) metaMap.set(String(meta.songId), meta);
            if (meta.songTitle) metaMap.set(meta.songTitle.trim().toLowerCase(), meta);
          }
        } catch {}
      });
    }

    onProgress(75);

    // 4. Combine base seeds + current cached songs + Supabase songs
    const mergedMap = new Map();

    // Start with bundled seeds
    const baseSeeds = loadSeedSongs();
    baseSeeds.forEach((seed) => {
      mergedMap.set(String(seed.id), { ...seed, source: 'seed' });
    });

    // Layer direct songs table
    directSongs.forEach((s) => {
      if (s && s.id) {
        mergedMap.set(String(s.id), { ...s, source: 'db' });
      }
    });

    // Layer song_item from missing_songs
    if (Array.isArray(dbRecords)) {
      dbRecords.forEach((row) => {
        try {
          const song = typeof row.notes === 'string' ? JSON.parse(row.notes) : row.notes;
          if (song && song.id) {
            const sid = String(song.id);
            const existing = mergedMap.get(sid) || {};
            mergedMap.set(sid, { ...existing, ...song, source: 'db' });
          }
        } catch (e) {
          console.warn('Could not parse song record:', row.id);
        }
      });
    }

    onProgress(90);

    // 5. Apply beat, tempo, type overrides
    const finalList = Array.from(mergedMap.values()).map((song) => {
      const override =
        metaMap.get(String(song.id)) ||
        (song.title ? metaMap.get(song.title.trim().toLowerCase()) : null);

      if (!override) return song;

      return {
        ...song,
        beat: override.beat !== undefined && override.beat !== null ? override.beat : song.beat,
        tempo: override.tempo !== undefined && override.tempo !== null ? override.tempo : song.tempo,
        type: override.type !== undefined && override.type !== null ? override.type : song.type,
      };
    });

    // 6. Sort by number -> title
    finalList.sort((a, b) => {
      const an = a.number ?? Number.MAX_SAFE_INTEGER;
      const bn = b.number ?? Number.MAX_SAFE_INTEGER;
      if (an !== bn) return an - bn;
      return (a.title || '').localeCompare(b.title || '', ['hi', 'en', 'mr']);
    });

    // 7. Update client-side cached JSON
    saveCachedLibrary(finalList);
    setLastSyncTime(new Date().toISOString());

    onProgress(100);
    return finalList;
  } catch (err) {
    console.error('syncSongsFromDb failed, falling back to local cache:', err);
    onProgress(100);
    return getCachedLibrary();
  }
}
