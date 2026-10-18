import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { fetchAllSongs, createSong, bulkCreateSongs, updateSong, deleteSong } from '../lib/songs';
import { loadSeedSongs, isSeedSong } from '../lib/seed';
import { mergeSongs } from '../lib/merge';
import { verifyDeletePassword } from '../lib/deleteAuth';
import {
  fetchSongMetadata,
  saveSongMetadata,
  getLocalSongMeta,
} from '../lib/songMetadata';

const SongContext = createContext(null);

export function SongProvider({ children }) {
  // Load seeds synchronously — available immediately on first render
  const seedSongs = useMemo(() => {
    try {
      return loadSeedSongs();
    } catch (err) {
      console.error('Failed to load seed songs:', err);
      return [];
    }
  }, []);

  const [dbSongs, setDbSongs] = useState([]);
  const [songMeta, setSongMeta] = useState(() => getLocalSongMeta());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Merged array sorted by number -> title with Supabase songMeta overrides (beat, tempo, type) applied
  const songs = useMemo(() => {
    const rawList = mergeSongs(seedSongs, dbSongs);
    if (!songMeta || Object.keys(songMeta).length === 0) return rawList;

    return rawList.map((s) => {
      const override =
        (s.id && songMeta[String(s.id)]) ||
        (s.title && songMeta[s.title.trim().toLowerCase()]) ||
        null;

      if (!override) return s;

      return {
        ...s,
        beat: override.beat !== undefined && override.beat !== null ? override.beat : s.beat,
        tempo: override.tempo !== undefined && override.tempo !== null ? override.tempo : s.tempo,
        type: override.type !== undefined && override.type !== null ? override.type : s.type,
      };
    });
  }, [seedSongs, dbSongs, songMeta]);

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

    // Fetch beat, tempo, type metadata from Supabase
    fetchSongMetadata()
      .then((meta) => {
        if (meta && Object.keys(meta).length > 0) {
          setSongMeta(meta);
        }
      })
      .catch((err) => {
        console.warn('Could not load song metadata overrides:', err.message);
      });

    // Supabase Realtime subscription
    let channel;
    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel('public:songbook_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'songs' }, () => {
          loadSongs();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'missing_songs' }, () => {
          fetchSongMetadata().then((meta) => {
            if (meta) setSongMeta(meta);
          });
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

  /**
   * Update beat, tempo, and type for ANY song (both seed and DB songs),
   * persisting immediately to Supabase and local cache.
   */
  const updateSongBeatTempo = useCallback(async (songOrId, updates) => {
    let targetSong =
      typeof songOrId === 'object' && songOrId !== null
        ? songOrId
        : songs.find((s) => String(s.id) === String(songOrId));

    if (!targetSong) {
      throw new Error('Song not found');
    }

    const saved = await saveSongMetadata(targetSong, updates);

    setSongMeta((prev) => {
      const next = { ...prev };
      if (targetSong.id) next[String(targetSong.id)] = saved;
      if (targetSong.title) next[targetSong.title.trim().toLowerCase()] = saved;
      return next;
    });

    return saved;
  }, [songs]);

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
        updateSongBeatTempo,
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
