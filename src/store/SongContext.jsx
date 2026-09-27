import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { fetchAllSongs, createSong, bulkCreateSongs, updateSong, deleteSong } from '../lib/songs';
import { loadSeedSongs, isSeedSong } from '../lib/seed';
import { mergeSongs } from '../lib/merge';
import { verifyDeletePassword } from '../lib/deleteAuth';

const SongContext = createContext(null);

export function SongProvider({ children }) {
  // Load seeds synchronously — available immediately on first render
  const seedSongs = useMemo(() => {
    try {
      return loadSeedSongs();
    } catch (err) {
      console.error('Failed to load seed songs:', err);
      throw err;
    }
  }, []);

  const [dbSongs, setDbSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Single merged array sorted by number -> title
  const songs = useMemo(
    () => mergeSongs(seedSongs, dbSongs),
    [seedSongs, dbSongs]
  );

  const loadSongs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAllSongs();
      setDbSongs(data || []);
    } catch (err) {
      console.warn('DB songs fetch skipped or failed, using seed/local library:', err.message);
      setDbSongs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSongs();

    // Supabase Realtime subscription
    let channel;
    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel('public:songs')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'songs' }, () => {
          loadSongs();
        })
        .subscribe();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadSongs]);

  const addSong = useCallback(async (songData) => {
    if (isSeedSong(songData)) {
      throw new Error('Seed songs are read-only. Duplicate it to make your own version.');
    }
    const created = await createSong(songData);
    await loadSongs();
    return created;
  }, [loadSongs]);

  const addBulkSongs = useCallback(async (songList) => {
    const created = await bulkCreateSongs(songList);
    await loadSongs();
    return created;
  }, [loadSongs]);

  const editSong = useCallback(async (id, songData) => {
    if (String(id).startsWith('seed:') || songData?.source === 'seed') {
      throw new Error('Seed songs are read-only. Duplicate it to edit.');
    }
    const updated = await updateSong(id, songData);
    await loadSongs();
    return updated;
  }, [loadSongs]);

  const removeSong = useCallback(async (id) => {
    if (String(id).startsWith('seed:')) {
      throw new Error('Seed songs cannot be deleted.');
    }
    await deleteSong(id);
    setDbSongs((prev) => prev.filter((s) => s.id !== id));
  }, []);

  /**
   * Bulk delete with password gate.
   * Returns { deleted: string[], failed: string[], skipped: number }.
   * Throws if the password check fails.
   */
  const deleteMany = useCallback(async (ids, password) => {
    const { ok, reason } = verifyDeletePassword(password);
    if (!ok) {
      const err = new Error(
        reason === 'not_configured'
          ? 'Delete is not configured. Ask an administrator.'
          : 'Incorrect password.'
      );
      err.code = reason === 'not_configured' ? 'NOT_CONFIGURED' : 'BAD_PASSWORD';
      throw err;
    }

    const deletable = ids.filter((id) => !String(id).startsWith('seed:'));
    const skipped = ids.length - deletable.length;

    const results = await Promise.allSettled(deletable.map((id) => deleteSong(id)));
    const deleted = [];
    const failed = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') deleted.push(deletable[i]);
      else failed.push(deletable[i]);
    });

    setDbSongs((prev) => prev.filter((s) => !deleted.includes(s.id)));
    return { deleted, failed, skipped };
  }, []);

  return (
    <SongContext.Provider
      value={{
        songs,
        dbSongs,
        seedSongs,
        loading,
        error,
        refreshSongs: loadSongs,
        addSong,
        addBulkSongs,
        editSong,
        removeSong,
        deleteMany,
      }}
    >
      {children}
    </SongContext.Provider>
  );
}

export function useSongs() {
  const context = useContext(SongContext);
  if (!context) {
    throw new Error('useSongs must be used within a SongProvider');
  }
  return context;
}
