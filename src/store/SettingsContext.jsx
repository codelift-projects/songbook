import { createContext, useContext, useEffect, useState } from 'react';

const KEY = 'church-songbook:settings:v4';

const DEFAULTS = {
  background: '#000000',
  textColor:  '#ffffff',
  accentColor:'#22c55e', // Grass green accent
  fontFamily: 'sans',     // 'sans' | 'serif' | 'hindi' | 'mono'
  fontSizeScale: 1.30,    // Full screen scale
  lineHeight: 1.20,       // Tight line height for maximum area utilization
  showProgressDots: true,
  showNextPreview: false,
  autoHideControls: true,
  autoHideDelayMs: 2000,
};

const PRESETS = [
  { id:'text-white-bg-black',  name:'Text White • BG Black',   background:'#000000', textColor:'#ffffff', accentColor:'#22c55e' },
  { id:'text-black-bg-white',  name:'Text Black • BG White',   background:'#ffffff', textColor:'#000000', accentColor:'#16a34a' },
  { id:'text-red-bg-white',    name:'Text Red • BG White',     background:'#ffffff', textColor:'#dc2626', accentColor:'#991b1b' },
  { id:'text-red-bg-yellow',   name:'Text Red • BG Yellow',    background:'#fef08a', textColor:'#991b1b', accentColor:'#7f1d1d' },
  { id:'text-yellow-bg-black', name:'Text Yellow • BG Black',  background:'#000000', textColor:'#facc15', accentColor:'#fde047' },
  { id:'text-white-bg-navy',   name:'Text White • BG Navy',    background:'#0f172a', textColor:'#ffffff', accentColor:'#38bdf8' },
  { id:'text-white-bg-green',  name:'Text White • BG Green',   background:'#062d1b', textColor:'#ecfdf5', accentColor:'#34d399' },
  { id:'text-black-bg-cream',  name:'Text Black • BG Cream',   background:'#fbf9f4', textColor:'#1c1917', accentColor:'#15803d' },
];

const Ctx = createContext(null);

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch { return DEFAULTS; }
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch {}
  }, [settings]);

  const update = (patch) => setSettings((s) => ({ ...s, ...patch }));
  const reset = () => setSettings(DEFAULTS);
  const applyPreset = (p) => setSettings((s) => ({
    ...s, background: p.background, textColor: p.textColor, accentColor: p.accentColor,
  }));

  return (
    <Ctx.Provider value={{ settings, update, reset, applyPreset, presets: PRESETS, defaults: DEFAULTS }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSettings() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useSettings must be inside SettingsProvider');
  return c;
}
