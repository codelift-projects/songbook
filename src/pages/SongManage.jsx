import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSongs } from '../store/SongContext';
import { buildIndex, parseQuery, scoreSongMatch } from '../lib/search';
import { exportSongsToJson } from '../lib/export';
import { isSeedSong } from '../lib/seed';
import { fetchMissingSongs, addMissingSong, deleteMissingSong } from '../lib/missingSongs';
import SongImportModal from '../components/SongImportModal';
import SongExportModal from '../components/SongExportModal';
import DeletePasswordModal from '../components/DeletePasswordModal';
import SelectionToolbar from '../components/SelectionToolbar';
import MissingSongModal from '../components/MissingSongModal';
import BeatTempoModal from '../components/BeatTempoModal';
import {
  isManageAuthenticated,
  verifyManagePassword,
  saveManagePassword,
  clearManagePassword,
} from '../lib/manageAuth';
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
  EyeOff,
  CheckSquare,
  Square,
  Lock,
  FileQuestion,
  Activity,
} from 'lucide-react';

export default function SongManage() {
  const { songs, loading, addBulkSongs, deleteMany, updateSongBeatTempo } = useSongs();
  const navigate = useNavigate();

  // Manage Authentication Gate
  const [isAuthenticated, setIsAuthenticated] = useState(() => isManageAuthenticated());
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handlePasswordSubmit = (e) => {
    if (e) e.preventDefault();
    if (verifyManagePassword(passwordInput)) {
      saveManagePassword(passwordInput);
      setIsAuthenticated(true);
      setPasswordError('');
      setPasswordInput('');
    } else {
      setPasswordError('Incorrect password. Please try again.');
    }
  };

  const handleLock = () => {
    clearManagePassword();
    setIsAuthenticated(false);
    setPasswordInput('');
    setPasswordError('');
  };

  const [search, setSearch] = useState('');
  const [langFilter, setLangFilter] = useState('all'); // 'all' | 'hindi' | 'marathi' | 'english'
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'worship' | 'praise'
  const [beatFilter, setBeatFilter] = useState('all'); // 'all' | '13' | '31' | '37' | '49' | '55' | '68' | 'NA'
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [editingBeatTempoSong, setEditingBeatTempoSong] = useState(null);

  const searchInputRef = useRef(null);

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
        if (langFilter !== 'all' && song.language !== langFilter && song.language !== 'bilingual') return false;
        if (typeFilter !== 'all') {
          const sType = (song.type || 'worship').toLowerCase().trim();
          if (sType !== typeFilter) return false;
        }
        if (beatFilter !== 'all') {
          const rawBeat = String(song.beat || '').trim();
          if (beatFilter === 'NA') {
            const isNa = !rawBeat || rawBeat.toUpperCase() === 'NA' || rawBeat === '-' || rawBeat.toLowerCase() === 'none';
            if (!isNa) return false;
          } else {
            const bLower = rawBeat.toLowerCase();
            const target = beatFilter.toLowerCase();
            const matches = bLower === target || bLower.split(/[\s,/-]+/).includes(target) || bLower.includes(target);
            if (!matches) return false;
          }
        }
        return score > 0;
      })
      .sort((a, b) => {
        if (parsedQuery.raw) return b.score - a.score;
        return (a.song.number || 0) - (b.song.number || 0);
      })
      .map((x) => x.song);
  }, [indexed, parsedQuery, langFilter, typeFilter, beatFilter]);

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
    if (importedSongs.length === 1) {
      navigate('/songs/new', { state: importedSongs[0] });
      return;
    }
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xl shadow-slate-200/40 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="mx-auto mb-3.5 grid h-13 w-13 place-items-center rounded-2xl bg-emerald-50 border border-emerald-100/80 text-emerald-600 shadow-2xs">
            <Lock className="h-6 w-6" />
          </div>

          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Manage Songs Locked
          </h2>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Enter admin password to access song management.
          </p>

          <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-3.5">
            <div className="relative text-left">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  autoFocus
                  placeholder="Enter password"
                  autoComplete="current-password"
                  className={`w-full rounded-xl border px-3 py-2 text-sm font-semibold transition focus:outline-none pr-9 ${
                    passwordError
                      ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-2 focus:ring-rose-400'
                      : 'border-slate-200 bg-slate-50/50 text-slate-900 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordError && (
                <p className="mt-1.5 text-xs font-semibold text-rose-600 animate-in fade-in">
                  {passwordError}
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-1/2 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition active:scale-95 shadow-2xs"
              >
                Back to Songs
              </button>
              <button
                type="submit"
                className="w-1/2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2 text-xs font-black transition active:scale-95 shadow-sm shadow-emerald-600/20"
              >
                Unlock
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

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

      {/* Top 4 Action Buttons in a Single Line + Quick Lock button */}
      <div className="flex items-center gap-1.5 w-full">
        <div className="grid grid-cols-4 gap-1.5 flex-1 min-w-0">
          <Link
            to="/songs/new"
            className="flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-1 text-center text-xs font-bold transition shadow-xs active:scale-95 truncate"
          >
            New Song
          </Link>

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center justify-center rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 py-2 px-1 text-center text-xs font-bold transition shadow-2xs active:scale-95 truncate"
          >
            Import
          </button>

          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center justify-center rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 py-2 px-1 text-center text-xs font-bold transition shadow-2xs active:scale-95 truncate"
          >
            Export
          </button>

          <button
            type="button"
            onClick={() => setIsMissingModalOpen(true)}
            className="flex items-center justify-center rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 py-2 px-1 text-center text-xs font-bold transition shadow-2xs active:scale-95 truncate"
          >
            Missing ({missingSongs.length})
          </button>
        </div>

        <button
          type="button"
          onClick={handleLock}
          className="shrink-0 rounded-xl border border-slate-200/90 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-400 p-2 transition shadow-2xs active:scale-95"
          title="Lock Manage page and sign out"
          aria-label="Lock Manage page"
        >
          <Lock className="h-4 w-4" />
        </button>
      </div>

      {/* Search Input & Select All */}
      <div className="space-y-2.5 w-full max-w-full">
        <div className="flex items-center gap-2 w-full">
          {/* Search bar with active filter badges inside */}
          <div className="relative flex-1 flex items-center flex-wrap gap-1.5 min-w-0 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 shadow-2xs transition min-h-[44px]">
            <Search className="h-4 w-4 text-slate-400 shrink-0 mr-0.5 pointer-events-none" />

            {/* Active Filter Badges (inside search bar) */}
            {langFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 pl-2 pr-1 py-0.5 text-xs font-bold animate-in fade-in zoom-in-95">
                <span>{langFilter === 'hindi' ? 'हिन्दी' : langFilter === 'marathi' ? 'मराठी' : 'English'}</span>
                <button
                  type="button"
                  onClick={() => setLangFilter('all')}
                  className="text-emerald-700 hover:text-emerald-950 rounded p-0.5 hover:bg-emerald-200/60 transition"
                  title="Remove language filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {typeFilter !== 'all' && (
              <span className={`inline-flex items-center gap-1 rounded-lg pl-2 pr-1 py-0.5 text-xs font-bold animate-in fade-in zoom-in-95 border ${
                typeFilter === 'carol'
                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                  : typeFilter === 'praise'
                    ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}>
                <span className="capitalize">{typeFilter}</span>
                <button
                  type="button"
                  onClick={() => setTypeFilter('all')}
                  className="rounded p-0.5 hover:bg-black/10 transition"
                  title="Remove type filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {beatFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-300 pl-2 pr-1 py-0.5 text-xs font-bold animate-in fade-in zoom-in-95">
                <span>Beat: {beatFilter}</span>
                <button
                  type="button"
                  onClick={() => setBeatFilter('all')}
                  className="text-slate-600 hover:text-slate-900 rounded p-0.5 hover:bg-slate-200 transition"
                  title="Remove beat filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                langFilter !== 'all' || typeFilter !== 'all' || beatFilter !== 'all'
                  ? "Filter active · search within results..."
                  : "Search songs to manage, edit, or delete..."
              }
              className="flex-1 min-w-[130px] bg-transparent py-1 text-sm font-normal text-slate-800 focus:outline-none"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {filteredSongs.length > 0 && (
            <button
              type="button"
              onClick={toggleSelectAllFiltered}
              className="shrink-0 flex items-center gap-1 rounded-xl border border-slate-200/90 bg-white px-2.5 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-xs"
              title={isAllFilteredSelected ? "Deselect all visible" : "Select all visible"}
            >
              {isAllFilteredSelected ? (
                <CheckSquare className="h-4 w-4 text-emerald-600" />
              ) : (
                <Square className="h-4 w-4 text-slate-400" />
              )}
            </button>
          )}
        </div>

        {/* Prebuilt Quick Filters Strip: Language | Worship/Praise | Beats (13, 31, 37, 49, 55, 68, NA) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 select-none text-xs">
          {/* Language Group */}
          <div className="flex items-center rounded-xl border border-slate-200/90 bg-white p-1 shadow-2xs shrink-0">
            {[
              { id: 'all', label: 'All' },
              { id: 'hindi', label: 'हिन्दी' },
              { id: 'marathi', label: 'मराठी' },
              { id: 'english', label: 'English' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setLangFilter(tab.id)}
                className={`shrink-0 rounded-lg py-1 px-2.5 text-xs font-bold transition-all ${
                  langFilter === tab.id
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-200/80 shrink-0 mx-0.5" />

          {/* Type of Song: Worship / Praise / Carol */}
          <div className="flex items-center rounded-xl border border-slate-200/90 bg-white p-1 shadow-2xs shrink-0">
            {[
              { id: 'worship', label: 'Worship' },
              { id: 'praise', label: 'Praise' },
              { id: 'carol', label: 'Carol' },
            ].map((tab) => {
              const active = typeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTypeFilter((prev) => (prev === tab.id ? 'all' : tab.id))}
                  className={`shrink-0 rounded-lg py-1 px-2.5 text-xs font-bold transition-all ${
                    active
                      ? tab.id === 'praise'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : tab.id === 'carol'
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                  title={active ? `Filter active: ${tab.label}. Click to unselect` : `Filter by ${tab.label}`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="h-4 w-px bg-slate-200/80 shrink-0 mx-0.5" />

          {/* Beats: 13, 31, 37, 49, 55, 68, NA */}
          <div className="flex items-center rounded-xl border border-slate-200/90 bg-white p-1 shadow-2xs shrink-0">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 px-1.5 tracking-wider hidden sm:inline">
              Beat:
            </span>
            {['13', '31', '37', '49', '55', '68', 'NA'].map((b) => {
              const active = beatFilter === b;
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBeatFilter((prev) => (prev === b ? 'all' : b))}
                  className={`shrink-0 rounded-lg py-1 px-2 text-xs font-bold transition-all ${
                    active
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                  title={active ? `Beat ${b} active. Click to unselect` : `Filter by beat ${b}`}
                >
                  {b}
                </button>
              );
            })}
          </div>

          {/* Reset Filters button */}
          {(langFilter !== 'all' || typeFilter !== 'all' || beatFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setLangFilter('all');
                setTypeFilter('all');
                setBeatFilter('all');
              }}
              className="flex items-center gap-1 shrink-0 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 px-2.5 py-1.5 text-xs font-bold transition active:scale-95 shadow-2xs"
              title="Reset all filters"
            >
              <X className="h-3 w-3" />
              <span>Reset</span>
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
                onClick={() => navigate(`/songs/${song.id}/edit`)}
                className={`group flex items-center justify-between gap-3 px-3.5 py-3 sm:px-5 sm:py-3.5 transition-colors cursor-pointer ${isSelected ? 'bg-emerald-50/40' : 'hover:bg-slate-50/90 active:bg-slate-100/80'
                  }`}
              >
                {/* Left: Selection check/lock, Title, Type & Tempo Badges */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Selection Checkbox */}
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

                  {/* Song Title (Clean & Simple) */}
                  <span className="font-semibold text-sm sm:text-base text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                    {song.title}
                  </span>

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

                {/* Right: Clean, uncluttered edit icon */}
                <div className="shrink-0 flex items-center pr-1 text-slate-400 group-hover:text-emerald-600 transition">
                  <Edit3 className="h-3.5 w-3.5" />
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

      {/* Song Export Modal */}
      <SongExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        songs={songs}
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
