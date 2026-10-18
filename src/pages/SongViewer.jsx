import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSongs } from '../store/SongContext';
import { useSettings } from '../store/SettingsContext';
import { projectorStyle, hexA } from '../lib/theme';
import { formatCommaLines } from '../lib/parse';
import { getGroup } from '../lib/groups';
import {
  fetchIncompleteFlags,
  markSongIncomplete,
  unmarkSongIncomplete,
  isSongIncomplete,
} from '../lib/songIncomplete';
import SimpleSettingsModal from '../components/SimpleSettingsModal';
import AddToGroupModal from '../components/AddToGroupModal';
import { 
  ArrowLeft, 
  Play, 
  Settings as SettingsIcon, 
  ChevronLeft, 
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  X,
  Flag,
  Layers
} from 'lucide-react';

export default function SongViewer() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get('groupId');
  const navigate = useNavigate();
  const { songs, loading } = useSongs();
  const { settings, update: updateSettings } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isAddToGroupOpen, setIsAddToGroupOpen] = useState(false);

  // Group context if opened within a group/collection
  const group = useMemo(() => (groupId ? getGroup(groupId) : null), [groupId]);

  // Incomplete Flagging state
  const [incompleteFlags, setIncompleteFlags] = useState({});
  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false);
  const [flagNotes, setFlagNotes] = useState('');
  const [submittingFlag, setSubmittingFlag] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Find current song
  const currentIndex = useMemo(() => songs.findIndex((s) => s.id === id), [songs, id]);
  const song = songs[currentIndex];

  // Group-specific prev / next song calculation
  const groupSongIndex = useMemo(() => {
    if (!group || !song) return -1;
    return group.songIds.indexOf(song.id);
  }, [group, song]);

  const prevGroupSong = useMemo(() => {
    if (!group || groupSongIndex <= 0) return null;
    const prevId = group.songIds[groupSongIndex - 1];
    return songs.find((s) => s.id === prevId) || null;
  }, [group, groupSongIndex, songs]);

  const nextGroupSong = useMemo(() => {
    if (!group || groupSongIndex < 0 || groupSongIndex >= group.songIds.length - 1) return null;
    const nextId = group.songIds[groupSongIndex + 1];
    return songs.find((s) => s.id === nextId) || null;
  }, [group, groupSongIndex, songs]);

  // Always scroll to top immediately when song opens or switches
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [id]);

  // Load incomplete flags on mount
  useEffect(() => {
    fetchIncompleteFlags().then((flags) => {
      if (flags) setIncompleteFlags(flags);
    });
  }, []);

  const markedIncomplete = useMemo(() => {
    return isSongIncomplete(song, incompleteFlags);
  }, [song, incompleteFlags]);

  const currentFlagData = useMemo(() => {
    if (!song || !song.title) return null;
    return incompleteFlags[song.title.trim().toLowerCase()] || null;
  }, [song, incompleteFlags]);

  const handleMarkIncomplete = async () => {
    if (!song) return;
    try {
      setSubmittingFlag(true);
      const updated = await markSongIncomplete(song, flagNotes);
      setIncompleteFlags(updated);
      setIsFlagModalOpen(false);
      setFlagNotes('');
      setToastMessage('Song marked as incomplete (saved to Supabase)');
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error('Error marking song as incomplete:', err);
      setToastMessage(err.message || 'Error updating status');
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setSubmittingFlag(false);
    }
  };

  const handleUnmarkIncomplete = async () => {
    if (!song) return;
    try {
      setSubmittingFlag(true);
      const updated = await unmarkSongIncomplete(song);
      setIncompleteFlags(updated || {});
      setToastMessage('Song marked as resolved / complete');
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error('Error resolving incomplete song:', err);
    } finally {
      setSubmittingFlag(false);
    }
  };

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
  const baseFontSize = Math.max(16, Math.min(22 * (settings.fontSizeScale || 1.0), 68));

  return (
    <div 
      className="min-h-screen flex flex-col selection:bg-emerald-200/40 select-text w-full max-w-full overflow-x-hidden"
      style={{ ...theme }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 sm:top-20 right-4 left-4 sm:left-auto sm:max-w-md z-50 flex items-center gap-2.5 rounded-2xl bg-slate-900/95 text-white p-3.5 shadow-xl border border-slate-800 backdrop-blur-md text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="flex-1 truncate">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Sticky Reader Top Bar */}
      <header 
        className="sticky top-0 z-30 border-b backdrop-blur-md px-3 py-2.5 transition-colors duration-200 w-full"
        style={{ 
          background: hexA(settings.background, 0.95),
          borderColor: hexA(settings.textColor, 0.12)
        }}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2">
          {/* Back Button */}
          <button
            onClick={() => (groupId ? navigate(`/groups/${groupId}`) : navigate(-1))}
            className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition shadow-2xs active:scale-95"
            style={{ 
              background: hexA(settings.textColor, 0.10),
              color: settings.textColor 
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>

          {/* Clean Center: Group collection pill (if viewing from a collection) */}
          <div className="flex items-center gap-1.5 min-w-0">
            {group && (
              <button
                type="button"
                onClick={() => navigate(`/groups/${group.id}`)}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-black shadow-2xs transition hover:opacity-90 max-w-[200px] truncate"
                style={{ 
                  background: hexA(settings.accentColor, 0.16),
                  color: settings.accentColor 
                }}
                title={`Collection: ${group.name}`}
              >
                <Layers className="h-3 w-3 shrink-0" />
                <span className="truncate">{group.name}</span>
                <span className="opacity-70 text-[10px] shrink-0 font-normal">
                  ({groupSongIndex + 1}/{group.songIds.length})
                </span>
              </button>
            )}
          </div>

          {/* Actions: Size A-, A+, Present, Flag Incomplete, Settings */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => updateSettings({ fontSizeScale: Math.max(0.5, +(settings.fontSizeScale - 0.05).toFixed(2)) })}
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
              onClick={() => navigate(`/present/${song.id}${groupId ? `?groupId=${groupId}` : ''}`)}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black transition shadow-xs active:scale-95"
              style={{ 
                background: settings.accentColor,
                color: '#ffffff'
              }}
              title="Switch to slide projector mode"
            >
              <Play className="h-3 w-3 fill-current" />
              <span>Present</span>
            </button>

            {/* Add to Group / Collection */}
            <button
              onClick={() => setIsAddToGroupOpen(true)}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition shadow-xs active:scale-95"
              style={{ 
                background: hexA(settings.textColor, 0.10),
                color: settings.textColor 
              }}
              title="Add to group or collection"
            >
              <Layers className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Group</span>
            </button>

            {/* Flag as Incomplete button */}
            <button
              onClick={() => {
                if (markedIncomplete) {
                  handleUnmarkIncomplete();
                } else {
                  setIsFlagModalOpen(true);
                }
              }}
              className={`rounded-lg p-1.5 text-xs font-bold transition active:scale-95 ${
                markedIncomplete ? 'ring-1 ring-amber-400 bg-amber-500/20 text-amber-500' : ''
              }`}
              style={{ 
                background: markedIncomplete ? 'rgba(245, 158, 11, 0.2)' : hexA(settings.textColor, 0.10),
                color: markedIncomplete ? '#f59e0b' : settings.textColor 
              }}
              title={markedIncomplete ? 'Song is marked as incomplete. Click to resolve.' : 'Mark this song as incomplete / requires edit'}
            >
              <Flag className="h-4 w-4" />
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
        {/* If Marked Incomplete Banner */}
        {markedIncomplete && (
          <div className="flex items-start justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 p-3.5 text-amber-900 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-xs">
                <p className="font-extrabold text-amber-900">Marked as Incomplete (Requires Edit)</p>
                <p className="text-amber-800 opacity-90 leading-relaxed">
                  {currentFlagData?.notes || 'This song has been flagged as having incomplete lyrics or missing stanzas.'}
                </p>
                <p className="text-[10px] text-amber-600 font-semibold pt-1">
                  Saved & retained in Supabase
                </p>
              </div>
            </div>
            <button
              onClick={handleUnmarkIncomplete}
              disabled={submittingFlag}
              className="shrink-0 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 text-xs font-bold transition active:scale-95 shadow-2xs"
            >
              Resolve
            </button>
          </div>
        )}

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

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs font-bold opacity-60">
            <span>{(song.stanzas || []).length} stanzas</span>
          </div>

          {/* Badges for Type, Beat, Tempo */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1.5">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider ${
                song.type === 'praise'
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {song.type === 'praise' ? 'Praise' : 'Worship'}
            </span>
            {song.beat && (
              <span 
                className="rounded-full px-2 py-0.5 text-[11px] font-bold border opacity-90"
                style={{ 
                  background: hexA(settings.textColor, 0.06),
                  borderColor: hexA(settings.textColor, 0.15),
                  color: settings.textColor 
                }}
              >
                Beat: {song.beat}
              </span>
            )}
            {song.tempo && (
              <span 
                className="rounded-full px-2 py-0.5 text-[11px] font-bold border opacity-90"
                style={{ 
                  background: hexA(settings.textColor, 0.06),
                  borderColor: hexA(settings.textColor, 0.15),
                  color: settings.textColor 
                }}
              >
                ♩ {song.tempo} BPM
              </span>
            )}
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

        {/* Bottom Group Navigation - Only shown when viewing within a group */}
        {group && (
          <div 
            className="border-t pt-6 flex items-center justify-between gap-3 text-xs font-bold"
            style={{ borderColor: hexA(settings.textColor, 0.12) }}
          >
            {prevGroupSong ? (
              <button
                type="button"
                onClick={() => navigate(`/view/${prevGroupSong.id}?groupId=${group.id}`)}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 transition shadow-2xs active:scale-95 text-left"
                style={{ 
                  background: hexA(settings.textColor, 0.08),
                  color: settings.textColor 
                }}
              >
                <ChevronLeft className="h-4 w-4" />
                <div className="text-left">
                  <span className="text-[10px] opacity-60 block">Previous</span>
                  <span className="truncate max-w-[120px] sm:max-w-[180px] block font-extrabold">
                    {prevGroupSong.title}
                  </span>
                </div>
              </button>
            ) : <div />}

            <button
              type="button"
              onClick={() => navigate(`/groups/${group.id}`)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition hover:opacity-85 shadow-2xs"
              style={{ 
                background: hexA(settings.textColor, 0.06),
                color: settings.textColor 
              }}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>{group.name} ({groupSongIndex + 1}/{group.songIds.length})</span>
            </button>

            {nextGroupSong ? (
              <button
                type="button"
                onClick={() => navigate(`/view/${nextGroupSong.id}?groupId=${group.id}`)}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 transition shadow-2xs active:scale-95 text-right"
                style={{ 
                  background: hexA(settings.textColor, 0.08),
                  color: settings.textColor 
                }}
              >
                <div className="text-right">
                  <span className="text-[10px] opacity-60 block">Next</span>
                  <span className="truncate max-w-[120px] sm:max-w-[180px] block font-extrabold">
                    {nextGroupSong.title}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : <div />}
          </div>
        )}
      </main>

      {/* Flag Incomplete Song Modal */}
      {isFlagModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 text-slate-900 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <h3 className="font-bold text-base text-slate-900">Mark Song as Incomplete</h3>
              </div>
              <button
                onClick={() => setIsFlagModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Flag <strong>"{song.title}"</strong> as requiring edit. This will be recorded and retained in Supabase so editors know which stanzas or lyrics need correction.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Notes on what needs edit (optional):
              </label>
              <textarea
                value={flagNotes}
                onChange={(e) => setFlagNotes(e.target.value)}
                placeholder="e.g. Verse 3 is missing, lyrics cut off, typo in chorus..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsFlagModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMarkIncomplete}
                disabled={submittingFlag}
                className="rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white transition shadow-sm shadow-amber-600/20 active:scale-95"
              >
                {submittingFlag ? 'Saving to Supabase...' : 'Mark as Incomplete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-Place Settings Popup Modal */}
      <SimpleSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Add To Group / Collection Modal */}
      <AddToGroupModal
        open={isAddToGroupOpen}
        song={song}
        onClose={() => setIsAddToGroupOpen(false)}
      />
    </div>
  );
}
