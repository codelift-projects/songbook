import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSongs } from '../store/SongContext';
import { buildIndex, parseQuery, scoreSongMatch } from '../lib/search';
import { isSeedSong } from '../lib/seed';
import { exportSongsToJson } from '../lib/export';
import DeletePasswordModal from '../components/DeletePasswordModal';
import SelectionToolbar from '../components/SelectionToolbar';
import {
  Search,
  Play,
  Music,
  X,
  SlidersHorizontal,
  Eye,
  CheckSquare,
  Square,
  Lock
} from 'lucide-react';

export default function SongList() {
  const { songs, loading, deleteMany } = useSongs();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [langFilter, setLangFilter] = useState('all'); // 'all' | 'hindi' | 'marathi' | 'english'

  // Selection & Multi-select delete state
  const [selected, setSelected] = useState(() => new Set());
  const [pendingDelete, setPendingDelete] = useState(null); // { ids: string[] } | null
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const flashToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Precompute normalised search index per song
  const indexed = useMemo(
    () => songs.map((s) => ({ song: s, index: buildIndex(s) })),
    [songs]
  );

  const parsedQuery = useMemo(() => parseQuery(search), [search]);

  // Robust Typo-Tolerant & Phonetic Search with Score Ranking
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

  const openDeleteModal = (ids) => {
    const deletable = ids.filter((id) => !String(id).startsWith('seed:'));
    if (deletable.length === 0) {
      flashToast('Selected seed songs are read-only and cannot be deleted.');
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

      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Songbook
          </h1>
          <span className="rounded-full bg-emerald-50 border border-emerald-300/80 px-2.5 py-0.5 text-xs font-bold text-emerald-800 shadow-2xs">
            {filteredSongs.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {filteredSongs.length > 0 && (
            <button
              type="button"
              onClick={toggleSelectAllFiltered}
              className="flex items-center gap-1 rounded-xl border border-slate-200/90 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-xs"
              title="Select all currently visible songs"
            >
              {isAllFilteredSelected ? (
                <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Square className="h-3.5 w-3.5 text-slate-400" />
              )}
              <span className="hidden sm:inline">Select Visible</span>
            </button>
          )}

          <Link
            to="/manage"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-xs"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
            <span>Manage Songs</span>
          </Link>
        </div>
      </div>

      {/* Search Bar and Language Filter Pills */}
      <div className="grid gap-2.5 sm:grid-cols-12">
        {/* Search Bar: No placeholder, clean subtle border, no harsh focus ring */}
        <div className="relative sm:col-span-7">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200/90 bg-white pl-10 pr-9 py-2.5 text-sm font-normal text-slate-800 focus:border-slate-400 focus:outline-none shadow-2xs transition"
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

        {/* Language Tabs */}
        <div className="flex rounded-xl border border-slate-200/90 bg-white p-1 sm:col-span-5 shadow-xs overflow-x-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'hindi', label: 'हिन्दी' },
            { id: 'marathi', label: 'मराठी' },
            { id: 'english', label: 'English' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setLangFilter(tab.id)}
              className={`flex-1 shrink-0 rounded-lg py-1.5 px-2 text-xs font-semibold transition-all duration-150 ${
                langFilter === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
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
          <h3 className="text-base font-bold text-slate-900">No songs found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search filter or clear the current filters.
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
            <Link
              to="/manage"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 transition"
            >
              <span>Go to Manage & Import</span>
            </Link>
          </div>
        </div>
      )}

      {/* High-Density Responsive Song Cards Grid */}
      {!loading && filteredSongs.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredSongs.map((song) => {
            const isSeed = isSeedSong(song);
            const isSelected = selected.has(song.id);

            return (
              <div
                key={song.id}
                className={`interactive-card group relative flex flex-col justify-between rounded-2xl border p-3.5 shadow-2xs transition-all ${
                  isSelected
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 shadow-md shadow-emerald-600/10'
                    : 'border-slate-200/90 bg-white hover:border-emerald-400 hover:shadow-md hover:shadow-emerald-600/10'
                }`}
              >
                {/* Select Checkbox (Hover or Selected or Touch) */}
                <div
                  onClick={(e) => toggleSelect(song.id, e)}
                  className={`absolute top-2.5 right-2.5 z-10 cursor-pointer p-1 rounded-lg transition-opacity ${
                    isSelected ? 'opacity-100' : 'opacity-70 sm:opacity-0 group-hover:opacity-100'
                  }`}
                  title={isSelected ? 'Deselect song' : 'Select song'}
                >
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4 text-emerald-600 bg-white rounded-xs shadow-2xs" />
                  ) : (
                    <Square className="h-4 w-4 text-slate-400 hover:text-slate-700 bg-white/80 rounded-xs" />
                  )}
                </div>

                <div
                  onClick={() => navigate(`/present/${song.id}`)}
                  className="cursor-pointer space-y-1.5 pr-5"
                >
                  {/* Badges: Lock view on the leftmost position */}
                  <div className="flex flex-wrap items-center gap-1">
                    {isSeed && (
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-slate-100 border border-slate-200/90 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 uppercase tracking-wider" title="Seed song · Read-only">
                        <Lock className="h-2.5 w-2.5 text-slate-500" />
                        <span>SEED</span>
                      </span>
                    )}
                    <span className="inline-block rounded-md bg-slate-100 border border-slate-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                      #{song.number || '•'}
                    </span>
                    <span className="rounded-md bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-800 uppercase tracking-wider">
                      {song.language === 'marathi' ? 'मराठी' : song.language === 'hindi' ? 'हिन्दी' : 'EN'}
                    </span>
                  </div>

                  {/* Song Title: clean, pleasant-to-read font weight */}
                  <h3 className="font-semibold text-xs sm:text-sm text-slate-900 group-hover:text-emerald-700 line-clamp-2 leading-snug transition-colors">
                    {song.title}
                  </h3>
                  {song.title_alt && (
                    <p className="text-[11px] text-slate-400 line-clamp-1 italic font-normal">
                      {song.title_alt}
                    </p>
                  )}
                </div>

                {/* Action Buttons: Present & View */}
                <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 gap-1.5">
                  {/* Present Button */}
                  <button
                    type="button"
                    onClick={() => navigate(`/present/${song.id}`)}
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-emerald-600 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 transition shadow-2xs"
                    title="Launch slide projector"
                  >
                    <Play className="h-3 w-3 fill-current" />
                    <span>Present</span>
                  </button>

                  {/* View (Scrollable Reader) Button */}
                  <button
                    type="button"
                    onClick={() => navigate(`/view/${song.id}`)}
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition"
                    title="View full scrollable lyrics"
                  >
                    <Eye className="h-3 w-3 text-slate-500" />
                    <span>View</span>
                  </button>
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

      {/* Password-Protected Delete Modal */}
      <DeletePasswordModal
        open={Boolean(pendingDelete)}
        count={pendingDelete?.ids?.length || 0}
        busy={deleteBusy}
        error={deleteError}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
