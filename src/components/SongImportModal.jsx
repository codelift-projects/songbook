import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { parseLyrics, detectLanguage } from '../lib/parse';

function robustJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (initialErr) {
    const sanitized = text
      .replace(/,\s*([\]}])/g, '$1')
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'");
    try {
      return JSON.parse(sanitized);
    } catch {
      throw initialErr;
    }
  }
}

export default function SongImportModal({ isOpen, onClose, onImportSongs }) {
  const navigate = useNavigate();
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleOpenInEditor = () => {
    setError('');
    const raw = jsonText.trim();
    if (!raw) {
      setError('Please paste song JSON to continue.');
      return;
    }

    try {
      let parsed = robustJsonParse(raw);
      if (Array.isArray(parsed)) {
        parsed = parsed[0];
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.songs) && parsed.songs.length > 0) parsed = parsed.songs[0];
        else if (Array.isArray(parsed.data) && parsed.data.length > 0) parsed = parsed.data[0];
      }

      if (!parsed || typeof parsed !== 'object') {
        setError('Invalid song JSON object.');
        return;
      }

      const title = parsed.title || parsed.name || parsed.song_title || '';
      const titleAlt = parsed.title_alt || parsed.alt_title || '';
      
      let stanzas = [];
      if (Array.isArray(parsed.stanzas)) {
        stanzas = parsed.stanzas.map((st, i) => ({
          id: st.id || `st-${i + 1}`,
          label: st.label || `Verse ${i + 1}`,
          text: st.text || st.lyrics || '',
        }));
      } else if (typeof parsed.lyrics === 'string') {
        stanzas = parseLyrics(parsed.lyrics);
      } else if (typeof parsed.text === 'string') {
        stanzas = parseLyrics(parsed.text);
      }

      const songData = {
        title,
        title_alt: titleAlt,
        language: parsed.language || detectLanguage(title) || 'hindi',
        type: parsed.type === 'praise' ? 'praise' : 'worship',
        beat: parsed.beat || '',
        tempo: parsed.tempo != null ? String(parsed.tempo) : '',
        stanzas: stanzas.length > 0 ? stanzas : [{ id: 'st-1', label: 'Verse 1', text: '' }],
      };

      if (onImportSongs) {
        onImportSongs([songData]);
      } else {
        navigate('/songs/new', { state: songData });
      }

      onClose();
    } catch (err) {
      setError(`Invalid JSON: ${err.message}`);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setJsonText(text);
          setError('');
        }
      }
    } catch (e) {
      // Ignore clipboard permission errors
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl text-slate-900 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900">
              Import Song JSON
            </h3>
            <p className="text-xs text-slate-500">
              Paste song JSON below to open directly in the editor
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">
              Song JSON
            </label>
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              Paste from clipboard
            </button>
          </div>

          <textarea
            rows={8}
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setError('');
            }}
            placeholder='Paste JSON here (e.g. { "title": "Amazing Grace", "language": "english", "stanzas": [...] })'
            className="w-full rounded-xl border border-slate-200/90 p-3 text-xs font-mono text-slate-800 placeholder-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-slate-50/50 focus:bg-white"
          />

          {error && (
            <p className="text-xs font-semibold text-rose-600">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleOpenInEditor}
            className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-xs"
          >
            Open in Editor
          </button>
        </div>
      </div>
    </div>
  );
}
