import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSongs } from '../store/SongContext';
import { buildIndex, parseQuery, scoreSongMatch } from '../lib/search';
import {
  fetchMissingSongs,
  addMissingSong,
  deleteMissingSong,
} from '../lib/missingSongs';
import { fetchIncompleteFlags, isSongIncomplete } from '../lib/songIncomplete';
import MissingSongModal from '../components/MissingSongModal';
import {
  Search,
  Music,
  X,
  Eye,
  FileQuestion,
  Plus,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const SEARCH_STORAGE_KEY = 'church-songbook:search_query';

export default function SongList() {
  const { songs, loading } = useSongs();
  const navigate = useNavigate();

  // Search state preserved in sessionStorage across song view/exit
  const [search, setSearch] = useState(() => {
    try {
      return sessionStorage.getItem(SEARCH_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  const [langFilter, setLangFilter] = useState('all'); // 'all' | 'hindi' | 'marathi' | 'english'

  // Incomplete song flags
  const [incompleteFlags, setIncompleteFlags] = useState({});

  // Missing Songs State
  const [missingSongs, setMissingSongs] = useState([]);
  const [isMissingModalOpen, setIsMissingModalOpen] = useState(false);
  const [modalKeyword, setModalKeyword] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  // Sync search state to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(SEARCH_STORAGE_KEY, search);
    } catch (e) {
      // Ignore sessionStorage errors
    }
  }, [search]);

  // Load missing songs and incomplete flags on mount
  useEffect(() => {
    fetchMissingSongs()
      .then((list) => {
        if (Array.isArray(list)) setMissingSongs(list);
      })
      .catch((err) => {
        console.warn('Could not load missing songs:', err.message);
      });

    fetchIncompleteFlags()
      .then((flags) => {
        if (flags) setIncompleteFlags(flags);
      })
      .catch((err) => {
        console.warn('Could not load incomplete flags:', err.message);
      });
  }, []);

  const handleQuickReport = async (keywordToReport) => {
    const val = String(keywordToReport || search || '').trim();
    if (!val) return;

    try {
      const { list } = await addMissingSong(val);
      setMissingSongs(list);
      setToastMessage(`"${val}" saved as requested missing song!`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error('Error reporting missing song:', err);
      setToastMessage(err.message || `Failed to save "${val}"`);
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
      setToastMessage('Song removed');
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
        if (langFilter !== 'all' && song.language !== langFilter && song.language !== 'bilingual') return false;
        return score > 0;
      })
      .sort((a, b) => {
        if (parsedQuery.raw) return b.score - a.score;
        return (a.song.number || 0) - (b.song.number || 0);
      })
      .map((x) => x.song);
  }, [indexed, parsedQuery, langFilter]);

  return (
    <div className="space-y-3.5 pb-20 w-full max-w-full overflow-x-hidden">
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

      {/* Search Bar and Language Filter Pills - Clean and No Top Bar Clutter */}
      <div className="grid gap-2.5 sm:grid-cols-12 w-full max-w-full">
        {/* Search Bar */}
        <div className="relative sm:col-span-7 min-w-0 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search songs by title or lyrics..."
            className="w-full rounded-xl border border-slate-200/90 bg-white pl-10 pr-24 sm:pr-28 py-2.5 text-sm font-normal text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none shadow-2xs transition"
          />

          {/* Action buttons inside search bar */}
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
                onClick={() => {
                  setSearch('');
                  try {
                    sessionStorage.removeItem(SEARCH_STORAGE_KEY);
                  } catch (e) {}
                }}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Language Tabs */}
        <div className="flex rounded-xl border border-slate-200/90 bg-white p-1 sm:col-span-5 shadow-xs overflow-x-auto min-w-0 max-w-full">
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
                  try {
                    sessionStorage.removeItem(SEARCH_STORAGE_KEY);
                  } catch (e) {}
                  setLangFilter('all');
                }}
                className="inline-flex items-center rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
              >
                Clear Filters
              </button>
            )}
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

      {/* Pure, Uncluttered Clean List View (No cards, only View button, no seed/number/lang/english clutter) */}
      {!loading && filteredSongs.length > 0 && (
        <div className="flex flex-col divide-y divide-slate-100 rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs w-full max-w-full">
          {filteredSongs.map((song) => {
            const needsEdit = isSongIncomplete(song, incompleteFlags);

            return (
              <div
                key={song.id}
                onClick={() => navigate(`/view/${song.id}`)}
                className="group flex items-center justify-between gap-3 px-3.5 py-3 sm:px-5 sm:py-3.5 hover:bg-slate-50/90 active:bg-slate-100/80 transition-colors cursor-pointer"
              >
                {/* Song Title (Clean & Simple) */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="font-semibold text-sm sm:text-base text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                    {song.title}
                  </span>

                  {needsEdit && (
                    <span 
                      className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 shrink-0"
                      title="This song is marked as requiring edit / incomplete"
                    >
                      <AlertCircle className="h-3 w-3 text-amber-600" />
                      <span>Needs Edit</span>
                    </span>
                  )}
                </div>

                {/* Only View Button (No Present button on list) */}
                <div className="shrink-0 flex items-center" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => navigate(`/view/${song.id}`)}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition shadow-2xs active:scale-95"
                    title="View song lyrics"
                  >
                    <Eye className="h-3.5 w-3.5" />
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
