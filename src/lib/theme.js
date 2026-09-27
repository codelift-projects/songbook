export const FONT_STACKS = {
  sans:  "'Inter', 'Noto Sans Devanagari', system-ui, -apple-system, sans-serif",
  serif: "'Noto Serif Devanagari', Georgia, 'Times New Roman', serif",
  hindi: "'Noto Sans Devanagari', 'Inter', sans-serif",
  mono:  "'JetBrains Mono', 'Noto Sans Devanagari', ui-monospace, monospace",
};

export function projectorStyle(settings) {
  return {
    background: settings.background,
    color: settings.textColor,
    fontFamily: FONT_STACKS[settings.fontFamily] || FONT_STACKS.sans,
  };
}

/** Convert `#rrggbb` to `rgba(r,g,b,a)` – safe against bad input. */
export function hexA(hex, alpha) {
  const h = String(hex || '#000000').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n) || full.length !== 6) return `rgba(0,0,0,${alpha})`;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
