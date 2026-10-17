export const FONT_STACKS = {
  sans:  "'Inter', 'Noto Sans Devanagari', system-ui, -apple-system, sans-serif",
  serif: "'Noto Serif Devanagari', Georgia, 'Times New Roman', serif",
  hindi: "'Noto Sans Devanagari', 'Inter', sans-serif",
  mono:  "'JetBrains Mono', 'Noto Sans Devanagari', ui-monospace, monospace",
};

export const BACKGROUND_COLOR_OPTIONS = [
  { value: '#000000', label: 'Pitch Black (#000000)' },
  { value: '#0f172a', label: 'Dark Navy (#0f172a)' },
  { value: '#18181b', label: 'Dark Charcoal (#18181b)' },
  { value: '#062d1b', label: 'Deep Forest Green (#062d1b)' },
  { value: '#2b0e14', label: 'Deep Maroon / Wine (#2b0e14)' },
  { value: '#ffffff', label: 'Pure White (#ffffff)' },
  { value: '#fbf9f4', label: 'Warm Cream (#fbf9f4)' },
  { value: '#fef08a', label: 'Parchment Yellow (#fef08a)' },
  { value: '#f1f5f9', label: 'Light Slate Gray (#f1f5f9)' },
];

export const TEXT_COLOR_OPTIONS = [
  { value: '#ffffff', label: 'Pure White (#ffffff)' },
  { value: '#facc15', label: 'Bright Yellow (#facc15)' },
  { value: '#fbbf24', label: 'Warm Amber / Gold (#fbbf24)' },
  { value: '#22c55e', label: 'Grass Green (#22c55e)' },
  { value: '#38bdf8', label: 'Sky Cyan (#38bdf8)' },
  { value: '#000000', label: 'Pure Black (#000000)' },
  { value: '#dc2626', label: 'Vivid Red (#dc2626)' },
  { value: '#991b1b', label: 'Deep Crimson (#991b1b)' },
  { value: '#1e293b', label: 'Dark Slate (#1e293b)' },
  { value: '#ecfdf5', label: 'Mint Cream (#ecfdf5)' },
];

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

/**
 * Accurately finds the maximum font size (in px) where all lines fit within
 * availW and availH without circular estimation bugs.
 */
export function computeFitFontSize({
  lines,
  availW,
  availH,
  lineSpacing = 1.18,
  minSize = 16,
  maxSize = 160,
  charWidthRatio = 0.54,
}) {
  if (!lines || !lines.length) return 48;
  const valid = lines.filter((l) => typeof l === 'string' && l.trim().length > 0);
  if (!valid.length) return 48;

  let low = minSize;
  let high = maxSize;
  let best = minSize;

  for (let i = 0; i < 11; i++) {
    const mid = (low + high) / 2;
    let totalLines = 0;
    let fitsWidth = true;

    for (const line of valid) {
      const estimatedWidth = line.length * mid * charWidthRatio;
      const wrapped = Math.max(1, Math.ceil(estimatedWidth / availW));
      totalLines += wrapped;
      // If a line is too wide for availW
      if (estimatedWidth > availW * 1.06 && wrapped === 1) {
        fitsWidth = false;
        break;
      }
    }

    const totalHeight = totalLines * mid * lineSpacing;

    if (fitsWidth && totalHeight <= availH) {
      best = mid;
      low = mid;
    } else {
      high = mid;
    }
  }

  return Math.max(minSize, Math.round(best));
}
