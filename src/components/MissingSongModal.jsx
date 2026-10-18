import { useState, useEffect, useRef } from 'react';
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
  Cloud
} from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

export default function MissingSongModal({
  open,
  initialKeyword = '',
  missingList = [],
  onClose,
  onAddMissing,
  onDeleteMissing,
}) {
  const [keyword, setKeyword] = useState('');
  const [notes, setNotes] = useState('');
  const [justAdded, setJustAdded] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setKeyword(initialKeyword ? initialKeyword.trim() : '');
      setNotes('');
      setJustAdded(null);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [open, initialKeyword]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const val = keyword.trim();
    if (!val || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onAddMissing(val, notes.trim());
      setJustAdded(val);
      setKeyword('');
      setNotes('');
      setTimeout(() => {
        setJustAdded(null);
      }, 3500);
    } catch (err) {
      console.error('Failed to report missing song:', err);
    } finally {
      setIsSubmitting(false);
    }
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
        className="relative w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-slate-200 bg-white shadow-2xl text-slate-900 flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in fade-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Indicator */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="h-1.5 w-12 rounded-full bg-slate-200" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 pt-3 sm:pt-5 pb-3 border-b border-slate-100">
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
                    <span>Supabase Sync</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Report searched songs to add them to the church book
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Quick Notification Toast when song was just added */}
          {justAdded && (
            <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-50 border border-emerald-200/90 p-3 text-xs font-bold text-emerald-900 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div className="flex-1">
                <span className="font-extrabold">"{justAdded}"</span> added to missing songs list!
              </div>
            </div>
          )}

          {/* Report Form */}
          <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                <span>Report Missing Song / Search Word</span>
              </label>
              {initialKeyword && initialKeyword === keyword && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
                  From search bar
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

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={!keyword.trim() || isSubmitting}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-black text-white hover:bg-amber-700 disabled:opacity-40 shadow-sm shadow-amber-600/20 transition active:scale-98"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSubmitting ? 'Saving...' : 'Add to Missing Song List'}</span>
              </button>
            </div>
          </form>

          {/* Missing Song List Header */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Reported Missing Songs
                </h4>
                <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-black text-slate-700">
                  {missingList.length}
                </span>
              </div>
            </div>

            {/* List */}
            {missingList.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
                <Music className="mx-auto h-8 w-8 text-slate-300 mb-1.5" />
                <p className="text-xs font-bold text-slate-600">No missing songs reported yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Type any song or search word above to save it.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {missingList.map((item) => (
                  <div
                    key={item.id || item.keyword}
                    className="group flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-3 hover:border-amber-300 hover:shadow-xs transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60 text-xs font-bold">
                        <FileQuestion className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {item.keyword}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          {item.notes && (
                            <span className="truncate text-slate-500 max-w-[150px] sm:max-w-[200px]">
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

                    <button
                      type="button"
                      onClick={() => onDeleteMissing(item.id)}
                      className="rounded-lg p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition shrink-0 active:scale-95"
                      title="Remove from list"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-100 bg-slate-50/80 px-5 py-3 rounded-b-3xl sm:rounded-b-2xl flex items-center justify-between">
          <p className="text-[11px] text-slate-400 font-medium">
            Saved to Supabase & local storage
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
