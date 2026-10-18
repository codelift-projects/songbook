import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { loadSeedSongs } from '../lib/seed';
import { verifyDeletePassword } from '../lib/deleteAuth';
import {
  saveSongMetadata,
  getLocalSongMeta,
} from '../lib/songMetadata';
import {
  getCachedLibrary,
  saveCachedLibrary,
  saveSongToDb,
  deleteSongFromDb,
  syncSongsFromDb,
  getLastSyncTime,
} from '../lib/songDbSync';

const SongContext = createContext(null);

export function SongProvider({ children }) {
  // Load entire song library synchronously from client cache — 0ms immediate startup, ZERO blocking calls
  const [songs, setSongs] = useState(() => {
    try {
      return getCachedLibrary();
    } catch (err) {
      console.error('Failed to load initial cached library:', err);
      return loadSeedSongs();
    }
  });

  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(() => getLastSyncTime());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Sync songs with Supabase DB.
   * Progressively tracks 0% -> 100% and updates both client cache and local React state.
   */
  const syncWithCloud = useCallback(async (silent = false) => {
    if (syncing) return;
    try {
      setSyncing(true);
      if (!silent) setSyncProgress(5);

      const freshSongs = await syncSongsFromDb((pct) => {
        setSyncProgress(pct);
      });

      if (Array.isArray(freshSongs) && freshSongs.length > 0) {
        setSongs(freshSongs);
        saveCachedLibrary(freshSongs);
      }
      setLastSyncTime(getLastSyncTime());
      setError(null);
    } catch (err) {
      console.error('Sync failed:', err);
      setError(err.message);
    } finally {
      // Hold at 100% briefly for visual delight
      setTimeout(() => {
        setSyncing(false);
        setSyncProgress(0);
      }, 600);
    }
  }, [syncing]);

  // Realtime updates from Supabase
  useEffect(() => {
    let channel;
    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel('public:songbook_realtime_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'missing_songs' }, () => {
          // Re-sync silently in background
          syncWithCloud(true);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'songs' }, () => {
          syncWithCloud(true);
        })
        .subscribe();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [syncWithCloud]);

  /**
   * Add a new song: updates client-side JSON cache immediately and persists to Supabase DB.
   */
  const addSong = useCallback(async (songData) => {
    const songId = songData.id || `song-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    // Auto-assign number if missing
    let assignedNumber = songData.number;
    if (assignedNumber == null || assignedNumber === '' || isNaN(Number(assignedNumber))) {
      const maxNum = songs.reduce((max, s) => {
        const n = typeof s.number === 'number' ? s.number : parseInt(s.number, 10);
        return !isNaN(n) && n > max ? n : max;
      }, 0);
      assignedNumber = maxNum + 1;
    } else {
      assignedNumber = Number(assignedNumber);
    }

    const newSong = {
      ...songData,
      id: songId,
      number: assignedNumber,
      source: 'db',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Immediately update client cache & state
    setSongs((prev) => {
      const next = [newSong, ...prev].sort((a, b) => {
        const an = a.number ?? Number.MAX_SAFE_INTEGER;
        const bn = b.number ?? Number.MAX_SAFE_INTEGER;
        if (an !== bn) return an - bn;
        return (a.title || '').localeCompare(b.title || '', ['hi', 'en', 'mr']);
      });
      saveCachedLibrary(next);
      return next;
    });

    // 2. Dual-save to Supabase DB
    saveSongToDb(newSong).catch((err) => {
      console.warn('Background DB save error on addSong:', err);
    });

    return newSong;
  }, [songs]);

  /**
   * Bulk add songs: updates client-side JSON cache and Supabase DB.
   */
  const addBulkSongs = useCallback(async (songList) => {
    if (!Array.isArray(songList) || songList.length === 0) return [];
    
    let maxNum = songs.reduce((max, s) => {
      const n = typeof s.number === 'number' ? s.number : parseInt(s.number, 10);
      return !isNaN(n) && n > max ? n : max;
    }, 0);

    const prepared = songList.map((item) => {
      let num = item.number;
      if (num == null || num === '' || isNaN(Number(num))) {
        num = ++maxNum;
      } else {
        num = Number(num);
        if (num > maxNum) maxNum = num;
      }

      return {
        ...item,
        id: item.id || `song-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        number: num,
        source: 'db',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    setSongs((prev) => {
      const next = [...prev, ...prepared].sort((a, b) => {
        const an = a.number ?? Number.MAX_SAFE_INTEGER;
        const bn = b.number ?? Number.MAX_SAFE_INTEGER;
        if (an !== bn) return an - bn;
        return (a.title || '').localeCompare(b.title || '', ['hi', 'en', 'mr']);
      });
      saveCachedLibrary(next);
      return next;
    });

    // Dual-save each to Supabase in background
    Promise.allSettled(prepared.map((s) => saveSongToDb(s))).catch(() => {});

    return prepared;
  }, [songs]);

  /**
   * Edit ANY song (both seed songs and user created songs).
   * Updates client-side JSON cache immediately and persists to Supabase DB.
   */
  const editSong = useCallback(async (id, songData) => {
    const songId = String(id);
    const updated = {
      ...songData,
      id: songId,
      updated_at: new Date().toISOString(),
    };

    // 1. Update client cache & state immediately
    setSongs((prev) => {
      const next = prev.map((s) => (String(s.id) === songId ? { ...s, ...updated } : s));
      next.sort((a, b) => {
        const an = a.number ?? Number.MAX_SAFE_INTEGER;
        const bn = b.number ?? Number.MAX_SAFE_INTEGER;
        if (an !== bn) return an - bn;
        return (a.title || '').localeCompare(b.title || '', ['hi', 'en', 'mr']);
      });
      saveCachedLibrary(next);
      return next;
    });

    // 2. Dual-save to Supabase DB
    await saveSongToDb(updated);

    return updated;
  }, []);

  /**
   * Remove a song: updates client-side JSON cache and Supabase DB.
   */
  const removeSong = useCallback(async (id) => {
    const songId = String(id);

    // 1. Remove from client cache
    setSongs((prev) => {
      const next = prev.filter((s) => String(s.id) !== songId);
      saveCachedLibrary(next);
      return next;
    });

    // 2. Dual-delete from Supabase DB
    await deleteSongFromDb(songId);
  }, []);

  /**
   * Bulk delete with password gate.
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

    const idSet = new Set(ids.map(String));

    // Update client cache
    setSongs((prev) => {
      const next = prev.filter((s) => !idSet.has(String(s.id)));
      saveCachedLibrary(next);
      return next;
    });

    // Remove from Supabase DB
    await Promise.allSettled(ids.map((id) => deleteSongFromDb(id)));

    return { deleted: ids, failed: [], skipped: 0 };
  }, []);

  /**
   * Update beat, tempo, and type for ANY song,
   * updating client cache and persisting to Supabase.
   */
  const updateSongBeatTempo = useCallback(async (songOrId, updates) => {
    let targetSong =
      typeof songOrId === 'object' && songOrId !== null
        ? songOrId
        : songs.find((s) => String(s.id) === String(songOrId));

    if (!targetSong) {
      throw new Error('Song not found');
    }

    const updatedSong = {
      ...targetSong,
      beat: updates.beat !== undefined ? updates.beat : targetSong.beat,
      tempo: updates.tempo !== undefined ? updates.tempo : targetSong.tempo,
      type: updates.type !== undefined ? updates.type : targetSong.type,
      updated_at: new Date().toISOString(),
    };

    // 1. Update client cache & state immediately
    setSongs((prev) => {
      const next = prev.map((s) => (String(s.id) === String(targetSong.id) ? updatedSong : s));
      saveCachedLibrary(next);
      return next;
    });

    // 2. Save metadata override & song item to Supabase DB
    try {
      await saveSongMetadata(targetSong, updates);
      await saveSongToDb(updatedSong);
    } catch (err) {
      console.warn('Error syncing beat/tempo to DB:', err);
    }

    return updatedSong;
  }, [songs]);

  return (
    <SongContext.Provider
      value={{
        songs,
        loading,
        error,
        syncing,
        syncProgress,
        lastSyncTime,
        syncWithCloud,
        refreshSongs: syncWithCloud,
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

