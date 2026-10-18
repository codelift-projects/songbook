import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSongs } from '../store/SongContext';
import { buildIndex, parseQuery, scoreSongMatch } from '../lib/search';
import { exportSongsToJson } from '../lib/export';
import { isSeedSong } from '../lib/seed';
import { fetchMissingSongs, addMissingSong, deleteMissingSong } from '../lib/missingSongs';
import SongImportModal from '../components/SongImportModal';
import DeletePasswordModal from '../components/DeletePasswordModal';
import SelectionToolbar from '../components/SelectionToolbar';
import MissingSongModal from '../components/MissingSongModal';
import BeatTempoModal from '../components/BeatTempoModal';
import {
  Search,
  Play,
  Edit3,
  Plus,
  Download,
  Upload,
  Music,
  Trash2,
  X,
  SlidersHorizontal,
  Eye,
  CheckSquare,
  Square,
  Lock,
  FileQuestion,
  Activity
} from 'lucide-react';

export default function SongManage() {
  const { songs, loading, addBulkSongs, deleteMany, updateSongBeatTempo } = useSongs();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [langFilter, setLangFilter] = useState('all'); // 'all' | 'hindi' | 'marathi' | 'english'
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingBeatTempoSong, setEditingBeatTempoSong] = useState(null);

  // Missing songs state
  const [missingSongs, setMissingSongs] = useState([]);
  const [isMissingModalOpen, setIsMissingModalOpen] = useState(false);

  useEffect(() => {
    fetchMissingSongs()
      .then((list) => {
        if (Array.isArray(list)) setMissingSongs(list);
      })
      .catch((err) => {
        console.warn('Could not load missing songs from Supabase:', err.message);
      });
  }, []);

  const handleAddMissing = async (keyword, notes) => {
    try {
      const { list } = await addMissingSong(keyword, notes);
      setMissingSongs(list);
      flashToast('Missing song saved to Supabase!');
    } catch (err) {
      flashToast(err.message || 'Failed to save to Supabase');
      throw err;
    }
  };

  const handleDeleteMissing = async (id) => {
    try {
      const updated = await deleteMissingSong(id);
      setMissingSongs(updated);
      flashToast('Song removed from Supabase');
    } catch (err) {
      flashToast(err.message || 'Failed to delete from Supabase');
      throw err;
    }
  };

  // Selection & Protected Delete state
  const [selected, setSelected] = useState(() => new Set());
  const [pendingDelete, setPendingDelete] = useState(null); // { ids: string[] } | null
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const flashToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleSaveBeatTempo = async (updates) => {
    if (!editingBeatTempoSong) return;
    try {
      await updateSongBeatTempo(editingBeatTempoSong, updates);
      flashToast('Beat & tempo saved to Supabase!');
    } catch (err) {
      flashToast(err.message || 'Error updating beat & tempo');
      throw err;
    }
  };

  // Precompute normalised search index per song
  const indexed = useMemo(
    () => songs.map((s) => ({ song: s, index: buildIndex(s) })),
    [songs]
  );

  const parsedQuery = useMemo(() => parseQuery(search), [search]);

  // Filtered & Ranked Songs
  const filteredSongs = useMemo(() => {
    return indexed
      .map(({ song, index }) => ({
        song,
        score: scoreSongMatch(index, parsedQuery),
      }))
      .filter(({ song, score }) => {
        if (langFilter !== 'all' && song.language !== langFilter) return false;
        return score > 0;
      })
      .sort((a, b) => {
        if (parsedQuery.raw) return b.score - a.score;
        return (a.song.number || 0) - (b.song.number || 0);
      })
      .map((x) => x.song);
  }, [indexed, parsedQuery, langFilter]);

  // Multi-select handlers
  const toggleSelect = (id, e) => {
    if (e) e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isAllFilteredSelected = useMemo(() => {
    if (filteredSongs.length === 0) return false;
    return filteredSongs.every((s) => selected.has(s.id));
  }, [filteredSongs, selected]);

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filteredSongs.forEach((s) => next.delete(s.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filteredSongs.forEach((s) => next.add(s.id));
        return next;
      });
    }
  };

  const selectedCount = selected.size;
  const deletableCount = useMemo(() => {
    let count = 0;
    for (const id of selected) {
      if (!String(id).startsWith('seed:')) count++;
    }
    return count;
  }, [selected]);

  const handleExportSelected = () => {
    const selectedSongs = songs.filter((s) => selected.has(s.id));
    if (selectedSongs.length === 0) return;
    exportSongsToJson(selectedSongs);
  };

  const handleBulkImport = async (importedSongs) => {
    if (!importedSongs || importedSongs.length === 0) return;
    await addBulkSongs(importedSongs);
    flashToast(`Successfully imported ${importedSongs.length} song(s)!`);
  };

  const openDeleteModal = (ids) => {
    const deletable = ids.filter((id) => !String(id).startsWith('seed:'));
    if (deletable.length === 0) {
      flashToast('Seed songs cannot be deleted.');
      return;
    }
    setDeleteError('');
    setPendingDelete({ ids: deletable });
  };

  const confirmDelete = async (password) => {
    if (!pendingDelete) return;
    setDeleteBusy(true);
    setDeleteError('');
    try {
      const { deleted, failed, skipped } = await deleteMany(pendingDelete.ids, password);
      setPendingDelete(null);
      setSelected((prev) => {
        const next = new Set(prev);
        deleted.forEach((id) => next.delete(id));
        return next;
      });

      const parts = [`Deleted ${deleted.length} song${deleted.length === 1 ? '' : 's'}`];
      if (failed.length) parts.push(`${failed.length} failed`);
      if (skipped) parts.push(`${skipped} seed locked`);
      flashToast(parts.join(' · '));
    } catch (e) {
      setDeleteError(
        e.code === 'NOT_CONFIGURED'
          ? 'Delete is not configured. Ask an administrator.'
          : e.code === 'BAD_PASSWORD'
            ? 'Incorrect password.'
            : e.message
      );
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 inset-x-0 z-50 flex justify-center px-4 pointer-events-none animate-in fade-in slide-in-from-top-2">
          <div className="pointer-events-auto rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xl shadow-slate-900/20">
            {toastMessage}
          </div>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3.5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Manage Songs
            </h1>
            <span className="rounded-full bg-emerald-50 border border-emerald-300/80 px-2.5 py-0.5 text-xs font-bold text-emerald-800 shadow-2xs">
              {filteredSongs.length} of {songs.length}
            </span>
          </div>
        </div>
      </div>

      {/* Missing Songs Alert Banner */}
      {missingSongs.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 rounded-2xl border border-amber-200/90 bg-amber-50/70 p-3 sm:px-4 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800 border border-amber-300/60 font-black">
              <FileQuestion className="h-4 w-4" />
            </span>
            <p className="text-amber-950 font-medium truncate">
              <strong className="font-bold text-amber-900">{missingSongs.length}</strong> missing song{missingSongs.length === 1 ? '' : 's'} reported from search queries
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsMissingModalOpen(true)}
            className="self-end sm:self-auto rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition active:scale-95 shadow-2xs"
          >
            View &amp; Remove ({missingSongs.length})
          </button>
        </div>
      )}

      {/* Search Input and Language Filter */}
      <div className="grid gap-2.5 sm:grid-cols-12">
        {/* Search Bar: No placeholder, clean subtle border, no harsh focus ring */}
        <div className="relative sm:col-span-7">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search songs to manage, edit, or delete..."
            className="w-full rounded-xl border border-slate-200/90 bg-white pl-10 pr-9 py-2.5 text-sm font-normal text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none shadow-2xs transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Language Tabs & Select Visible */}
        <div className="flex items-center gap-2 sm:col-span-5">
          <div className="flex-1 flex rounded-xl border border-slate-200/90 bg-white p-1 shadow-xs overflow-x-auto">
            {[
              { id: 'all', label: 'All' },
              { id: 'hindi', label: 'हिन्दी' },
              { id: 'marathi', label: 'मराठी' },
              { id: 'english', label: 'English' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setLangFilter(tab.id)}
                className={`flex-1 shrink-0 rounded-lg py-1.5 px-2 text-xs font-semibold transition-all duration-150 ${langFilter === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {filteredSongs.length > 0 && (
            <button
              type="button"
              onClick={toggleSelectAllFiltered}
              className="shrink-0 flex items-center gap-1 rounded-xl border border-slate-200/90 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-xs"
              title="Select all filtered songs"
            >
              {isAllFilteredSelected ? (
                <CheckSquare className="h-4 w-4 text-emerald-600" />
              ) : (
                <Square className="h-4 w-4 text-slate-400" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="grid place-items-center py-16 text-slate-500">
          <div className="flex flex-col items-center gap-2.5">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent"></div>
            <p className="text-xs font-medium text-slate-600">Loading songs...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredSongs.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-10 text-center shadow-xs">
          <Music className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-900">No songs found in manage list</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search filter or import new songs into your library.
          </p>
          <div className="mt-4 flex justify-center gap-2.5">
            {(search || langFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setLangFilter('all');
                }}
                className="inline-flex items-center rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
              >
                Clear Filters
              </button>
            )}
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 transition"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Import Songs</span>
            </button>
          </div>
        </div>
      )}

      {/* Management Song List - Simple & Clean Like Song List */}
      {!loading && filteredSongs.length > 0 && (
        <div className="flex flex-col divide-y divide-slate-100 rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs w-full max-w-full">
          {filteredSongs.map((song) => {
            const isSeed = isSeedSong(song);
            const isSelected = selected.has(song.id);

            return (
              <div
                key={song.id}
                onClick={() => navigate(isSeed ? `/view/${song.id}` : `/songs/${song.id}/edit`)}
                className={`group flex items-center justify-between gap-3 px-3.5 py-3 sm:px-5 sm:py-3.5 transition-colors cursor-pointer ${isSelected ? 'bg-emerald-50/40' : 'hover:bg-slate-50/90 active:bg-slate-100/80'
                  }`}
              >
                {/* Left: Selection check/lock, Title, Type & Tempo Badges */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Selection Checkbox (DB songs only) */}
                  {!isSeed && (
                    <div className="shrink-0 flex items-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => toggleSelect(song.id, e)}
                        className="text-slate-400 hover:text-emerald-600 transition p-0.5"
                        title={isSelected ? 'Deselect song' : 'Select song'}
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-300 hover:text-slate-500" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Song Title (Clean & Simple) */}
                  <span className="font-semibold text-sm sm:text-base text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                    {song.title}
                  </span>

                  {/* Song Type Badge */}
                  {song.type && (
                    <span
                      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0 ${song.type === 'praise'
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/70'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200/70'
                        }`}
                    >
                      {song.type === 'praise' ? 'Praise' : 'Worship'}
                    </span>
                  )}

                  {/* Beat & Tempo Badge (Clickable to edit & save to Supabase) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingBeatTempoSong(song);
                    }}
                    className="hidden sm:inline-flex items-center gap-1 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200/70 hover:border-slate-300 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 transition shadow-2xs cursor-pointer shrink-0"
                    title="Click to update Beat & Tempo (Saves to Supabase)"
                  >
                    {song.beat ? <span>{song.beat}</span> : <span>Set beat</span>}
                    <span>·</span>
                    {song.tempo ? <span>{song.tempo} bpm</span> : <span>Set bpm</span>}
                  </button>
                </div>

                {/* Right: Clean minimal action buttons */}
                <div className="shrink-0 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {/* Edit or Duplicate Button */}
                  {isSeed ? (
                    <Link
                      to={`/songs/${song.id}/edit`}
                      className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                      title="View / Duplicate Seed Song"
                    >
                      <Eye className="h-3 w-3 text-slate-500" />
                      <span>View</span>
                    </Link>
                  ) : (
                    <Link
                      to={`/songs/${song.id}/edit`}
                      className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition shadow-2xs active:scale-95"
                      title="Edit song lyrics & stanzas"
                    >
                      <Edit3 className="h-3 w-3" />
                      <span>Edit</span>
                    </Link>
                  )}

                  {/* Delete Button (DB songs only) */}
                  {!isSeed && (
                    <button
                      type="button"
                      onClick={() => openDeleteModal([song.id])}
                      className="flex items-center justify-center h-7 w-7 rounded-xl border border-rose-200 bg-rose-50/50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 hover:border-rose-300 transition active:scale-95 shadow-2xs"
                      title="Delete song"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Multi-Select Action Toolbar */}
      <SelectionToolbar
        count={selectedCount}
        deletableCount={deletableCount}
        onClear={() => setSelected(new Set())}
        onDelete={() => openDeleteModal([...selected])}
        onExport={handleExportSelected}
      />

      {/* Protected Delete Modal */}
      <DeletePasswordModal
        open={Boolean(pendingDelete)}
        count={pendingDelete?.ids?.length || 0}
        busy={deleteBusy}
        error={deleteError}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />

      {/* Song Import Modal */}
      <SongImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSongs={handleBulkImport}
      />

      {/* Missing Song Modal */}
      <MissingSongModal
        open={isMissingModalOpen}
        initialTab="list"
        missingList={missingSongs}
        onClose={() => setIsMissingModalOpen(false)}
        onAddMissing={handleAddMissing}
        onDeleteMissing={handleDeleteMissing}
      />

      {/* Beat & Tempo Edit Modal (Saves to Supabase) */}
      <BeatTempoModal
        open={Boolean(editingBeatTempoSong)}
        song={editingBeatTempoSong}
        onClose={() => setEditingBeatTempoSong(null)}
        onSave={handleSaveBeatTempo}
      />
    </div>
  );
}
