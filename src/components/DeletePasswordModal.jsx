import { useState, useRef, useEffect } from 'react';
import { isDeletePasswordConfigured } from '../lib/deleteAuth';
import { ShieldAlert, KeyRound, X, AlertCircle } from 'lucide-react';

export default function DeletePasswordModal({
  open,
  count,
  onCancel,
  onConfirm,
  busy,
  error,
}) {
  const [password, setPassword] = useState('');
  const inputRef = useRef(null);
  const configured = isDeletePasswordConfigured();

  useEffect(() => {
    if (open) {
      setPassword('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!configured || busy || !password) return;
    onConfirm(password);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs select-none"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl text-slate-900 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 border border-rose-200/80 text-rose-600 shadow-2xs">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-black tracking-tight text-slate-900">
                Delete {count} song{count === 1 ? '' : 's'}?
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Password required to confirm.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Configuration Warning if not set */}
        {!configured ? (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs font-bold text-amber-900">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>Delete is not configured. Ask an administrator.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                ref={inputRef}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') onCancel();
                }}
                placeholder="Enter delete password"
                autoComplete="current-password"
                disabled={busy}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-rose-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-600/15 shadow-2xs transition"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs font-bold text-rose-700">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={busy}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || !password}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white hover:bg-rose-700 disabled:opacity-40 shadow-sm shadow-rose-600/20 transition"
              >
                {busy ? 'Deleting…' : `Delete ${count > 1 ? `(${count})` : ''}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
