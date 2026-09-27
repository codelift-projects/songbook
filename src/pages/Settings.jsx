import { useSettings } from '../store/SettingsContext';
import { FONT_STACKS } from '../lib/theme';
import { RotateCcw, Palette, Type, Sliders, Check } from 'lucide-react';

export default function Settings() {
  const { settings, update, reset, applyPreset, presets } = useSettings();

  return (
    <div className="mx-auto max-w-xl pb-16 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            Display Settings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure live projector colors, font, and text sizing.
          </p>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition shadow-xs"
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
                className={`group relative flex items-center justify-center h-16 rounded-2xl border-2 transition-all duration-150 shadow-xs cursor-pointer ${
                  isActive
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
            min={0.3}
            max={3.5}
            step={0.02}
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
            className="text-xl font-bold leading-tight"
            style={{ lineHeight: settings.lineHeight }}
          >
            Amazing grace, how sweet the sound<br />
            तेरी स्तुति और आराधना करता रहूँ मैं सदा
          </p>
        </div>
      </div>
    </div>
  );
}
