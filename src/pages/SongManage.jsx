import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSongs } from '../store/SongContext';
import { buildIndex, parseQuery, scoreSongMatch } from '../lib/search';
import { exportSongsToJson } from '../lib/export';
import { isSeedSong } from '../lib/seed';
import SongImportModal from '../components/SongImportModal';
import DeletePasswordModal from '../components/DeletePasswordModal';
import SelectionToolbar from '../components/SelectionToolbar';
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
  Lock
} from 'lucide-react';

export default function SongManage() {
  const { songs, loading, addBulkSongs, deleteMany } = useSongs();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [langFilter, setLangFilter] = useState('all'); // 'all' | 'hindi' | 'marathi' | 'english'
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

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
          <p className="text-xs text-slate-500 mt-0.5 font-normal">
            Add, edit, export backup, or manage library songs.
          </p>
        </div>

        {/* Management Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300/90 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition shadow-xs"
            title="Import songs from JSON or text"
          >
            <Upload className="h-3.5 w-3.5 text-emerald-600" />
            <span>Import JSON</span>
          </button>

          <button
            type="button"
            onClick={() => exportSongsToJson(songs)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300/90 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition shadow-xs"
            title="Export all songs as backup JSON"
          >
            <Download className="h-3.5 w-3.5 text-slate-600" />
            <span>Backup All</span>
          </button>

          <Link
            to="/songs/new"
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/25 transition"
          >
            <Plus className="h-4 w-4" />
            <span>+ New Song</span>
          </Link>
        </div>
      </div>

      {/* Search Input and Language Filter */}
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

      {/* Management Song List Table */}
      {!loading && filteredSongs.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
          <div className="divide-y divide-slate-100">
            {filteredSongs.map((song) => {
              const isSeed = isSeedSong(song);
              const isSelected = selected.has(song.id);
              const stanzaCount = (song.stanzas || []).length;

              return (
                <div
                  key={song.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 transition duration-150 ${
                    isSelected ? 'bg-emerald-50/30' : 'hover:bg-slate-50/90'
                  }`}
                >
                  {/* Left info: Lock view on the leftmost position */}
                  <div className="flex items-start gap-2.5 min-w-0">
                    {/* Leftmost: Lock badge if Seed, or Checkbox if DB */}
                    {isSeed ? (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-slate-100 border border-slate-200/90 px-2 py-1 text-xs font-semibold text-slate-600 shadow-2xs" title="Seed song · Read-only">
                        <Lock className="h-3 w-3 text-slate-500" />
                        <span>SEED</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => toggleSelect(song.id, e)}
                        className="shrink-0 mt-1 text-slate-400 hover:text-slate-700 transition"
                        title={isSelected ? 'Deselect song' : 'Select song'}
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-400" />
                        )}
                      </button>
                    )}

                    <span className="shrink-0 inline-flex items-center justify-center rounded-xl bg-slate-100 border border-slate-200/80 px-2 py-1 text-xs font-semibold text-slate-700 min-w-8 text-center shadow-2xs">
                      #{song.number || '•'}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm sm:text-base text-slate-900 truncate">
                          {song.title}
                        </h3>
                        <span className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 uppercase border border-emerald-200/60">
                          {song.language === 'marathi' ? 'मराठी' : song.language === 'hindi' ? 'हिन्दी' : 'English'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5 font-normal">
                        {song.title_alt && (
                          <span className="italic truncate max-w-xs">{song.title_alt}</span>
                        )}
                        <span>{stanzaCount} stanza{stanzaCount === 1 ? '' : 's'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Action buttons */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                    {/* Project / Present Button */}
                    <button
                      type="button"
                      onClick={() => navigate(`/present/${song.id}`)}
                      className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-2xs transition"
                      title="Launch live slide projector"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      <span>Project</span>
                    </button>

                    {/* View (Scrollable Reader) Button */}
                    <button
                      type="button"
                      onClick={() => navigate(`/view/${song.id}`)}
                      className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs"
                      title="View full scrollable lyrics"
                    >
                      <Eye className="h-3.5 w-3.5 text-slate-500" />
                      <span>View</span>
                    </button>

                    {/* Edit Button (hidden or disabled for seed) */}
                    {isSeed ? (
                      <Link
                        to={`/songs/${song.id}/edit`}
                        className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 transition shadow-2xs"
                        title="View seed song or duplicate"
                      >
                        <Lock className="h-3.5 w-3.5 text-slate-400" />
                        <span className="hidden xs:inline">Locked</span>
                      </Link>
                    ) : (
                      <Link
                        to={`/songs/${song.id}/edit`}
                        className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs"
                        title="Edit song lyrics & stanzas"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-slate-600" />
                        <span className="hidden xs:inline">Edit</span>
                      </Link>
                    )}

                    {/* Delete Button (hidden for seed songs, password protected for DB songs) */}
                    {!isSeed && (
                      <button
                        type="button"
                        onClick={() => openDeleteModal([song.id])}
                        className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/50 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition"
                        title="Delete song from songbook (password protected)"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                        <span className="hidden xs:inline">Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
    </div>
  );
}
