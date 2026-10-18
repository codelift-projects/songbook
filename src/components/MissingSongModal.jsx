import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileQuestion, 
  X, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Sparkles,
  Music,
  Clock,
  Send,
  Cloud,
  Search,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

export default function MissingSongModal({
  open,
  initialKeyword = '',
  initialTab = 'report', // 'report' | 'list'
  missingList = [],
  onClose,
  onAddMissing,
  onDeleteMissing,
}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('report');
  const [keyword, setKeyword] = useState('');
  const [notes, setNotes] = useState('');
  const [listSearch, setListSearch] = useState('');
  const [justAdded, setJustAdded] = useState(null);
  const [justDeleted, setJustDeleted] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      const trimmed = initialKeyword ? initialKeyword.trim() : '';
      setKeyword(trimmed);
      setNotes('');
      setListSearch('');
      setJustAdded(null);
      setJustDeleted(null);
      setErrorMessage(null);
      
      // If opened with initialTab or if list requested or if there's an initial search query
      if (initialKeyword) {
        setActiveTab('report');
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }, 100);
      } else if (initialTab === 'list' || missingList.length > 0) {
        setActiveTab(initialTab || 'list');
      } else {
        setActiveTab('report');
      }
    }
  }, [open, initialKeyword, initialTab, missingList.length]);

  // Filter missing songs inside modal
  const filteredList = useMemo(() => {
    if (!listSearch.trim()) return missingList;
    const q = listSearch.toLowerCase();
    return missingList.filter(
      (item) =>
        item.keyword.toLowerCase().includes(q) ||
        (item.notes && item.notes.toLowerCase().includes(q))
    );
  }, [missingList, listSearch]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const val = keyword.trim();
    if (!val || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await onAddMissing(val, notes.trim());
      setJustAdded(val);
      setKeyword('');
      setNotes('');
      setTimeout(() => {
        setJustAdded(null);
      }, 3500);
    } catch (err) {
      console.error('Failed to report missing song to Supabase:', err);
      setErrorMessage(err.message || 'Failed to save to Supabase');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, songKeyword, e) => {
    if (e) e.stopPropagation();
    try {
      setErrorMessage(null);
      await onDeleteMissing(id);
      setJustDeleted(songKeyword);
      setTimeout(() => {
        setJustDeleted(null);
      }, 3000);
    } catch (err) {
      console.error('Failed to delete missing song from Supabase:', err);
      setErrorMessage(err.message || 'Failed to delete from Supabase');
    }
  };

  const handleCreateSong = (songKeyword) => {
    onClose();
    navigate(`/songs/new?title=${encodeURIComponent(songKeyword)}`);
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Recently';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-4 backdrop-blur-xs select-none transition-all duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-slate-200 bg-white shadow-2xl text-slate-900 flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-in fade-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Indicator */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="h-1.5 w-12 rounded-full bg-slate-200" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 pt-3 sm:pt-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-700 shadow-2xs">
              <FileQuestion className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
                  Missing Songs
                </h3>
                {isSupabaseConfigured && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    <Cloud className="h-2.5 w-2.5 text-emerald-600" />
                    <span>Supabase</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {activeTab === 'list' ? 'View and manage missing songs list' : 'Report songs searched by users to add to library'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition active:scale-95"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-3 pb-1 border-b border-slate-100 bg-slate-50/50">
          <div className="flex rounded-xl bg-slate-200/70 p-1 text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-2 transition ${
                activeTab === 'list'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              <span>Missing List</span>
              <span className={`rounded-full px-2 py-0.2 text-[10px] font-black ${
                activeTab === 'list' ? 'bg-amber-100 text-amber-800' : 'bg-slate-300 text-slate-700'
              }`}>
                {missingList.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('report');
                setTimeout(() => inputRef.current?.focus(), 80);
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'report'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Report Missing</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Quick Notification Toasts */}
          {errorMessage && (
            <div className="flex items-center gap-2.5 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-900 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
              <div className="flex-1">
                {errorMessage}
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-400 hover:text-rose-700 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {justAdded && (
            <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-50 border border-emerald-200/90 p-3 text-xs font-bold text-emerald-900 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div className="flex-1">
                <span className="font-extrabold">"{justAdded}"</span> saved to Supabase missing songs!
              </div>
            </div>
          )}

          {justDeleted && (
            <div className="flex items-center gap-2.5 rounded-2xl bg-rose-50 border border-rose-200/90 p-3 text-xs font-bold text-rose-900 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
              <Trash2 className="h-4 w-4 text-rose-600 shrink-0" />
              <div className="flex-1">
                Removed <span className="font-extrabold">"{justDeleted}"</span> from Supabase.
              </div>
            </div>
          )}

          {/* TAB 1: REPORT FORM */}
          {activeTab === 'report' && (
            <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                  <span>Report Missing Song / Search Word</span>
                </label>
                {initialKeyword && initialKeyword === keyword && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
                    From search
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="e.g. Apna Bojh Yeshu Par Daalo or Holy Spirit"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15 shadow-2xs transition"
                  />
                </div>

                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes (artist, stanza line, language...)"
                  className="w-full rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15 shadow-2xs transition"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  View all ({missingList.length}) →
                </button>

                <button
                  type="submit"
                  disabled={!keyword.trim() || isSubmitting}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-black text-white hover:bg-amber-700 disabled:opacity-40 shadow-sm shadow-amber-600/20 transition active:scale-98"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{isSubmitting ? 'Saving...' : 'Add to Missing List'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: LIST VIEW */}
          {activeTab === 'list' && (
            <div className="space-y-3">
              {/* Optional Search inside missing list */}
              {missingList.length > 3 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={listSearch}
                    onChange={(e) => setListSearch(e.target.value)}
                    placeholder="Search in missing songs list..."
                    className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 py-2 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none shadow-2xs transition"
                  />
                  {listSearch && (
                    <button
                      type="button"
                      onClick={() => setListSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* List Container */}
              {missingList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
                  <Music className="mx-auto h-9 w-9 text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-slate-700">No missing songs reported yet</p>
                  <p className="text-xs text-slate-400 mt-0.5 max-w-xs mx-auto">
                    When you or users search for songs not in the library, report them to build your catalog.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('report')}
                    className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition shadow-2xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Report a Missing Song</span>
                  </button>
                </div>
              ) : filteredList.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                  No missing songs match "{listSearch}".
                </div>
              ) : (
                <div className="space-y-2 max-h-[50vh] sm:max-h-80 overflow-y-auto pr-0.5">
                  {filteredList.map((item) => (
                    <div
                      key={item.id || item.keyword}
                      className="group flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3 hover:border-amber-300 hover:shadow-xs transition"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200/70 text-xs font-bold">
                          <Music className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-black text-slate-900 truncate">
                            {item.keyword}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            {item.notes && (
                              <span className="truncate text-slate-500 max-w-[120px] sm:max-w-[200px]">
                                {item.notes} •
                              </span>
                            )}
                            <span className="inline-flex items-center gap-0.5 shrink-0">
                              <Clock className="h-2.5 w-2.5" />
                              <span>{formatDate(item.created_at)}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCreateSong(item.keyword)}
                          className="flex items-center gap-1 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 hover:bg-emerald-100 px-2.5 py-1.5 text-xs font-bold transition active:scale-95 shadow-2xs"
                          title="Create this song in library"
                        >
                          <Plus className="h-3 w-3" />
                          <span className="hidden sm:inline">Create</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDelete(item.id, item.keyword, e)}
                          className="rounded-xl p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition active:scale-95 flex items-center gap-1"
                          title={`Remove "${item.keyword}" from missing songs`}
                          aria-label={`Remove ${item.keyword}`}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="text-[11px] font-semibold text-rose-600 hidden sm:inline">
                            Remove
                          </span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-100 bg-slate-50/80 px-5 py-3 rounded-b-3xl sm:rounded-b-2xl flex items-center justify-between">
          <p className="text-[11px] text-slate-400 font-medium">
            Saved directly to Supabase cloud table
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs active:scale-98"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
