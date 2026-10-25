export const FONT_STACKS = {
  sans:  "'Inter', 'Noto Sans Devanagari', system-ui, -apple-system, sans-serif",
  serif: "'Noto Serif Devanagari', Georgia, 'Times New Roman', serif",
  hindi: "'Noto Sans Devanagari', 'Inter', sans-serif",
  mono:  "'JetBrains Mono', 'Noto Sans Devanagari', ui-monospace, monospace",
};

export const BACKGROUND_COLOR_OPTIONS = [
  { value: '#000000', label: 'Black' },
  { value: '#0f172a', label: 'Dark Navy' },
  { value: '#18181b', label: 'Dark Gray' },
  { value: '#062d1b', label: 'Dark Green' },
  { value: '#2b0e14', label: 'Maroon' },
  { value: '#ffffff', label: 'White' },
  { value: '#fbf9f4', label: 'Cream' },
  { value: '#fef08a', label: 'Soft Yellow' },
  { value: '#f1f5f9', label: 'Light Gray' },
];

export const TEXT_COLOR_OPTIONS = [
  { value: '#ffffff', label: 'White' },
  { value: '#facc15', label: 'Yellow' },
  { value: '#fbbf24', label: 'Gold' },
  { value: '#22c55e', label: 'Green' },
  { value: '#38bdf8', label: 'Sky Blue' },
  { value: '#000000', label: 'Black' },
  { value: '#dc2626', label: 'Red' },
  { value: '#991b1b', label: 'Dark Red' },
  { value: '#1e293b', label: 'Dark Gray' },
  { value: '#ecfdf5', label: 'Light Mint' },
];

export function projectorStyle(settings) {
  return {
    background: settings.background,
    color: settings.textColor,
    fontFamily: FONT_STACKS[settings.fontFamily] || FONT_STACKS.sans,
  };
}

export function isDarkColor(hex) {
  const h = String(hex || '#000000').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.substring(0, 2), 16) || 0;
  const g = parseInt(full.substring(2, 4), 16) || 0;
  const b = parseInt(full.substring(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq < 128;
}

/**
 * Returns bolder font and high-contrast text border / outline styles
 * to ensure lyrics are deeply visible in low-light sanctuaries and projector beams.
 */
export function getTextEmphasisStyle(settings) {
  if (settings && settings.textBorderEmphasis === false) {
    return {
      fontWeight: 800,
    };
  }

  const isDarkBg = isDarkColor(settings?.background || '#000000');
  if (isDarkBg) {
    return {
      fontWeight: 900,
      WebkitTextStroke: '0.6px rgba(0, 0, 0, 0.85)',
      textShadow: '0 0 1px rgba(0,0,0,0.9), -1px -1px 0 rgba(0,0,0,0.85), 1px -1px 0 rgba(0,0,0,0.85), -1px 1px 0 rgba(0,0,0,0.85), 1px 1px 0 rgba(0,0,0,0.85), 0 2px 5px rgba(0,0,0,0.7)',
    };
  } else {
    return {
      fontWeight: 900,
      WebkitTextStroke: '0.4px rgba(0, 0, 0, 0.35)',
      textShadow: '0 0 1px rgba(255,255,255,0.9), -1px -1px 0 rgba(255,255,255,0.8), 1px -1px 0 rgba(255,255,255,0.8), -1px 1px 0 rgba(255,255,255,0.8), 1px 1px 0 rgba(255,255,255,0.8)',
    };
  }
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
 * availW and availH smoothly without abrupt threshold jumps.
 */
export function computeFitFontSize({
  lines,
  availW,
  availH,
  lineSpacing = 1.18,
  isLandscape = false,
  isTitle = false,
  hasLabel = false,
  minSize = 14,
  maxSize = 96,
  charWidthRatio = 0.58,
}) {
  if (!lines || !lines.length) return 36;
  const valid = lines.filter((l) => typeof l === 'string' && l.trim().length > 0);
  if (!valid.length) return 36;

  // Header / extra content overhead (SONG # or VERSE 1 label)
  let overheadH = 0;
  if (isTitle) {
    overheadH = Math.min(50, availH * 0.18);
  } else if (hasLabel) {
    overheadH = Math.min(28, availH * 0.12);
  }

  const usableH = Math.max(80, availH - overheadH);

  let low = minSize;
  let high = maxSize;
  let best = minSize;

  for (let i = 0; i < 12; i++) {
    const mid = (low + high) / 2;
    let fits = true;
    let totalLines = 0;

    for (const line of valid) {
      const effectiveSize = isTitle ? mid * 1.1 : mid;
      const lineWidth = line.length * effectiveSize * charWidthRatio;

      if (lineWidth > availW) {
        if (isLandscape && availW > 480) {
          // In landscape widescreen, lines should not break mid-phrase
          fits = false;
          break;
        } else {
          totalLines += Math.max(1, Math.ceil(lineWidth / availW));
        }
      } else {
        totalLines += 1;
      }
    }

    if (fits) {
      const effectiveMid = isTitle ? mid * 1.08 : mid;
      const totalH = totalLines * effectiveMid * lineSpacing;
      if (totalH <= usableH) {
        best = mid;
        low = mid;
      } else {
        high = mid;
      }
    } else {
      high = mid;
    }
  }

  return Math.max(minSize, Math.round(best));
}
