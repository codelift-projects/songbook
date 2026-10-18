import { useState } from 'react';
import { X, Check } from 'lucide-react';

export default function SongExportModal({ isOpen, onClose, songs }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const cleanSongs = (songs || []).map((s) => ({
    number: s.number != null ? Number(s.number) : null,
    title: s.title || '',
    title_alt: s.title_alt || '',
    language: s.language || 'hindi',
    type: s.type || 'worship',
    beat: s.beat || null,
    tempo: s.tempo != null ? Number(s.tempo) : null,
    stanzas: (s.stanzas || []).map((st) => ({
      label: st.label || 'Verse',
      text: st.text || '',
    })),
  }));

  const jsonString = JSON.stringify(cleanSongs, null, 2);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(jsonString);
      } else {
        const ta = document.createElement('textarea');
        ta.value = jsonString;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      alert('Could not copy to clipboard: ' + err.message);
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
              Export Songs (JSON)
            </h3>
            <p className="text-xs text-slate-500">
              {cleanSongs.length} song{cleanSongs.length === 1 ? '' : 's'} ready to copy
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
          <textarea
            readOnly
            rows={9}
            value={jsonString}
            onClick={(e) => e.target.select()}
            className="w-full rounded-xl border border-slate-200/90 p-3 text-xs font-mono text-slate-800 bg-slate-50 focus:bg-white focus:outline-none select-all"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-xs"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Copied JSON!</span>
              </>
            ) : (
              <span>Copy JSON</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
