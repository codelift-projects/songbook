import { supabase, isSupabaseConfigured } from './supabase.js';

const LOCAL_META_KEY = 'church-songbook:song_meta:v1';

export function getLocalSongMeta() {
  try {
    const raw = localStorage.getItem(LOCAL_META_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('Error reading local song metadata:', err);
    return {};
  }
}

export function saveLocalSongMeta(metaMap) {
  try {
    localStorage.setItem(LOCAL_META_KEY, JSON.stringify(metaMap));
  } catch (err) {
    console.error('Error saving local song metadata:', err);
  }
}

/**
 * Fetch all song metadata overrides from Supabase and merge with local storage.
 * Stored in `missing_songs` table with `status = 'song_meta'`.
 */
export async function fetchSongMetadata() {
  const localMap = getLocalSongMeta();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('missing_songs')
        .select('*')
        .eq('status', 'song_meta');

      if (!error && Array.isArray(data)) {
        const merged = { ...localMap };
        data.forEach((row) => {
          try {
            const parsed = typeof row.notes === 'string' ? JSON.parse(row.notes) : row.notes;
            if (parsed && typeof parsed === 'object') {
              const metaEntry = {
                supabaseId: row.id,
                songId: parsed.songId || null,
                songTitle: parsed.songTitle || null,
                beat: parsed.beat ?? null,
                tempo: parsed.tempo != null ? Number(parsed.tempo) : null,
                type: parsed.type || null,
                updatedAt: parsed.updated_at || row.created_at,
              };

              // Key by songId and normalized title for guaranteed lookup
              if (parsed.songId) {
                merged[String(parsed.songId)] = metaEntry;
              }
              if (parsed.songTitle) {
                merged[parsed.songTitle.trim().toLowerCase()] = metaEntry;
              }
            }
          } catch (e) {
            console.warn('Could not parse song_meta row notes:', row.notes);
          }
        });

        saveLocalSongMeta(merged);
        return merged;
      }
    } catch (err) {
      console.warn('Could not fetch song metadata from Supabase, using local fallback:', err.message);
    }
  }

  return localMap;
}

/**
 * Save / Update beat, tempo, and type for a song in Supabase and local storage.
 *
 * @param {Object} song The song object (id, title, etc.)
 * @param {Object} updates { beat, tempo, type }
 */
export async function saveSongMetadata(song, updates = {}) {
  if (!song || (!song.id && !song.title)) {
    throw new Error('Song information is required to update beat and tempo.');
  }

  const songId = String(song.id || '');
  const songTitle = String(song.title || '').trim();
  const titleKey = songTitle.toLowerCase();

  const beatVal = updates.beat !== undefined ? (updates.beat ? String(updates.beat).trim() : null) : song.beat;
  const tempoVal = updates.tempo !== undefined ? (updates.tempo != null && updates.tempo !== '' ? Number(updates.tempo) : null) : song.tempo;
  const typeVal = updates.type !== undefined ? (updates.type ? String(updates.type).toLowerCase().trim() : null) : song.type;

  const metaPayload = {
    songId: songId || null,
    songTitle: songTitle || null,
    beat: beatVal || null,
    tempo: tempoVal != null && !isNaN(tempoVal) ? tempoVal : null,
    type: typeVal === 'praise' ? 'praise' : typeVal === 'worship' ? 'worship' : null,
    updated_at: new Date().toISOString(),
  };

  const lookupKey = `meta:${songId || titleKey}`;

  // 1. Immediately update local storage
  const localMap = getLocalSongMeta();
  const entry = {
    ...metaPayload,
    updatedAt: metaPayload.updated_at,
  };
  if (songId) localMap[songId] = entry;
  if (titleKey) localMap[titleKey] = entry;
  saveLocalSongMeta(localMap);

  // 2. Persist to Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      // Find existing record by lookupKey in keyword column
      const { data: existing } = await supabase
        .from('missing_songs')
        .select('id')
        .eq('keyword', lookupKey)
        .eq('status', 'song_meta')
        .limit(1);

      if (existing && existing.length > 0) {
        const { data: updated, error } = await supabase
          .from('missing_songs')
          .update({
            notes: JSON.stringify(metaPayload),
            created_at: new Date().toISOString(),
          })
          .eq('id', existing[0].id)
          .select()
          .single();

        if (!error && updated) {
          entry.supabaseId = updated.id;
        }
      } else {
        const { data: inserted, error } = await supabase
          .from('missing_songs')
          .insert([
            {
              keyword: lookupKey,
              notes: JSON.stringify(metaPayload),
              status: 'song_meta',
            },
          ])
          .select()
          .single();

        if (!error && inserted) {
          entry.supabaseId = inserted.id;
        }
      }

      // Also attempt updating the public.songs table if it exists
      if (!songId.startsWith('seed:')) {
        try {
          await supabase
            .from('songs')
            .update({
              beat: metaPayload.beat,
              tempo: metaPayload.tempo,
              type: metaPayload.type,
              updated_at: new Date().toISOString(),
            })
            .eq('id', songId);
        } catch {
          // Ignore if songs table is absent
        }
      }

      if (songId) localMap[songId] = entry;
      if (titleKey) localMap[titleKey] = entry;
      saveLocalSongMeta(localMap);
    } catch (err) {
      console.warn('Supabase saveSongMetadata error, preserved in local storage:', err.message);
    }
  }

  return entry;
}
