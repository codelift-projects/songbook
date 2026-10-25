import { useSettings } from '../store/SettingsContext';
import { FONT_STACKS, BACKGROUND_COLOR_OPTIONS, TEXT_COLOR_OPTIONS, getTextEmphasisStyle } from '../lib/theme';
import { RotateCcw, Palette, Type, Sliders, Check } from 'lucide-react';

export default function Settings() {
  const { settings, update, reset, applyPreset, presets } = useSettings();

  return (
    <div className="mx-auto max-w-xl pb-16 space-y-5">
      {/* Compact Top Action Bar */}
      <div className="flex items-center justify-between pb-1">
        <span className="text-xs font-bold text-slate-500">
          Projector Theme & Font Settings
        </span>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 rounded-xl border border-slate-300/80 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition shadow-2xs active:scale-95"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Theme Presets */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-emerald-600" />
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
            Color Theme
          </h2>
        </div>

        <div className="grid grid-cols-4 gap-3">
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
                className={`group relative flex items-center justify-center h-16 rounded-2xl border-2 transition-all duration-150 shadow-xs cursor-pointer ${isActive
                    ? 'border-emerald-600 ring-2 ring-emerald-600/40 shadow-sm scale-[1.04]'
                    : 'border-slate-300/80 hover:border-slate-400 hover:scale-[1.02]'
                  }`}
                style={{ background: p.background }}
              >
                <span
                  className="font-black text-base select-none"
                  style={{ color: p.textColor }}
                >
                  Aa
                </span>

                {isActive && (
                  <span className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-emerald-600 text-white shadow-xs">
                    <Check className="h-3 w-3 stroke-[3.5]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Custom Dropdown Selection for Background & Text Color */}
        <div className="pt-3.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Background Color Dropdown */}
          <div>
            <label className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Background Color</span>
              <span className="text-[11px] font-medium text-slate-500">
                {BACKGROUND_COLOR_OPTIONS.find(o => o.value.toLowerCase() === settings.background.toLowerCase())?.label || 'Custom'}
              </span>
            </label>
            <div className="flex items-center gap-2">
              <span
                className="h-9 w-9 rounded-xl border border-slate-300 shadow-2xs shrink-0 transition-all"
                style={{ background: settings.background }}
                title="Current Background Color"
              />
              <select
                value={BACKGROUND_COLOR_OPTIONS.some(o => o.value.toLowerCase() === settings.background.toLowerCase()) ? settings.background.toLowerCase() : 'custom'}
                onChange={(e) => {
                  if (e.target.value !== 'custom') {
                    update({ background: e.target.value });
                  }
                }}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-600 focus:outline-none"
              >
                {BACKGROUND_COLOR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
                {!BACKGROUND_COLOR_OPTIONS.some(o => o.value.toLowerCase() === settings.background.toLowerCase()) && (
                  <option value="custom">Custom Color</option>
                )}
              </select>
              <label
                title="Choose custom background color"
                className="relative grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer shadow-2xs shrink-0"
              >
                <input
                  type="color"
                  value={settings.background.startsWith('#') && settings.background.length === 7 ? settings.background : '#000000'}
                  onChange={(e) => update({ background: e.target.value })}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <span className="text-sm">🎨</span>
              </label>
            </div>
          </div>

          {/* Text Color Dropdown */}
          <div>
            <label className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Text Color</span>
              <span className="text-[11px] font-medium text-slate-500">
                {TEXT_COLOR_OPTIONS.find(o => o.value.toLowerCase() === settings.textColor.toLowerCase())?.label || 'Custom'}
              </span>
            </label>
            <div className="flex items-center gap-2">
              <span
                className="h-9 w-9 rounded-xl border border-slate-300 shadow-2xs shrink-0 transition-all"
                style={{ background: settings.textColor }}
                title="Current Text Color"
              />
              <select
                value={TEXT_COLOR_OPTIONS.some(o => o.value.toLowerCase() === settings.textColor.toLowerCase()) ? settings.textColor.toLowerCase() : 'custom'}
                onChange={(e) => {
                  if (e.target.value !== 'custom') {
                    update({ textColor: e.target.value });
                  }
                }}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-600 focus:outline-none"
              >
                {TEXT_COLOR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
                {!TEXT_COLOR_OPTIONS.some(o => o.value.toLowerCase() === settings.textColor.toLowerCase()) && (
                  <option value="custom">Custom Color</option>
                )}
              </select>
              <label
                title="Choose custom text color"
                className="relative grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer shadow-2xs shrink-0"
              >
                <input
                  type="color"
                  value={settings.textColor.startsWith('#') && settings.textColor.length === 7 ? settings.textColor : '#ffffff'}
                  onChange={(e) => update({ textColor: e.target.value })}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <span className="text-sm">🎨</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Typography & Scale */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Type className="h-4 w-4 text-emerald-600" />
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
            Text & Sizing
          </h2>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-700">
            Font Family
          </label>
          <select
            value={settings.fontFamily}
            onChange={(e) => update({ fontFamily: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:border-emerald-600 focus:outline-none"
          >
            <option value="sans">Modern Sans-serif (Inter + Devanagari) — Recommended</option>
            <option value="hindi">Devanagari Primary (मराठी / हिन्दी)</option>
            <option value="serif">Traditional Serif</option>
            <option value="mono">Clean Monospace</option>
          </select>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Text Size Scale</span>
            <span className="font-mono text-emerald-700 font-extrabold">
              {Math.round(settings.fontSizeScale * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={2.5}
            step={0.05}
            value={settings.fontSizeScale}
            onChange={(e) => update({ fontSizeScale: Number(e.target.value) })}
            className="w-full h-2 rounded-lg bg-slate-200 accent-emerald-600 cursor-pointer"
          />
        </div>

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

        {/* Text Border / Low Light Emphasis Toggle */}
        <div className="pt-3 border-t border-slate-100">
          <label className="flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer">
            <div>
              <span className="block text-slate-800">Text Border (Low-Light Projector Emphasis)</span>
              <span className="block text-[11px] text-slate-500 font-normal mt-0.5">
                Bolder text with contrast outline for projector beams & dim ambient rooms
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.textBorderEmphasis ?? true}
              onChange={(e) => update({ textBorderEmphasis: e.target.checked })}
              className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* Live Preview Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-emerald-600" />
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
            Live Preview
          </h2>
        </div>

        <div
          className="relative overflow-hidden rounded-xl border border-slate-300 p-6 text-center shadow-xs transition-all"
          style={{
            background: settings.background,
            color: settings.textColor,
            fontFamily: FONT_STACKS[settings.fontFamily] || FONT_STACKS.sans,
          }}
        >
          <div
            className="mb-2 text-xs font-black uppercase tracking-[0.25em]"
            style={{ color: settings.accentColor }}
          >
            कोरस / CHORUS
          </div>
          <p
            className="text-xl font-black leading-tight"
            style={{
              lineHeight: settings.lineHeight,
              ...getTextEmphasisStyle(settings)
            }}
          >
            Amazing grace, how sweet the sound<br />
            तेरी स्तुति और आराधना करता रहूँ मैं सदा
          </p>
        </div>
      </div>
    </div>
  );
}
