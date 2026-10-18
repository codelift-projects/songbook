import { supabase, isSupabaseConfigured } from './supabase';

const LOCAL_STORAGE_KEY = 'church-songbook:missing_songs:v1';

export function getLocalMissingSongs() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error reading local missing songs:', err);
    return [];
  }
}

export function saveLocalMissingSongs(list) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Error saving local missing songs:', err);
  }
}

/**
 * Fetch missing songs from Supabase if configured, with localStorage fallback.
 */
export async function fetchMissingSongs() {
  const localList = getLocalMissingSongs();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('missing_songs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase missing_songs fetch failed, using local storage fallback:', error.message);
        return localList;
      }

      if (Array.isArray(data)) {
        // Merge Supabase with local items by id or keyword
        const seen = new Set(data.map((item) => item.keyword.toLowerCase()));
        const uniqueLocal = localList.filter((item) => !seen.has(item.keyword.toLowerCase()));
        const combined = [...data, ...uniqueLocal].sort(
          (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
        );
        saveLocalMissingSongs(combined);
        return combined;
      }
    } catch (err) {
      console.warn('Network error fetching missing_songs from Supabase:', err.message);
      return localList;
    }
  }

  return localList;
}

/**
 * Add a missing song keyword to Supabase and LocalStorage.
 */
export async function addMissingSong(keyword, notes = '') {
  const trimmed = String(keyword || '').trim();
  if (!trimmed) {
    throw new Error('Keyword cannot be empty');
  }

  const localList = getLocalMissingSongs();
  
  // Check if already in list (case insensitive)
  const existingIndex = localList.findIndex(
    (item) => item.keyword.toLowerCase() === trimmed.toLowerCase()
  );

  const newEntry = {
    id: `missing-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    keyword: trimmed,
    notes: notes ? String(notes).trim() : null,
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  let updatedList;
  if (existingIndex >= 0) {
    // Bump existing to top with new timestamp
    const existing = { ...localList[existingIndex], ...newEntry, id: localList[existingIndex].id };
    updatedList = [existing, ...localList.filter((_, i) => i !== existingIndex)];
  } else {
    updatedList = [newEntry, ...localList];
  }
  saveLocalMissingSongs(updatedList);

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('missing_songs')
        .insert([
          {
            keyword: trimmed,
            notes: notes ? String(notes).trim() : null,
            status: 'pending',
            created_at: newEntry.created_at,
          },
        ])
        .select()
        .single();

      if (error) {
        console.warn('Supabase missing_songs insert failed, saved locally:', error.message);
      } else if (data) {
        // Replace temporary entry id with DB id
        const idx = updatedList.findIndex((item) => item.id === newEntry.id);
        if (idx !== -1) {
          updatedList[idx] = data;
          saveLocalMissingSongs(updatedList);
        }
      }
    } catch (err) {
      console.warn('Supabase missing_songs request error, saved locally:', err.message);
    }
  }

  return { entry: newEntry, list: updatedList };
}

/**
 * Delete a missing song from Supabase and LocalStorage.
 */
export async function deleteMissingSong(idOrKeyword) {
  const localList = getLocalMissingSongs();
  const target = localList.find((item) => item.id === idOrKeyword || item.keyword === idOrKeyword);
  const filtered = localList.filter((item) => item.id !== idOrKeyword && item.keyword !== idOrKeyword);
  saveLocalMissingSongs(filtered);

  if (isSupabaseConfigured && supabase) {
    try {
      if (target && target.id && !String(target.id).startsWith('missing-')) {
        await supabase.from('missing_songs').delete().eq('id', target.id);
      } else if (target && target.keyword) {
        await supabase.from('missing_songs').delete().eq('keyword', target.keyword);
      } else {
        await supabase.from('missing_songs').delete().eq('id', idOrKeyword);
      }
    } catch (err) {
      console.warn('Supabase missing_songs delete error:', err.message);
    }
  }

  return filtered;
}
