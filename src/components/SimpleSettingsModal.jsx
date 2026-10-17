import { useSettings } from '../store/SettingsContext';
import { BACKGROUND_COLOR_OPTIONS, TEXT_COLOR_OPTIONS } from '../lib/theme';
import { X, RotateCcw, Check, Sparkles, Sliders, Type, Minus, Plus } from 'lucide-react';

export default function SimpleSettingsModal({ isOpen, onClose }) {
  const { settings, update, reset, applyPreset, presets } = useSettings();

  if (!isOpen) return null;

  return (
    <>
      {/* Non-obstructing transparent click-away backdrop: keeps slide 100% visible */}
      <div 
        className="fixed inset-0 z-40 bg-black/15 transition-opacity"
        onClick={onClose}
        data-no-swipe="true"
      />

      {/* Floating Sidebar (Desktop: right panel; Mobile: sleek bottom drawer) */}
      <aside 
        className="fixed z-50 flex flex-col bg-slate-900/95 text-slate-100 backdrop-blur-xl shadow-2xl border-white/10 select-none transition-transform duration-200 ease-out
          bottom-0 inset-x-0 max-h-[72vh] rounded-t-3xl border-t p-4 sm:p-5
          sm:bottom-0 sm:top-0 sm:right-0 sm:left-auto sm:max-h-none sm:w-88 md:w-96 sm:rounded-none sm:border-t-0 sm:border-l overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        data-no-swipe="true"
      >
        {/* Mobile Pull Indicator */}
        <div className="mx-auto mb-2.5 h-1.5 w-12 rounded-full bg-slate-700/80 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <Sliders className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                Display Settings
              </h3>
              <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Live impact visible on slide
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            title="Close Settings"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 flex-1">
          {/* Themes Palette Swatches */}
          <div>
            <label className="mb-2 block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Color Theme
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
                    className={`group relative flex items-center justify-center h-11 rounded-xl border-2 transition-all duration-150 shadow-xs cursor-pointer ${
                      isActive
                        ? 'border-emerald-500 ring-2 ring-emerald-500/50 scale-[1.04]'
                        : 'border-slate-700/90 hover:border-slate-500 hover:scale-[1.02]'
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
                      <span className="absolute -top-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-emerald-500 text-white shadow-xs">
                        <Check className="h-2.5 w-2.5 stroke-[3.5]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Dropdown Selection for Background & Text Color */}
            <div className="pt-3 border-t border-slate-800/80 space-y-3">
              {/* Background Color Dropdown */}
              <div>
                <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-slate-300">
                  <span>Background Color</span>
                  <span className="font-mono text-[10px] text-slate-400 uppercase">{settings.background}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span 
                    className="h-8 w-8 rounded-xl border border-slate-600 shadow-2xs shrink-0 transition-all"
                    style={{ background: settings.background }}
                    title={`Background: ${settings.background}`}
                  />
                  <select
                    value={BACKGROUND_COLOR_OPTIONS.some(o => o.value.toLowerCase() === settings.background.toLowerCase()) ? settings.background.toLowerCase() : 'custom'}
                    onChange={(e) => {
                      if (e.target.value !== 'custom') {
                        update({ background: e.target.value });
                      }
                    }}
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-100 focus:border-emerald-500 focus:outline-none"
                  >
                    {BACKGROUND_COLOR_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                    {!BACKGROUND_COLOR_OPTIONS.some(o => o.value.toLowerCase() === settings.background.toLowerCase()) && (
                      <option value="custom">Custom Color ({settings.background})</option>
                    )}
                  </select>
                  <label 
                    title="Pick custom background color"
                    className="relative grid h-8 w-8 place-items-center rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 cursor-pointer shadow-2xs shrink-0"
                  >
                    <input
                      type="color"
                      value={settings.background.startsWith('#') && settings.background.length === 7 ? settings.background : '#000000'}
                      onChange={(e) => update({ background: e.target.value })}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <span className="text-xs">🎨</span>
                  </label>
                </div>
              </div>

              {/* Text Color Dropdown */}
              <div>
                <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-slate-300">
                  <span>Text Color</span>
                  <span className="font-mono text-[10px] text-slate-400 uppercase">{settings.textColor}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span 
                    className="h-8 w-8 rounded-xl border border-slate-600 shadow-2xs shrink-0 transition-all"
                    style={{ background: settings.textColor }}
                    title={`Text Color: ${settings.textColor}`}
                  />
                  <select
                    value={TEXT_COLOR_OPTIONS.some(o => o.value.toLowerCase() === settings.textColor.toLowerCase()) ? settings.textColor.toLowerCase() : 'custom'}
                    onChange={(e) => {
                      if (e.target.value !== 'custom') {
                        update({ textColor: e.target.value });
                      }
                    }}
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-100 focus:border-emerald-500 focus:outline-none"
                  >
                    {TEXT_COLOR_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                    {!TEXT_COLOR_OPTIONS.some(o => o.value.toLowerCase() === settings.textColor.toLowerCase()) && (
                      <option value="custom">Custom Color ({settings.textColor})</option>
                    )}
                  </select>
                  <label 
                    title="Pick custom text color"
                    className="relative grid h-8 w-8 place-items-center rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 cursor-pointer shadow-2xs shrink-0"
                  >
                    <input
                      type="color"
                      value={settings.textColor.startsWith('#') && settings.textColor.length === 7 ? settings.textColor : '#ffffff'}
                      onChange={(e) => update({ textColor: e.target.value })}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <span className="text-xs">🎨</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Typography / Font Family */}
          <div>
            <label className="mb-1.5 flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <Type className="h-3 w-3" />
              <span>Font Family</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'sans', label: 'Modern Sans' },
                { id: 'hindi', label: 'Devanagari (मराठी/हिन्दी)' },
                { id: 'serif', label: 'Serif' },
                { id: 'mono', label: 'Monospace' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => update({ fontFamily: f.id })}
                  className={`rounded-xl px-2.5 py-2 text-xs font-bold text-left transition ${
                    settings.fontFamily === f.id
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size Scale */}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-300">
              <span>Text Size</span>
              <span className="font-mono text-emerald-400 font-extrabold text-xs">
                {Math.round(settings.fontSizeScale * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => update({ fontSizeScale: Math.max(0.4, +(settings.fontSizeScale - 0.08).toFixed(2)) })}
                className="grid h-7 w-7 place-items-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                title="Decrease font size"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <input
                type="range"
                min={0.4}
                max={3.0}
                step={0.02}
                value={settings.fontSizeScale}
                onChange={(e) => update({ fontSizeScale: Number(e.target.value) })}
                className="w-full h-2 rounded-lg bg-slate-700 accent-emerald-500 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => update({ fontSizeScale: Math.min(3.0, +(settings.fontSizeScale + 0.08).toFixed(2)) })}
                className="grid h-7 w-7 place-items-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                title="Increase font size"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Line Spacing */}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-300">
              <span>Line Spacing</span>
              <span className="font-mono text-emerald-400 font-extrabold text-xs">
                {settings.lineHeight.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={1.0}
              max={1.8}
              step={0.02}
              value={settings.lineHeight}
              onChange={(e) => update({ lineHeight: Number(e.target.value) })}
              className="w-full h-2 rounded-lg bg-slate-700 accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Optional Display Preferences */}
          <div className="pt-1 border-t border-slate-800/80 space-y-2.5">
            <label className="flex items-center justify-between text-xs font-medium text-slate-300 cursor-pointer">
              <span>Show Progress Indicator</span>
              <input
                type="checkbox"
                checked={settings.showProgressDots}
                onChange={(e) => update({ showProgressDots: e.target.checked })}
                className="h-4 w-4 rounded accent-emerald-500 cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between text-xs font-medium text-slate-300 cursor-pointer">
              <span>Auto-hide Controls</span>
              <input
                type="checkbox"
                checked={settings.autoHideControls}
                onChange={(e) => update({ autoHideControls: e.target.checked })}
                className="h-4 w-4 rounded accent-emerald-500 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-3 mt-4">
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-200 transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-black text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/30 transition"
          >
            Done
          </button>
        </div>
      </aside>
    </>
  );
}
