import { useSettings } from '../store/SettingsContext';
import { X, RotateCcw, Check } from 'lucide-react';

export default function SimpleSettingsModal({ isOpen, onClose }) {
  const { settings, update, reset, applyPreset, presets } = useSettings();

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl space-y-4 text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-extrabold text-slate-900">
            Projector Settings
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Color Theme Swatch Icons */}
        <div>
          <label className="mb-2 block text-xs font-bold text-slate-600 uppercase tracking-wider">
            Theme
          </label>
          <div className="grid grid-cols-4 gap-2">
            {presets.map((p) => {
              const isActive =
                settings.background === p.background &&
                settings.textColor === p.textColor &&
                settings.accentColor === p.accentColor;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p)}
                  title={p.name}
                  className={`group relative flex items-center justify-center h-12 rounded-xl border-2 transition-all duration-150 shadow-2xs cursor-pointer ${
                    isActive
                      ? 'border-emerald-600 ring-2 ring-emerald-600/40 shadow-sm scale-[1.04]'
                      : 'border-slate-300/80 hover:border-slate-400 hover:scale-[1.02]'
                  }`}
                  style={{ background: p.background }}
                >
                  <span
                    className="font-black text-sm select-none"
                    style={{ color: p.textColor }}
                  >
                    Aa
                  </span>

                  {isActive && (
                    <span className="absolute -top-1.5 -right-1.5 grid h-4 w-4 place-items-center rounded-full bg-emerald-600 text-white shadow-xs">
                      <Check className="h-2.5 w-2.5 stroke-[3.5]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Font Choice */}
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-600 uppercase tracking-wider">
            Font
          </label>
          <select
            value={settings.fontFamily}
            onChange={(e) => update({ fontFamily: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-600 focus:outline-none"
          >
            <option value="sans">Modern Sans (Devanagari + English)</option>
            <option value="hindi">Devanagari Primary (मराठी / हिन्दी)</option>
            <option value="serif">Traditional Serif</option>
            <option value="mono">Clean Monospace</option>
          </select>
        </div>

        {/* Font Size Scale */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Text Size Scale</span>
            <span className="font-mono text-emerald-700 font-extrabold">
              {Math.round(settings.fontSizeScale * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.3}
            max={3.5}
            step={0.02}
            value={settings.fontSizeScale}
            onChange={(e) => update({ fontSizeScale: Number(e.target.value) })}
            className="w-full h-2 rounded-lg bg-slate-200 accent-emerald-600 cursor-pointer"
          />
        </div>

        {/* Line Spacing */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Line Spacing</span>
            <span className="font-mono text-emerald-700 font-extrabold">
              {settings.lineHeight.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min={1.0}
            max={2.0}
            step={0.02}
            value={settings.lineHeight}
            onChange={(e) => update({ lineHeight: Number(e.target.value) })}
            className="w-full h-2 rounded-lg bg-slate-200 accent-emerald-600 cursor-pointer"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <button
            onClick={reset}
            className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>

          <button
            onClick={onClose}
            className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-black text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
