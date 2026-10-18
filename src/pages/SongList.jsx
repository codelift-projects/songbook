import { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSongs } from '../store/SongContext';
import { buildIndex, parseQuery, scoreSongMatch } from '../lib/search';
import { isSeedSong } from '../lib/seed';
import {
  fetchMissingSongs,
  addMissingSong,
  deleteMissingSong,
} from '../lib/missingSongs';
import MissingSongModal from '../components/MissingSongModal';
import {
  Search,
  Play,
  Music,
  X,
  SlidersHorizontal,
  Eye,
  Lock,
  FileQuestion,
  Plus,
  CheckCircle2
} from 'lucide-react';

export default function SongList() {
  const { songs, loading } = useSongs();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [langFilter, setLangFilter] = useState('all'); // 'all' | 'hindi' | 'marathi' | 'english'

  // Missing Songs State
  const [missingSongs, setMissingSongs] = useState([]);
  const [isMissingModalOpen, setIsMissingModalOpen] = useState(false);
  const [modalKeyword, setModalKeyword] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  // Load missing songs on mount from Supabase
  useEffect(() => {
    fetchMissingSongs()
      .then((list) => {
        if (Array.isArray(list)) setMissingSongs(list);
      })
      .catch((err) => {
        console.warn('Could not load missing songs from Supabase:', err.message);
      });
  }, []);

  const handleOpenMissingModal = () => {
    setModalKeyword('');
    setIsMissingModalOpen(true);
  };

  const handleQuickReport = async (keywordToReport) => {
    const val = String(keywordToReport || search || '').trim();
    if (!val) return;

    try {
      const { list } = await addMissingSong(val);
      setMissingSongs(list);
      setToastMessage(`"${val}" saved to Supabase!`);
      setTimeout(() => setToastMessage(null), 3500);
      // Only show toast, do not open popup
    } catch (err) {
      console.error('Error reporting missing song to Supabase:', err);
      setToastMessage(err.message || `Failed to save "${val}" to Supabase`);
      setTimeout(() => setToastMessage(null), 4500);
    }
  };

  const handleAddMissingFromModal = async (keyword, notes) => {
    const { list } = await addMissingSong(keyword, notes);
    setMissingSongs(list);
  };

  const handleDeleteMissingFromModal = async (id) => {
    try {
      const updated = await deleteMissingSong(id);
      setMissingSongs(updated);
      setToastMessage('Song removed from Supabase');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      setToastMessage(err.message || 'Error deleting from Supabase');
      setTimeout(() => setToastMessage(null), 4000);
      throw err;
    }
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

  return (
    <div className="space-y-4 pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 sm:top-20 right-4 left-4 sm:left-auto sm:max-w-md z-50 flex items-center gap-2.5 rounded-2xl bg-slate-900/95 text-white p-3.5 shadow-xl border border-slate-800 backdrop-blur-md text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="flex-1 truncate">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Songbook
          </h1>
          <span className="rounded-full bg-emerald-50 border border-emerald-300/80 px-2.5 py-0.5 text-xs font-bold text-emerald-800 shadow-2xs">
            {filteredSongs.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Button Near Manage Songs to View Missing Songs */}
          <button
            type="button"
            onClick={handleOpenMissingModal}
            className="flex items-center gap-1.5 rounded-xl border border-amber-200/90 bg-amber-50 hover:bg-amber-100 hover:border-amber-300 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-amber-800 transition-all shadow-2xs active:scale-95"
            title="View reported missing songs list"
          >
            <FileQuestion className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span className="hidden sm:inline">Reported Missing</span>
            <span className="sm:hidden">Missing</span>
            {missingSongs.length > 0 && (
              <span className="rounded-full bg-amber-200/90 px-1.5 py-0.2 text-[10px] font-black text-amber-900 leading-none">
                {missingSongs.length}
              </span>
            )}
          </button>

          <Link
            to="/manage"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-xs"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span className="hidden sm:inline">Manage Songs</span>
            <span className="sm:hidden">Manage</span>
          </Link>
        </div>
      </div>

      {/* Search Bar and Language Filter Pills */}
      <div className="grid gap-2.5 sm:grid-cols-12">
        {/* Search Bar */}
        <div className="relative sm:col-span-7">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, number (#5), or lyrics..."
            className="w-full rounded-xl border border-slate-200/90 bg-white pl-10 pr-24 sm:pr-28 py-2.5 text-sm font-normal text-slate-800 focus:border-slate-400 focus:outline-none shadow-2xs transition"
          />

          {/* Action buttons inside / near search bar */}
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {search.trim() && (
              <button
                type="button"
                onClick={() => handleQuickReport(search)}
                className="flex items-center gap-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 px-2 py-1 text-[11px] font-bold transition shadow-2xs active:scale-95"
                title={`Report "${search}" as missing song`}
              >
                <Plus className="h-3 w-3 text-amber-700" />
                <span>Report</span>
              </button>
            )}

            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
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
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 sm:p-10 text-center shadow-xs">
          <Music className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-900">No songs found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search
              ? `Could not find any song matching "${search}". You can report it as missing so it gets added!`
              : 'Try adjusting your search filter or clear the current filters.'}
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            {search && (
              <button
                type="button"
                onClick={() => handleQuickReport(search)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 shadow-sm shadow-amber-600/20 transition active:scale-95"
              >
                <FileQuestion className="h-4 w-4" />
                <span>Report "{search}" as Missing</span>
              </button>
            )}

            {(search || langFilter !== 'all') && (
              <button
                type="button"
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
              <span>Manage & Import</span>
            </Link>
          </div>
        </div>
      )}

      {/* Missing Song Modal Popup */}
      <MissingSongModal
        open={isMissingModalOpen}
        initialKeyword={modalKeyword}
        initialTab="list"
        missingList={missingSongs}
        onClose={() => setIsMissingModalOpen(false)}
        onAddMissing={handleAddMissingFromModal}
        onDeleteMissing={handleDeleteMissingFromModal}
      />

      {/* High-Density Responsive Song Cards Grid */}
      {!loading && filteredSongs.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredSongs.map((song) => {
            const isSeed = isSeedSong(song);

            return (
              <div
                key={song.id}
                onClick={() => navigate(`/present/${song.id}`)}
                className="interactive-card group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs transition-all hover:border-emerald-400 hover:shadow-md hover:shadow-emerald-600/10 cursor-pointer"
              >
                <div className="space-y-1.5">
                  {/* Badges */}
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

                  {/* Song Title */}
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
                <div 
                  className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
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
    </div>
  );
}
