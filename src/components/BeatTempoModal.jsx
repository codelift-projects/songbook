import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function BeatTempoModal({ open, song, onClose, onSave }) {
  if (!open || !song) return null;

  const [songType, setSongType] = useState(
    song.type === 'praise' ? 'praise' : song.type === 'carol' ? 'carol' : 'worship'
  );
  const [beat, setBeat] = useState(song.beat || '');
  const [tempo, setTempo] = useState(song.tempo != null ? Math.round(Number(song.tempo)) : 75);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (song) {
      setSongType(
        song.type === 'praise' ? 'praise' : song.type === 'carol' ? 'carol' : 'worship'
      );
      setBeat(song.beat || '');
      setTempo(song.tempo != null ? Math.round(Number(song.tempo)) : 75);
    }
  }, [song, open]);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      await onSave({
        type: songType,
        beat: beat ? String(beat).trim() : null,
        tempo: tempo ? parseInt(tempo, 10) : null,
      });
      onClose();
    } catch (err) {
      alert(`Error saving: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 text-slate-900 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              Update Beat &amp; Tempo
            </h3>
            <p className="text-xs text-slate-500 truncate max-w-[220px]">
              {song.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Simple Form */}
        <form onSubmit={handleSave} className="space-y-3.5">
          {/* Type Selection: Worship, Praise, and Carol */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Type
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setSongType('worship')}
                className={`py-2 px-1 text-center rounded-xl border text-xs font-bold transition ${
                  songType === 'worship'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Worship
              </button>
              <button
                type="button"
                onClick={() => setSongType('praise')}
                className={`py-2 px-1 text-center rounded-xl border text-xs font-bold transition ${
                  songType === 'praise'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-800 ring-1 ring-indigo-600 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Praise
              </button>
              <button
                type="button"
                onClick={() => setSongType('carol')}
                className={`py-2 px-1 text-center rounded-xl border text-xs font-bold transition ${
                  songType === 'carol'
                    ? 'border-amber-600 bg-amber-50 text-amber-800 ring-1 ring-amber-600 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Carol
              </button>
            </div>
          </div>

          {/* Beat: Simple int/text */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Beat
            </label>
            <input
              type="text"
              placeholder="e.g. 13, 31, 37..."
              value={beat}
              onChange={(e) => setBeat(e.target.value)}
              className="w-full rounded-xl border border-slate-200/90 px-3 py-2 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          {/* Tempo: Simple integer number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tempo (BPM)
            </label>
            <input
              type="number"
              min="30"
              max="260"
              step="1"
              placeholder="75"
              value={tempo}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setTempo(isNaN(val) ? '' : val);
              }}
              className="w-full rounded-xl border border-slate-200/90 px-3 py-2 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
