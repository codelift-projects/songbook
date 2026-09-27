import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSongs } from '../store/SongContext';
import { useSettings } from '../store/SettingsContext';
import { projectorStyle, hexA } from '../lib/theme';
import { formatCommaLines } from '../lib/parse';
import SimpleSettingsModal from '../components/SimpleSettingsModal';
import { 
  ArrowLeft, 
  Play, 
  Settings as SettingsIcon, 
  ChevronLeft, 
  ChevronRight,
  BookOpen
} from 'lucide-react';

export default function SongViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { songs, loading } = useSongs();
  const { settings, update: updateSettings } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Find current song and calculate prev/next songs
  const currentIndex = useMemo(() => songs.findIndex((s) => s.id === id), [songs, id]);
  const song = songs[currentIndex];
  const prevSong = currentIndex > 0 ? songs[currentIndex - 1] : null;
  const nextSong = currentIndex >= 0 && currentIndex < songs.length - 1 ? songs[currentIndex + 1] : null;

  if (loading && !song) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-white text-slate-900 font-bold">
        Loading song...
      </div>
    );
  }

  if (!song) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-white text-slate-900 p-6 text-center">
        <div>
          <p className="mb-4 font-bold text-base">Song not found.</p>
          <button
            onClick={() => navigate('/')}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-black text-white"
          >
            Back to Songbook
          </button>
        </div>
      </div>
    );
  }

  const theme = projectorStyle(settings);
  const fontFamily = theme.fontFamily;
  const baseFontSize = Math.max(16, Math.min(22 * (settings.fontSizeScale || 1.0), 52));

  return (
    <div 
      className="min-h-screen flex flex-col selection:bg-emerald-200/40 select-text"
      style={{ ...theme }}
    >
      {/* Sticky Reader Top Bar */}
      <header 
        className="sticky top-0 z-30 border-b backdrop-blur-md px-3 py-2.5 transition-colors duration-200"
        style={{ 
          background: hexA(settings.background, 0.95),
          borderColor: hexA(settings.textColor, 0.12)
        }}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition shadow-2xs"
            style={{ 
              background: hexA(settings.textColor, 0.10),
              color: settings.textColor 
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>

          {/* Clean Center Pill (Song # & Mode, No duplicate title) */}
          <div className="flex items-center gap-1.5">
            <span 
              className="rounded-lg px-2.5 py-1 text-xs font-black shadow-2xs"
              style={{ 
                background: hexA(settings.accentColor, 0.16),
                color: settings.accentColor 
              }}
            >
              #{song.number || '•'}
            </span>
            <span 
              className="text-xs font-extrabold opacity-60 uppercase tracking-wider hidden xs:inline"
              style={{ color: settings.textColor }}
            >
              Reader View
            </span>
          </div>

          {/* Actions: Size A-, A+, Present, Settings */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => updateSettings({ fontSizeScale: Math.max(0.6, +(settings.fontSizeScale - 0.05).toFixed(2)) })}
              className="rounded-lg px-2 py-1 text-xs font-bold transition"
              style={{ 
                background: hexA(settings.textColor, 0.10),
                color: settings.textColor 
              }}
              title="Decrease text size"
            >
              A−
            </button>

            <button
              onClick={() => updateSettings({ fontSizeScale: Math.min(2.5, +(settings.fontSizeScale + 0.05).toFixed(2)) })}
              className="rounded-lg px-2 py-1 text-xs font-bold transition"
              style={{ 
                background: hexA(settings.textColor, 0.10),
                color: settings.textColor 
              }}
              title="Increase text size"
            >
              A+
            </button>

            {/* Quick Switch to Slide Projector */}
            <button
              onClick={() => navigate(`/present/${song.id}`)}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black transition shadow-xs"
              style={{ 
                background: settings.accentColor,
                color: '#ffffff'
              }}
              title="Switch to slide projector mode"
            >
              <Play className="h-3 w-3 fill-current" />
              <span>Present</span>
            </button>

            {/* Theme Settings Popup */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="rounded-lg p-1.5 text-xs font-bold transition"
              style={{ 
                background: hexA(settings.textColor, 0.10),
                color: settings.textColor 
              }}
              title="Theme settings"
            >
              <SettingsIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Scrollable Song Lyrics Body */}
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 space-y-6">
        {/* Single Primary Song Header Info */}
        <div 
          className="border-b pb-4 text-center space-y-1.5"
          style={{ borderColor: hexA(settings.textColor, 0.12) }}
        >
          <h1 
            className="text-2xl sm:text-3xl font-black tracking-tight leading-tight"
            style={{ fontFamily, color: settings.textColor }}
          >
            {song.title}
          </h1>

          {song.title_alt && (
            <p 
              className="text-sm font-semibold opacity-70 italic"
              style={{ fontFamily, color: settings.textColor }}
            >
              {song.title_alt}
            </p>
          )}

          <div className="flex items-center justify-center gap-2 pt-1 text-xs font-bold opacity-60">
            <span className="uppercase">{song.language || 'hindi'}</span>
            <span>•</span>
            <span>{(song.stanzas || []).length} stanzas</span>
          </div>
        </div>

        {/* Stanzas in sequence with dynamic comma line breaks */}
        <div className="space-y-6">
          {(song.stanzas || []).map((stanza, idx) => {
            const formattedText = formatCommaLines(stanza.text || '');
            return (
              <section 
                key={stanza.id || idx}
                className="rounded-2xl p-4 sm:p-5 transition-colors duration-150"
                style={{ 
                  background: hexA(settings.textColor, 0.04),
                  border: `1px solid ${hexA(settings.textColor, 0.08)}`
                }}
              >
                {stanza.label && (
                  <div 
                    className="text-xs font-black uppercase tracking-[0.2em] mb-2.5"
                    style={{ color: settings.accentColor, fontFamily }}
                  >
                    {stanza.label}
                  </div>
                )}

                <p 
                  className="whitespace-pre-line font-bold tracking-normal"
                  style={{ 
                    fontFamily,
                    fontSize: `${baseFontSize}px`,
                    lineHeight: settings.lineHeight || 1.35,
                    color: settings.textColor
                  }}
                >
                  {formattedText}
                </p>
              </section>
            );
          })}
        </div>

        {/* Bottom Prev / Next Song Navigation */}
        <div 
          className="border-t pt-6 flex items-center justify-between gap-3 text-xs font-bold"
          style={{ borderColor: hexA(settings.textColor, 0.12) }}
        >
          {prevSong ? (
            <button
              onClick={() => navigate(`/view/${prevSong.id}`)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 transition"
              style={{ 
                background: hexA(settings.textColor, 0.08),
                color: settings.textColor 
              }}
            >
              <ChevronLeft className="h-4 w-4" />
              <div className="text-left">
                <span className="text-[10px] opacity-60 block">Previous</span>
                <span className="truncate max-w-[120px] sm:max-w-[180px] block font-extrabold">
                  {prevSong.title}
                </span>
              </div>
            </button>
          ) : <div />}

          {nextSong ? (
            <button
              onClick={() => navigate(`/view/${nextSong.id}`)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 transition text-right"
              style={{ 
                background: hexA(settings.textColor, 0.08),
                color: settings.textColor 
              }}
            >
              <div className="text-right">
                <span className="text-[10px] opacity-60 block">Next</span>
                <span className="truncate max-w-[120px] sm:max-w-[180px] block font-extrabold">
                  {nextSong.title}
                </span>
              </div>
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : <div />}
        </div>
      </main>

      {/* In-Place Settings Popup Modal */}
      <SimpleSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
