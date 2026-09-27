import { supabase, isSupabaseConfigured } from './supabase';

const LOCAL_STORAGE_KEY = 'church-songbook:songs:v5';

export const INITIAL_SAMPLE_SONGS = [];

export function uid() {
  return `st-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function normalizeSong(song) {
  return {
    id: song.id || `song-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    slug: song.slug || null,
    number: song.number != null && song.number !== '' ? Number(song.number) : null,
    title: song.title || '',
    title_alt: song.title_alt || null,
    language: song.language || 'hindi',
    tags: Array.isArray(song.tags) ? song.tags : [],
    stanzas: Array.isArray(song.stanzas) ? song.stanzas : [],
    source: song.source || 'db',
    created_at: song.created_at || new Date().toISOString(),
    updated_at: song.updated_at || new Date().toISOString(),
  };
}

export function getNextAutoSongNumber(existingSongs = []) {
  if (!existingSongs || existingSongs.length === 0) return 1;
  const maxNum = existingSongs.reduce((max, s) => {
    const n = typeof s.number === 'number' ? s.number : parseInt(s.number, 10);
    return !isNaN(n) && n > max ? n : max;
  }, 0);
  return maxNum + 1;
}

function getLocalSongs() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading local songs:', err);
    return [];
  }
}

function saveLocalSongs(songs) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(songs));
  } catch (err) {
    console.error('Error saving local songs:', err);
  }
}

export async function fetchAllSongs() {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .order('number', { ascending: true, nullsFirst: false })
      .order('title', { ascending: true });

    if (error) {
      console.warn('Supabase fetch failed, using local storage fallback:', error.message);
      return getLocalSongs();
    }
    saveLocalSongs(data || []);
    return data || [];
  }
  return getLocalSongs();
}

export async function createSong(songData) {
  const current = getLocalSongs();
  
  let assignedNumber = songData.number;
  if (assignedNumber == null || assignedNumber === '' || isNaN(Number(assignedNumber))) {
    assignedNumber = getNextAutoSongNumber(current);
  } else {
    assignedNumber = Number(assignedNumber);
  }

  const newSong = {
    ...songData,
    number: assignedNumber,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('songs')
      .insert([newSong])
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    newSong.id = newSong.id || `song-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const updated = [newSong, ...current].sort((a, b) => (a.number || 0) - (b.number || 0));
    saveLocalSongs(updated);
    return newSong;
  }
}

export async function bulkCreateSongs(songList) {
  if (!Array.isArray(songList) || songList.length === 0) return [];
  const current = getLocalSongs();
  let nextNum = getNextAutoSongNumber(current);

  const prepared = songList.map((item) => {
    let num = item.number;
    if (num == null || num === '' || isNaN(Number(num))) {
      num = nextNum++;
    } else {
      num = Number(num);
      if (num >= nextNum) nextNum = num + 1;
    }

    return {
      id: item.id || `song-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      number: num,
      title: item.title || 'Untitled Song',
      title_alt: item.title_alt || null,
      language: item.language || 'hindi',
      stanzas: Array.isArray(item.stanzas) ? item.stanzas : [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('songs')
      .insert(prepared)
      .select();

    if (error) {
      console.warn('Supabase bulk insert failed, fallback to local:', error.message);
      const combined = [...current, ...prepared].sort((a, b) => (a.number || 0) - (b.number || 0));
      saveLocalSongs(combined);
      return prepared;
    }
    return data || prepared;
  } else {
    const combined = [...current, ...prepared].sort((a, b) => (a.number || 0) - (b.number || 0));
    saveLocalSongs(combined);
    return prepared;
  }
}

export async function updateSong(id, songData) {
  const updates = {
    ...songData,
    number: songData.number != null ? Number(songData.number) : null,
    updated_at: new Date().toISOString()
  };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('songs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    const current = getLocalSongs();
    const index = current.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Song not found');
    const updatedSong = { ...current[index], ...updates };
    current[index] = updatedSong;
    current.sort((a, b) => (a.number || 0) - (b.number || 0));
    saveLocalSongs(current);
    return updatedSong;
  }
}

export async function deleteSong(id) {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('songs')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } else {
    const current = getLocalSongs();
    const filtered = current.filter(s => s.id !== id);
    saveLocalSongs(filtered);
  }
  return true;
}
