import { supabase, isSupabaseConfigured } from './supabase.js';

const LOCAL_INCOMPLETE_KEY = 'church-songbook:incomplete_flags:v1';

function getLocalIncomplete() {
  try {
    const raw = localStorage.getItem(LOCAL_INCOMPLETE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('Error reading local incomplete songs:', err);
    return {};
  }
}

function saveLocalIncomplete(data) {
  try {
    localStorage.setItem(LOCAL_INCOMPLETE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Error saving local incomplete songs:', err);
  }
}

/**
 * Fetch incomplete / requires-edit flags from Supabase and merge with local storage.
 */
export async function fetchIncompleteFlags() {
  const localFlags = getLocalIncomplete();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('missing_songs')
        .select('*')
        .eq('status', 'needs_edit');

      if (!error && Array.isArray(data)) {
        const merged = { ...localFlags };
        data.forEach((item) => {
          const key = (item.keyword || '').trim().toLowerCase();
          if (key) {
            merged[key] = {
              supabaseId: item.id,
              keyword: item.keyword,
              notes: item.notes,
              createdAt: item.created_at,
            };
          }
        });
        saveLocalIncomplete(merged);
        return merged;
      }
    } catch (err) {
      console.warn('Could not fetch incomplete songs from Supabase, using local fallback:', err.message);
    }
  }

  return localFlags;
}

/**
 * Mark a song as incomplete / requiring edit.
 * Retains in Supabase (missing_songs table with status 'needs_edit') and in local storage.
 */
export async function markSongIncomplete(song, userNotes = '') {
  if (!song || !song.title) {
    throw new Error('Song information is required.');
  }

  const title = song.title.trim();
  const key = title.toLowerCase();
  const notesText = userNotes
    ? `[Requires Edit] ${userNotes.trim()}`
    : `[Requires Edit] Lyrics incomplete or missing stanzas for "${title}"`;

  const localFlags = getLocalIncomplete();
  localFlags[key] = {
    songId: song.id,
    keyword: title,
    notes: notesText,
    createdAt: new Date().toISOString(),
  };
  saveLocalIncomplete(localFlags);

  if (isSupabaseConfigured && supabase) {
    try {
      // Check if already in Supabase
      const { data: existing } = await supabase
        .from('missing_songs')
        .select('id')
        .ilike('keyword', title)
        .eq('status', 'needs_edit')
        .limit(1);

      if (existing && existing.length > 0) {
        const { data: updated, error } = await supabase
          .from('missing_songs')
          .update({
            notes: notesText,
            created_at: new Date().toISOString(),
          })
          .eq('id', existing[0].id)
          .select()
          .single();

        if (!error && updated) {
          localFlags[key].supabaseId = updated.id;
          saveLocalIncomplete(localFlags);
        }
      } else {
        const { data: inserted, error } = await supabase
          .from('missing_songs')
          .insert([
            {
              keyword: title,
              notes: notesText,
              status: 'needs_edit',
            },
          ])
          .select()
          .single();

        if (!error && inserted) {
          localFlags[key].supabaseId = inserted.id;
          saveLocalIncomplete(localFlags);
        }
      }
    } catch (err) {
      console.warn('Supabase markSongIncomplete sync error, saved locally:', err.message);
    }
  }

  return localFlags;
}

/**
 * Unmark a song as incomplete (mark as resolved / complete).
 */
export async function unmarkSongIncomplete(song) {
  if (!song || !song.title) return;
  const title = song.title.trim();
  const key = title.toLowerCase();

  const localFlags = getLocalIncomplete();
  const existing = localFlags[key];
  delete localFlags[key];
  saveLocalIncomplete(localFlags);

  if (isSupabaseConfigured && supabase) {
    try {
      if (existing?.supabaseId) {
        await supabase
          .from('missing_songs')
          .delete()
          .eq('id', existing.supabaseId);
      } else {
        await supabase
          .from('missing_songs')
          .delete()
          .ilike('keyword', title)
          .eq('status', 'needs_edit');
      }
    } catch (err) {
      console.warn('Supabase unmarkSongIncomplete sync error:', err.message);
    }
  }

  return localFlags;
}

/**
 * Check if a song is currently marked incomplete.
 */
export function isSongIncomplete(song, flags) {
  if (!song || !song.title) return false;
  const key = song.title.trim().toLowerCase();
  const currentFlags = flags || getLocalIncomplete();
  return Boolean(currentFlags && currentFlags[key]);
}
