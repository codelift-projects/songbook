import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSongs } from '../store/SongContext';
import { useSettings } from '../store/SettingsContext';
import { useSwipe } from '../hooks/useSwipe';
import { useFullscreen } from '../hooks/useFullscreen';
import { useOrientation } from '../hooks/useOrientation';
import { useContainerSize } from '../hooks/useContainerSize';
import { projectorStyle, hexA } from '../lib/theme';
import { formatCommaLines } from '../lib/parse';
import SimpleSettingsModal from '../components/SimpleSettingsModal';
import { ArrowLeft, Maximize2, Minimize2, Settings as SettingsIcon } from 'lucide-react';

export default function Projector() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { songs, loading } = useSongs();
  const { settings, update: updateSettings } = useSettings();
  const orientation = useOrientation();

  const song = useMemo(() => songs.find((s) => s.id === id), [songs, id]);

  const rootRef = useRef(null);
  const { isFullscreen, toggle: toggleFullscreen, enter: enterFullscreen } = useFullscreen(rootRef);

  const [index, setIndex] = useState(0);
  const [blank, setBlank] = useState(false);
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

  /* -------- FULL SCREEN EXPANDED VIEW SIZING (PRECISELY INSIDE SCREEN) -------- */
  const fontSize = useMemo(() => {
    const w = size.width || (typeof window !== 'undefined' ? window.innerWidth : 1280);
    const h = size.height || (typeof window !== 'undefined' ? window.innerHeight : 720);
    
    if (!lines.length) return 64;
    
    const longest = Math.max(1, ...lines.map((l) => l.length));
    const lineCount = Math.max(1, lines.length);

    // Keep text precisely inside the screen bounds (96% width & 90% height)
    const charWidthRatio = 0.48; // realistic average character ratio
    const lineSpacing = settings.lineHeight || 1.18;

    const byWidth = (w * 0.96) / (longest * charWidthRatio);
    const byHeight = (h * 0.90) / (lineCount * lineSpacing);

    let calculated = Math.min(byWidth, byHeight) * (settings.fontSizeScale || 1.30);

    // Fine-grained range up to max limits (18px to 380px)
    return Math.max(18, Math.min(calculated, 380));
  }, [size, lines, settings.fontSizeScale, settings.lineHeight]);

  /* -------- navigation -------- */
  const next = useCallback(() => setIndex((i) => Math.min(i + 1, slides.length - 1)), [slides.length]);
  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  /* -------- auto-hide controls -------- */
  const poke = useCallback(() => {
    setShowUi(true);
    clearTimeout(hideTimer.current);
    if (settings.autoHideControls && !settingsOpen) {
      hideTimer.current = setTimeout(() => setShowUi(false), settings.autoHideDelayMs || 2000);
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
        case 'b': case 'B': setBlank((v) => !v); poke(); break;
        case 'f': case 'F': toggleFullscreen(); break;
        case '+': case '=':
          updateSettings({ fontSizeScale: Math.min(3.5, +(settings.fontSizeScale + 0.05).toFixed(2)) });
          poke();
          break;
        case '-': case '_':
          updateSettings({ fontSizeScale: Math.max(0.3, +(settings.fontSizeScale - 0.05).toFixed(2)) });
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
    onDoubleTap:  () => { setBlank((v) => !v); poke(); },
    onTap: (e) => {
      poke();
      const x = e.clientX / window.innerWidth;
      if (x < 0.25) prev();
      else next();
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
      style={{ ...theme, touchAction: 'none' }}
      onMouseMove={poke}
      onPointerDown={(e) => { poke(); swipe.onPointerDown(e); }}
      onPointerMove={swipe.onPointerMove}
      onPointerUp={swipe.onPointerUp}
      onPointerCancel={swipe.onPointerCancel}
    >
      {/* 100% FULL SCREEN EDGE-TO-EDGE CONTAINER (TEXT EXPANDS TO MAXIMUM LIMIT) */}
      <div 
        ref={sizeRef} 
        className="pointer-events-none absolute inset-0 w-full h-full flex flex-col items-center justify-center p-1 sm:p-2 text-center"
      >
        {blank ? null : isTitle ? (
          <div className="w-full h-full flex flex-col items-center justify-center px-2">
            {slide.number != null && (
              <div 
                className="font-black tracking-[0.25em] opacity-40 mb-2"
                style={{ fontSize: Math.max(16, fontSize * 0.28), fontFamily }}
              >
                SONG #{slide.number}
              </div>
            )}
            <h1 
              className="w-full font-black leading-tight tracking-tight" 
              style={{ fontSize: fontSize * 1.15, fontFamily }}
            >
              {slide.title}
            </h1>
            {slide.subtitle && (
              <p 
                className="mt-3 opacity-60 font-semibold" 
                style={{ fontSize: Math.max(16, fontSize * 0.42), fontFamily }}
              >
                {slide.subtitle}
              </p>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center px-1">
            {slide.label && (
              <div 
                className="font-bold uppercase tracking-[0.25em] mb-1 opacity-70"
                style={{ fontSize: Math.max(12, fontSize * 0.18), color: settings.accentColor, fontFamily }}
              >
                {slide.label}
              </div>
            )}
            <div 
              className="w-full whitespace-pre-line font-black tracking-normal leading-tight"
              style={{ 
                fontSize, 
                fontFamily, 
                lineHeight: settings.lineHeight || 1.18 
              }}
            >
              {slide.lines.join('\n')}
            </div>
          </div>
        )}
      </div>

      {/* MINIMAL PROGRESS DOTS (SLIM AT VERY BOTTOM) */}
      {settings.showProgressDots && !blank && slides.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-1 flex justify-center gap-1 z-10">
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

      {/* ULTRA CLEAN AUTO-HIDING TOP CONTROL BAR */}
      <div
        className={`absolute inset-x-0 top-0 flex items-center justify-between gap-2 px-3 py-2 transition-opacity duration-300 z-20 ${
          showUi ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        style={{ 
          background: `linear-gradient(to bottom, ${hexA(settings.background, 0.92)}, transparent)` 
        }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); navigate('/'); }}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition shadow-sm"
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

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateSettings({ fontSizeScale: Math.max(0.3, +(settings.fontSizeScale - 0.05).toFixed(2)) });
            }}
            className="rounded-lg px-2 py-1 text-xs font-bold"
            style={{ background: `${settings.textColor}15`, color: settings.textColor }}
          >
            A−
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateSettings({ fontSizeScale: Math.min(3.5, +(settings.fontSizeScale + 0.05).toFixed(2)) });
            }}
            className="rounded-lg px-2 py-1 text-xs font-bold"
            style={{ background: `${settings.textColor}15`, color: settings.textColor }}
          >
            A+
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setBlank((v) => !v); poke(); }}
            className="rounded-lg px-2.5 py-1 text-xs font-bold transition"
            style={{
              background: blank ? settings.accentColor : `${settings.textColor}15`,
              color: blank ? settings.background : settings.textColor,
            }}
          >
            {blank ? 'Unblank' : 'Blank'}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
            className="rounded-lg p-1 text-xs font-bold"
            style={{ background: `${settings.textColor}15`, color: settings.textColor }}
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          
          {/* IN-PLACE SETTINGS POPUP MODAL */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSettingsOpen(true);
            }}
            className="rounded-lg p-1 text-xs font-bold"
            style={{ background: `${settings.textColor}15`, color: settings.textColor }}
            title="Display Settings"
          >
            <SettingsIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ROTATE-TO-LANDSCAPE MOBILE OVERLAY */}
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
                onClick={() => { enterFullscreen(); setPortraitHintDismissed(true); }}
                className="rounded-xl px-4 py-2.5 text-xs font-black shadow-md"
                style={{ background: settings.accentColor, color: '#ffffff' }}
              >
                Fullscreen Mode
              </button>
              <button
                onClick={() => setPortraitHintDismissed(true)}
                className="rounded-xl px-4 py-2.5 text-xs font-bold"
                style={{ background: `${settings.textColor}15`, color: settings.textColor }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP SETTINGS MODAL (IN-PLACE WITHOUT NAVIGATING AWAY) */}
      <SimpleSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
