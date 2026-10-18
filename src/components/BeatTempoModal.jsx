import { useState, useEffect, useRef } from 'react';
import { X, Check, Activity, Music, Sparkles } from 'lucide-react';

const COMMON_BEATS = ['4/4', '3/4', '6/8', '2/4'];

export default function BeatTempoModal({ open, song, onClose, onSave }) {
  if (!open || !song) return null;

  const [songType, setSongType] = useState(song.type === 'praise' ? 'praise' : 'worship');
  const [beat, setBeat] = useState(song.beat || '4/4');
  const [tempo, setTempo] = useState(song.tempo != null ? Number(song.tempo) : 75);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Tap tempo state
  const tapTimesRef = useRef([]);
  const [tapDisplay, setTapDisplay] = useState(null);

  useEffect(() => {
    if (song) {
      setSongType(song.type === 'praise' ? 'praise' : 'worship');
      setBeat(song.beat || '4/4');
      setTempo(song.tempo != null ? Number(song.tempo) : 75);
      setSaveSuccess(false);
      tapTimesRef.current = [];
      setTapDisplay(null);
    }
  }, [song, open]);

  const handleTap = () => {
    const now = Date.now();
    const times = tapTimesRef.current.filter((t) => now - t < 3000);
    times.push(now);
    tapTimesRef.current = times;

    if (times.length >= 2) {
      const diffs = [];
      for (let i = 1; i < times.length; i++) {
        diffs.push(times[i] - times[i - 1]);
      }
      const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      const calculatedBpm = Math.round(60000 / avgDiff);
      if (calculatedBpm >= 30 && calculatedBpm <= 260) {
        setTempo(calculatedBpm);
        setTapDisplay(`${calculatedBpm} BPM`);
      }
    } else {
      setTapDisplay('Tap again...');
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      await onSave({
        type: songType,
        beat: beat ? String(beat).trim() : null,
        tempo: tempo ? Number(tempo) : null,
      });
      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      alert(`Error saving beat and tempo: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 text-slate-900 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <Activity className="h-4 w-4" />
            </span>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                Update Beat &amp; Tempo
              </h3>
              <p className="text-xs text-slate-500 font-medium truncate max-w-[240px]">
                {song.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-4">
          {/* Song Type */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5">
              Song Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSongType('praise')}
                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 px-3 text-xs font-black transition ${
                  songType === 'praise'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>Praise</span>
              </button>
              <button
                type="button"
                onClick={() => setSongType('worship')}
                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 px-3 text-xs font-black transition ${
                  songType === 'worship'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>Worship</span>
              </button>
            </div>
          </div>

          {/* Beat Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-black text-slate-700">
                Beat / Rhythm Signature
              </label>
              <span className="text-[11px] font-bold text-emerald-700">
                Current: {beat || 'None'}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {COMMON_BEATS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBeat(b)}
                  className={`rounded-xl border py-2 text-xs font-black transition ${
                    beat === b
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Or custom beat (e.g. 12/8, 2/4)..."
              value={beat}
              onChange={(e) => setBeat(e.target.value)}
              className="w-full rounded-xl border border-slate-200/90 bg-slate-50/60 px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          {/* Tempo (BPM) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-black text-slate-700">
                Tempo (BPM)
              </label>
              <span className="text-xs font-black text-emerald-700 flex items-center gap-1">
                ♩ {tempo} BPM
              </span>
            </div>

            {/* Slider and direct input */}
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="40"
                max="200"
                step="1"
                value={tempo}
                onChange={(e) => setTempo(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <input
                type="number"
                min="30"
                max="260"
                value={tempo}
                onChange={(e) => setTempo(Number(e.target.value))}
                className="w-16 rounded-xl border border-slate-200 text-center py-1.5 text-xs font-black text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            {/* Quick +/- buttons and Tap Tempo */}
            <div className="flex items-center justify-between gap-1.5 pt-2">
              <div className="flex items-center gap-1">
                {[-5, -1, +1, +5].map((delta) => (
                  <button
                    key={delta}
                    type="button"
                    onClick={() => setTempo((t) => Math.max(30, Math.min(260, t + delta)))}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    {delta > 0 ? `+${delta}` : delta}
                  </button>
                ))}
              </div>

              {/* Tap Tempo Button */}
              <button
                type="button"
                onClick={handleTap}
                className="rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-1.5 text-xs font-black transition active:scale-95 shadow-2xs shrink-0"
                title="Tap rhythmically to detect BPM"
              >
                {tapDisplay || 'Tap Tempo'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer with Supabase status & Actions */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            <span>Saves to Supabase</span>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white transition shadow-sm active:scale-95 ${
                saveSuccess
                  ? 'bg-emerald-700 shadow-emerald-700/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
              }`}
            >
              {saveSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Saved!</span>
                </>
              ) : saving ? (
                <span>Saving to Supabase...</span>
              ) : (
                <span>Save Updates</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
