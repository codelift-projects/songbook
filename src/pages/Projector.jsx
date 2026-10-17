import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSongs } from '../store/SongContext';
import { useSettings } from '../store/SettingsContext';
import { useSwipe } from '../hooks/useSwipe';
import { useFullscreen } from '../hooks/useFullscreen';
import { useOrientation } from '../hooks/useOrientation';
import { useContainerSize } from '../hooks/useContainerSize';
import { projectorStyle, hexA, computeFitFontSize } from '../lib/theme';
import { formatCommaLines } from '../lib/parse';
import SimpleSettingsModal from '../components/SimpleSettingsModal';
import { 
  ArrowLeft, 
  Maximize2, 
  Minimize2, 
  Settings as SettingsIcon, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';

export default function Projector() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { songs, loading } = useSongs();
  const { settings, update: updateSettings } = useSettings();
  const orientation = useOrientation();

  const song = useMemo(() => songs.find((s) => s.id === id), [songs, id]);

  const rootRef = useRef(null);
  const contentRef = useRef(null);
  const { isFullscreen, toggle: toggleFullscreen, enter: enterFullscreen } = useFullscreen(rootRef);

  const [index, setIndex] = useState(0);
  const [showUi, setShowUi] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [portraitHintDismissed, setPortraitHintDismissed] = useState(false);

  const [sizeRef, size] = useContainerSize();
  const hideTimer = useRef(null);

  /* -------- slides formulation -------- */
  const slides = useMemo(() => {
    if (!song) return [];
    return [
      { kind: 'title', title: song.title, subtitle: song.title_alt || '', number: song.number },
      ...(song.stanzas || []).map((s, i) => {
        const formatted = formatCommaLines(s.text || '');
        return {
          kind: 'stanza',
          key: s.id || i,
          label: s.label || '',
          lines: formatted.split('\n').map((l) => l.trimEnd()).filter(Boolean),
        };
      }),
    ];
  }, [song]);

  const slide = slides[index];
  const isTitle = slide?.kind === 'title';
  const lines = useMemo(() => (!slide ? [] : isTitle ? [slide.title, slide.subtitle].filter(Boolean) : slide.lines), [slide, isTitle]);

  /* -------- ROBUST & DYNAMIC FONT SIZING (FULL FREEDOM IN LANDSCAPE & PORTRAIT) -------- */
  const baseFontSize = useMemo(() => {
    const w = size.width || (typeof window !== 'undefined' ? window.innerWidth : 1280);
    const h = size.height || (typeof window !== 'undefined' ? window.innerHeight : 720);

    if (!lines.length) return 40;

    const isLandscape = orientation === 'landscape' || w > h;

    // In landscape mode, vertical space is precious:
    // When phone is in landscape, top bar & bottom indicators are slim so we leave optimal breathing room
    const topMargin = isLandscape ? (h < 500 ? 44 : 64) : 80;
    const bottomMargin = isLandscape ? (h < 500 ? 24 : 38) : 52;

    const availW = Math.max(260, w * (isLandscape ? 0.94 : 0.90));
    const availH = Math.max(140, h - topMargin - bottomMargin);
    const lineSpacing = settings.lineHeight || 1.18;

    // 1. Calculate baseline fit size (100% fits screen area perfectly without overflowing):
    const baselineFit = computeFitFontSize({
      lines,
      availW,
      availH,
      lineSpacing,
      isLandscape,
      isTitle,
      hasLabel: Boolean(slide?.label),
      minSize: isLandscape ? 16 : 14,
      maxSize: isLandscape ? (h < 500 ? 54 : 96) : (h < 700 ? 50 : 68),
      charWidthRatio: 0.58,
    });

    // 2. User scale multiplier:
    // Smooth, linear scaling without sudden 4x cliffs:
    const scale = settings.fontSizeScale || 1.0;
    const computed = Math.round(baselineFit * scale);

    return Math.max(12, Math.min(computed, 240));
  }, [size, lines, settings.fontSizeScale, settings.lineHeight, orientation, isTitle, slide?.label]);

  const [currentFontSize, setCurrentFontSize] = useState(baseFontSize);

  useEffect(() => {
    setCurrentFontSize(baseFontSize);
  }, [baseFontSize, index, slide]);

  // Real-DOM safety fitting:
  // ONLY adjust down if the user is in fit-to-screen mode (fontSizeScale <= 1.0)
  // If the user has explicitly requested a larger font size (fontSizeScale > 1.0 or clicked A+),
  // NEVER suppress their choice, allowing the text to grow and scroll vertically!
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const scale = settings.fontSizeScale || 1.0;
    if (scale > 1.0) return; // Allow font size increase without clamping!

    const w = size.width || (typeof window !== 'undefined' ? window.innerWidth : 1280);
    const h = size.height || (typeof window !== 'undefined' ? window.innerHeight : 720);
    const isLandscape = orientation === 'landscape' || w > h;
    const maxW = w * (isLandscape ? 0.95 : 0.92);
    const maxH = Math.max(140, h - (isLandscape ? (h < 500 ? 56 : 76) : 96));

    const actualH = el.scrollHeight;
    const actualW = el.scrollWidth;

    if (actualH > maxH || actualW > maxW) {
      const ratioH = maxH / actualH;
      const ratioW = maxW / actualW;
      const factor = Math.min(ratioH, ratioW);
      if (factor < 0.96 && factor > 0.65) {
        setCurrentFontSize(Math.max(14, Math.floor(baseFontSize * factor)));
      }
    }
  }, [baseFontSize, index, slide, size, settings.fontSizeScale, orientation]);

  /* -------- navigation -------- */
  const next = useCallback(() => setIndex((i) => Math.min(i + 1, slides.length - 1)), [slides.length]);
  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  /* -------- auto-hide controls -------- */
  const poke = useCallback(() => {
    setShowUi(true);
    clearTimeout(hideTimer.current);
    if (settings.autoHideControls && !settingsOpen) {
      hideTimer.current = setTimeout(() => setShowUi(false), settings.autoHideDelayMs || 2500);
    }
  }, [settings.autoHideControls, settings.autoHideDelayMs, settingsOpen]);

  useEffect(() => {
    poke();
    return () => clearTimeout(hideTimer.current);
  }, [poke]);

  /* -------- keyboard controls -------- */
  useEffect(() => {
    const onKey = (e) => {
      if (settingsOpen && e.key === 'Escape') {
        setSettingsOpen(false);
        return;
      }

      switch (e.key) {
        case 'ArrowRight': case ' ': case 'PageDown': case 'Enter':
          e.preventDefault(); next(); poke(); break;
        case 'ArrowLeft': case 'PageUp': e.preventDefault(); prev(); poke(); break;
        case 'Home': setIndex(0); poke(); break;
        case 'End':  setIndex(Math.max(0, slides.length - 1)); poke(); break;
        case 'f': case 'F': toggleFullscreen(); break;
        case '+': case '=':
          updateSettings({ fontSizeScale: Math.min(2.5, +(settings.fontSizeScale + 0.05).toFixed(2)) });
          poke();
          break;
        case '-': case '_':
          updateSettings({ fontSizeScale: Math.max(0.5, +(settings.fontSizeScale - 0.05).toFixed(2)) });
          poke();
          break;
        case 'Escape':
          if (document.fullscreenElement) document.exitFullscreen();
          else navigate(-1);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, poke, slides.length, toggleFullscreen, navigate, settings.fontSizeScale, settingsOpen, updateSettings]);

  /* -------- touch gestures -------- */
  const swipe = useSwipe({
    onSwipeLeft:  () => { next(); poke(); },
    onSwipeRight: () => { prev(); poke(); },
    onTap: () => {
      // Tap on slide background only toggles UI visibility, does NOT advance slide
      setShowUi((prevUi) => {
        if (!prevUi) poke();
        return !prevUi;
      });
    },
  });

  if (loading && !song) {
    return <div className="fixed inset-0 grid place-items-center bg-white text-slate-900 font-bold">Loading…</div>;
  }
  if (!song) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-white text-slate-900">
        <div className="text-center p-6">
          <p className="mb-4 font-semibold text-lg">Song not found.</p>
          <button onClick={() => navigate('/')} className="rounded-xl bg-slate-900 px-5 py-2.5 text-white font-bold">Back to Songs</button>
        </div>
      </div>
    );
  }

  const theme = projectorStyle(settings);
  const fontFamily = theme.fontFamily;
  const showPortraitHint = orientation === 'portrait' && !portraitHintDismissed && !isFullscreen;

  return (
    <div
      ref={rootRef}
      className={`fixed inset-0 w-screen h-screen overflow-hidden select-none ${showUi ? '' : 'cursor-hidden'}`}
      style={{ ...theme, touchAction: 'pan-y' }}
      onMouseMove={poke}
      onPointerDown={(e) => { poke(); swipe.onPointerDown(e); }}
      onPointerMove={swipe.onPointerMove}
      onPointerUp={swipe.onPointerUp}
      onPointerCancel={swipe.onPointerCancel}
    >
      {/* BOUNDED & SCROLLABLE SLIDE CONTAINER */}
      <div 
        ref={sizeRef} 
        className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center text-center ${
          (orientation === 'landscape' || (size.width && size.width > size.height))
            ? 'pt-10 pb-5 px-3 sm:px-6' 
            : 'pt-14 pb-10 px-4 sm:px-8'
        }`}
      >
        <div
          ref={contentRef}
          className="w-full max-w-[96vw] max-h-[88vh] flex flex-col items-center justify-center overflow-y-auto pointer-events-auto overscroll-contain select-text"
          style={{ touchAction: 'pan-y' }}
        >
          {isTitle ? (
            <div className="w-full flex flex-col items-center justify-center px-2">
              {slide.number != null && (
                <div 
                  className="font-black tracking-[0.25em] opacity-40 mb-2"
                  style={{ fontSize: Math.max(14, currentFontSize * 0.32), fontFamily }}
                >
                  SONG #{slide.number}
                </div>
              )}
              <h1 
                className="w-full font-black leading-tight tracking-tight break-words text-balance" 
                style={{ fontSize: currentFontSize * 1.1, fontFamily }}
              >
                {slide.title}
              </h1>
              {slide.subtitle && (
                <p 
                  className="mt-3 opacity-60 font-semibold break-words" 
                  style={{ fontSize: Math.max(14, currentFontSize * 0.45), fontFamily }}
                >
                  {slide.subtitle}
                </p>
              )}
            </div>
          ) : (
            <div className="w-full flex flex-col items-center justify-center px-1">
              {slide.label && (
                <div 
                  className="font-bold uppercase tracking-[0.25em] mb-1.5 opacity-75"
                  style={{ fontSize: Math.max(11, currentFontSize * 0.22), color: settings.accentColor, fontFamily }}
                >
                  {slide.label}
                </div>
              )}
              <div 
                className="w-full whitespace-pre-line font-black tracking-normal leading-tight break-words"
                style={{ 
                  fontSize: currentFontSize, 
                  fontFamily, 
                  lineHeight: settings.lineHeight || 1.18 
                }}
              >
                {slide.lines.join('\n')}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MINIMAL PROGRESS DOTS (SLIM AT BOTTOM) */}
      {settings.showProgressDots && slides.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1 z-10">
          {slides.map((_, i) => (
            <span 
              key={i} 
              className="h-1 rounded-full transition-all duration-150"
              style={{
                width: i === index ? 22 : 5,
                background: i === index ? settings.accentColor : settings.textColor,
                opacity: i === index ? 0.95 : 0.2,
              }} 
            />
          ))}
        </div>
      )}

      {/* DISCREET TOUCH-FRIENDLY PREV / NEXT NAVIGATION CONTROLS */}
      <div 
        className={`pointer-events-none absolute inset-y-0 inset-x-2 flex items-center justify-between z-15 transition-opacity duration-300 ${
          showUi ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {index > 0 ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev(); poke(); }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            data-no-swipe="true"
            className="pointer-events-auto flex items-center justify-center h-11 w-11 rounded-full transition shadow-lg backdrop-blur-md active:scale-95"
            style={{ 
              background: `${settings.textColor}18`, 
              color: settings.textColor,
              border: `1px solid ${settings.textColor}25`
            }}
            title="Previous Slide"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        ) : <div className="w-11" />}

        {index < slides.length - 1 ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next(); poke(); }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            data-no-swipe="true"
            className="pointer-events-auto flex items-center justify-center h-11 w-11 rounded-full transition shadow-lg backdrop-blur-md active:scale-95"
            style={{ 
              background: `${settings.textColor}18`, 
              color: settings.textColor,
              border: `1px solid ${settings.textColor}25`
            }}
            title="Next Slide"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        ) : <div className="w-11" />}
      </div>

      {/* ULTRA CLEAN AUTO-HIDING TOP CONTROL BAR */}
      <div
        data-no-swipe="true"
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        className={`absolute inset-x-0 top-0 flex items-center justify-between gap-2 px-3 py-2 transition-opacity duration-300 z-20 ${
          showUi ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        style={{ 
          background: `linear-gradient(to bottom, ${hexA(settings.background, 0.94)}, transparent)` 
        }}
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); navigate('/'); }}
          className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition shadow-xs active:scale-95"
          style={{ background: `${settings.textColor}15`, color: settings.textColor }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Exit</span>
        </button>

        <div className="min-w-0 flex-1 text-center px-2">
          <p className="truncate text-xs font-bold" style={{ fontFamily, color: settings.textColor }}>
            {song.title} {song.number ? `(#${song.number})` : ''}
          </p>
          <p className="text-[10px] font-semibold opacity-60" style={{ color: settings.textColor }}>
            Slide {index + 1} / {slides.length}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              updateSettings({ fontSizeScale: Math.max(0.5, +(settings.fontSizeScale - 0.05).toFixed(2)) });
              poke();
            }}
            className="rounded-xl px-2.5 py-1.5 text-xs font-bold active:scale-95 transition"
            style={{ background: `${settings.textColor}15`, color: settings.textColor }}
            title="Decrease font size"
          >
            A−
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              updateSettings({ fontSizeScale: Math.min(2.5, +(settings.fontSizeScale + 0.05).toFixed(2)) });
              poke();
            }}
            className="rounded-xl px-2.5 py-1.5 text-xs font-bold active:scale-95 transition"
            style={{ background: `${settings.textColor}15`, color: settings.textColor }}
            title="Increase font size"
          >
            A+
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
            className="rounded-xl p-1.5 text-xs font-bold active:scale-95 transition"
            style={{ background: `${settings.textColor}15`, color: settings.textColor }}
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          
          {/* FLOATING SETTINGS SIDEBAR TOGGLE BUTTON */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSettingsOpen((prev) => !prev);
            }}
            className={`rounded-xl p-1.5 text-xs font-bold transition active:scale-95 ${
              settingsOpen ? 'ring-2 ring-emerald-500' : ''
            }`}
            style={{ 
              background: settingsOpen ? settings.accentColor : `${settings.textColor}15`, 
              color: settingsOpen ? '#ffffff' : settings.textColor 
            }}
            title="Open Display Settings Sidebar"
          >
            <SettingsIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ROTATE-TO-LANDSCAPE MOBILE OVERLAY (Dismissable) */}
      {showPortraitHint && (
        <div 
          className="absolute inset-0 z-40 grid place-items-center px-6" 
          style={{ background: settings.background }}
        >
          <div className="max-w-sm text-center" style={{ color: settings.textColor, fontFamily }}>
            <div className="mb-4 text-5xl">📱 ↻</div>
            <h3 className="text-xl font-black">Rotate your phone</h3>
            <p className="mt-2 text-xs opacity-70">
              Landscape mode maximizes text size and fills the full projector screen.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => { enterFullscreen(); setPortraitHintDismissed(true); }}
                className="rounded-xl px-4 py-2.5 text-xs font-black shadow-md active:scale-95"
                style={{ background: settings.accentColor, color: '#ffffff' }}
              >
                Fullscreen Mode
              </button>
              <button
                type="button"
                onClick={() => setPortraitHintDismissed(true)}
                className="rounded-xl px-4 py-2.5 text-xs font-bold active:scale-95"
                style={{ background: `${settings.textColor}15`, color: settings.textColor }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESPONSIVE FLOATING SIDEBAR / BOTTOM DRAWER SETTINGS (LIVE SLIDE PREVIEW) */}
      <SimpleSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
