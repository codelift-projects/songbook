import { useState, useRef, useEffect } from 'react';
import { verifyManagePassword, saveManagePassword, getStoredManagePassword } from '../lib/manageAuth';
import { Lock, Eye, EyeOff, X, AlertCircle, ShieldAlert, Check } from 'lucide-react';

export default function AdminPasswordModal({
  open,
  title = 'Admin Password Required',
  subtitle = 'Enter password to proceed.',
  actionLabel = 'Confirm & Unlock',
  danger = false,
  busy = false,
  onCancel,
  onSuccess,
}) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      const stored = getStoredManagePassword();
      if (stored && verifyManagePassword(stored)) {
        setPassword(stored);
      } else {
        setPassword('');
      }
      setError('');
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 80);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (busy || !password.trim()) return;

    if (verifyManagePassword(password)) {
      if (remember) {
        saveManagePassword(password);
      }
      setError('');
      onSuccess(password);
    } else {
      setError('Incorrect password. Please try again.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs select-none animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-2xl text-slate-900 space-y-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border shadow-2xs ${
                danger
                  ? 'bg-rose-50 border-rose-200/90 text-rose-600'
                  : 'bg-emerald-50 border-emerald-200/90 text-emerald-600'
              }`}
            >
              {danger ? <ShieldAlert className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
                {title}
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                {subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition active:scale-95"
            title="Cancel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-slate-700">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Lock className="h-5 w-5" />
              </span>
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') onCancel();
                }}
                placeholder="Enter admin password"
                autoComplete="current-password"
                disabled={busy}
                className={`w-full rounded-2xl border pl-11 pr-11 py-3 text-sm sm:text-base font-bold text-slate-900 shadow-2xs transition focus:outline-none ${
                  error
                    ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-2 focus:ring-rose-400'
                    : 'border-slate-300 bg-slate-50/70 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition"
                title={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5 text-slate-400" />}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs font-bold text-rose-700 animate-in fade-in duration-150">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Remember on this device checkbox for non-technical users */}
          <label className="flex items-center gap-2.5 text-xs font-bold text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>Remember on this device</span>
          </label>

          {/* Action Buttons: Large and finger-friendly for mobile */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="flex-1 rounded-2xl border border-slate-300 bg-white py-3 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 transition active:scale-95 shadow-2xs text-center min-h-[46px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !password.trim()}
              className={`flex-1 rounded-2xl py-3 px-4 text-sm font-black text-white transition active:scale-95 shadow-sm text-center min-h-[46px] disabled:opacity-40 ${
                danger
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
              }`}
            >
              {busy ? 'Processing…' : actionLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
