import { Download, Trash2, X, CheckSquare, Lock } from 'lucide-react';

export default function SelectionToolbar({
  count,
  deletableCount,
  onClear,
  onDelete,
  onExport,
}) {
  if (count === 0) return null;

  const lockedCount = count - deletableCount;

  return (
    <div className="fixed bottom-16 sm:bottom-6 inset-x-0 z-40 flex justify-center px-4 pointer-events-none animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/90 bg-white/95 px-3 py-2 shadow-xl shadow-slate-900/10 backdrop-blur-md text-slate-900">
        {/* Count badge */}
        <div className="flex items-center gap-1.5 px-2 text-xs font-black text-slate-800">
          <CheckSquare className="h-4 w-4 text-emerald-600" />
          <span>{count} selected</span>
          {lockedCount > 0 && (
            <span className="flex items-center gap-0.5 rounded-md bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
              <Lock className="h-2.5 w-2.5" />
              <span>{lockedCount} seed · locked</span>
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200">
          <button
            type="button"
            onClick={onExport}
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            title="Export selected songs as JSON"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export</span>
          </button>

          <button
            type="button"
            onClick={onDelete}
            disabled={deletableCount === 0}
            className="flex items-center gap-1 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-black text-white hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs shadow-rose-600/20 transition"
            title={deletableCount === 0 ? "Selected seed songs cannot be deleted" : `Delete ${deletableCount} song(s)`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete {deletableCount > 0 ? `(${deletableCount})` : ''}</span>
          </button>

          <button
            type="button"
            onClick={onClear}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition"
            title="Clear selection"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
