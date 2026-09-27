import { useState, useRef, useMemo } from 'react';
import { parseLyrics, detectLanguage } from '../lib/parse';
import { downloadSampleJsonTemplate } from '../lib/export';
import { useSongs } from '../store/SongContext';
import { 
  Upload, 
  FileJson, 
  FileText, 
  Check, 
  AlertCircle, 
  X, 
  Layers, 
  CheckCircle2,
  DownloadCloud,
  Search,
  CheckSquare,
  Square,
  AlertTriangle,
  Filter
} from 'lucide-react';

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
    } catch (secondErr) {
      throw initialErr;
    }
  }
}

function normalizeTitleForCompare(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
    .trim();
}

export default function SongImportModal({ isOpen, onClose, onImportSongs }) {
  const { songs: existingSongs } = useSongs();
  const [tab, setTab] = useState('json');
  const fileInputRef = useRef(null);

  // JSON mode state
  const [jsonText, setJsonText] = useState('');
  const [parsedJsonSongs, setParsedJsonSongs] = useState([]);
  const [jsonError, setJsonError] = useState('');
  const [importSearch, setImportSearch] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  // Text / Lyrics mode state
  const [lyricsTitle, setLyricsTitle] = useState('');
  const [lyricsAltTitle, setLyricsAltTitle] = useState('');
  const [lyricsLang, setLyricsLang] = useState('hindi'); // 'hindi' | 'marathi' | 'english'
  const [rawLyricsText, setRawLyricsText] = useState('');
  const [parsedStanzas, setParsedStanzas] = useState([]);

  // Check if manual title is duplicate
  const manualDuplicateMatch = useMemo(() => {
    if (!lyricsTitle.trim()) return null;
    const clean = normalizeTitleForCompare(lyricsTitle);
    return existingSongs.find(
      (s) => normalizeTitleForCompare(s.title) === clean || (s.title_alt && normalizeTitleForCompare(s.title_alt) === clean)
    );
  }, [lyricsTitle, existingSongs]);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result;
      if (typeof content === 'string') {
        setJsonText(content);
        validateAndParseJson(content, skipDuplicates);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const validateAndParseJson = (raw, shouldSkipDups = skipDuplicates) => {
    setJsonError('');
    if (!raw.trim()) {
      setParsedJsonSongs([]);
      return;
    }
    try {
      const parsed = robustJsonParse(raw);
      
      let list = [];
      if (Array.isArray(parsed)) {
        list = parsed;
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.songs)) list = parsed.songs;
        else if (Array.isArray(parsed.data)) list = parsed.data;
        else if (Array.isArray(parsed.items)) list = parsed.items;
        else list = [parsed];
      }

      const normalized = list.map((item, idx) => {
        const title = item.title || item.name || item.heading || item.song_title || `Song ${idx + 1}`;
        const titleAlt = item.title_alt || item.alt_title || item.transliteration || '';
        
        let stanzas = [];
        if (Array.isArray(item.stanzas)) {
          stanzas = item.stanzas.map((st, sIdx) => ({
            id: st.id || `st-${sIdx}`,
            label: st.label || st.type || (detectLanguage(title) === 'marathi' ? `चरण ${sIdx + 1}` : detectLanguage(title) === 'hindi' ? `पद ${sIdx + 1}` : `Verse ${sIdx + 1}`),
            text: st.text || st.lyrics || st.content || '',
          }));
        } else if (Array.isArray(item.verses)) {
          stanzas = item.verses.map((st, sIdx) => ({
            id: `st-${sIdx}`,
            label: st.label || `Verse ${sIdx + 1}`,
            text: typeof st === 'string' ? st : (st.text || st.lyrics || ''),
          }));
        } else if (typeof item.lyrics === 'string') {
          stanzas = parseLyrics(item.lyrics);
        } else if (typeof item.text === 'string') {
          stanzas = parseLyrics(item.text);
        }

        const lang = item.language || detectLanguage(title + ' ' + (stanzas[0]?.text || ''));

        // Duplicate checking against current library
        const cleanTitle = normalizeTitleForCompare(title);
        const cleanAlt = normalizeTitleForCompare(titleAlt);
        const existingMatch = existingSongs.find((s) => {
          const sTitle = normalizeTitleForCompare(s.title);
          const sAlt = normalizeTitleForCompare(s.title_alt);
          return (cleanTitle && sTitle === cleanTitle) || (cleanAlt && sAlt === cleanAlt);
        });

        const isDuplicate = Boolean(existingMatch);

        return {
          id: item.id || `import-${Date.now()}-${idx}`,
          number: item.number != null && item.number !== '' ? Number(item.number) : null,
          title,
          title_alt: titleAlt,
          language: lang,
          stanzas,
          isDuplicate,
          existingMatch,
          selected: isDuplicate ? !shouldSkipDups : true,
        };
      });

      if (normalized.length === 0) {
        setJsonError('No songs found in the provided JSON data.');
      }
      setParsedJsonSongs(normalized);
    } catch (err) {
      setJsonError(`Invalid JSON format: ${err.message}`);
      setParsedJsonSongs([]);
    }
  };

  const handleJsonTextChange = (e) => {
    const val = e.target.value;
    setJsonText(val);
    validateAndParseJson(val);
  };

  const handleToggleSkipDuplicates = (enabled) => {
    setSkipDuplicates(enabled);
    setParsedJsonSongs((prev) =>
      prev.map((s) => (s.isDuplicate ? { ...s, selected: !enabled } : s))
    );
  };

  const toggleSongSelection = (index) => {
    setParsedJsonSongs((prev) => {
      const copy = [...prev];
      copy[index].selected = !copy[index].selected;
      return copy;
    });
  };

  const selectAll = () => {
    setParsedJsonSongs((prev) => prev.map((s) => ({ ...s, selected: true })));
  };

  const selectOnlyNew = () => {
    setParsedJsonSongs((prev) => prev.map((s) => ({ ...s, selected: !s.isDuplicate })));
    setSkipDuplicates(true);
  };

  const deselectAll = () => {
    setParsedJsonSongs((prev) => prev.map((s) => ({ ...s, selected: false })));
  };

  const handleLyricsChange = (text) => {
    setRawLyricsText(text);
    if (!text.trim()) {
      setParsedStanzas([]);
      return;
    }
    const detected = detectLanguage(text);
    if (detected && detected !== lyricsLang) {
      setLyricsLang(detected);
    }
    const stanzas = parseLyrics(text);
    setParsedStanzas(stanzas);
  };

  const handleConfirmJsonImport = () => {
    const toImport = parsedJsonSongs
      .filter((s) => s.selected)
      .map(({ id, number, title, title_alt, language, stanzas }) => ({
        id,
        number,
        title,
        title_alt,
        language,
        stanzas,
      }));

    if (toImport.length === 0) {
      alert('Please select at least one song to import.');
      return;
    }

    onImportSongs(toImport);
    onClose();
  };

  const handleConfirmManualImport = () => {
    if (!lyricsTitle.trim()) {
      alert('Please enter a song title.');
      return;
    }
    if (parsedStanzas.length === 0) {
      alert('Please enter lyrics text to create stanzas.');
      return;
    }

    if (manualDuplicateMatch && !window.confirm(`A song named "${lyricsTitle}" already exists (#${manualDuplicateMatch.number || ''}). Do you still want to import it?`)) {
      return;
    }

    const newSong = {
      title: lyricsTitle.trim(),
      title_alt: lyricsAltTitle.trim() || null,
      language: lyricsLang,
      stanzas: parsedStanzas,
    };

    onImportSongs([newSong]);
    onClose();
  };

  const duplicateCount = parsedJsonSongs.filter((s) => s.isDuplicate).length;
  const newCount = parsedJsonSongs.length - duplicateCount;
  const selectedCount = parsedJsonSongs.filter((s) => s.selected).length;

  const filteredPreviewSongs = parsedJsonSongs.filter((s) => {
    if (!importSearch.trim()) return true;
    const q = importSearch.toLowerCase();
    return s.title.toLowerCase().includes(q) || (s.title_alt && s.title_alt.toLowerCase().includes(q));
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div 
        className="relative flex flex-col w-full max-w-2xl max-h-[90vh] rounded-2xl border border-slate-200 bg-white shadow-2xl text-slate-900 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/20">
              <Upload className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-black tracking-tight text-slate-900">
                Import Songs
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Bulk JSON import or smart text parser with duplicate protection
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 px-5 pt-2 bg-white gap-2">
          <button
            onClick={() => setTab('json')}
            className={`flex items-center gap-1.5 border-b-2 py-2.5 px-3 text-xs font-bold transition ${
              tab === 'json'
                ? 'border-emerald-600 text-emerald-700 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileJson className="h-3.5 w-3.5" />
            <span>JSON Bulk Import</span>
          </button>

          <button
            onClick={() => setTab('text')}
            className={`flex items-center gap-1.5 border-b-2 py-2.5 px-3 text-xs font-bold transition ${
              tab === 'text'
                ? 'border-emerald-600 text-emerald-700 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Single Song Lyrics Parser</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {tab === 'json' && (
            <div className="space-y-4">
              {/* File upload and Sample template download */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-black text-white hover:bg-emerald-700 shadow-sm transition"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload JSON File</span>
                  </button>

                  <span className="text-xs font-medium text-slate-500">or paste JSON below</span>
                </div>

                <button
                  type="button"
                  onClick={downloadSampleJsonTemplate}
                  className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 underline transition"
                >
                  <DownloadCloud className="h-3.5 w-3.5" />
                  <span>Download Sample JSON Template</span>
                </button>
              </div>

              {/* JSON Textarea */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Paste JSON Array or Object
                </label>
                <textarea
                  value={jsonText}
                  onChange={handleJsonTextChange}
                  rows={4}
                  placeholder={`[\n  {\n    "title": "तेरी स्तुति और आराधना",\n    "language": "hindi",\n    "stanzas": [\n      { "label": "कोरस", "text": "तेरी स्तुति और आराधना..." }\n    ]\n  }\n]`}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 font-mono text-xs text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-none transition shadow-2xs"
                />
              </div>

              {jsonError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{jsonError}</span>
                </div>
              )}

              {/* Duplicate Detection Alert & Smart Filter */}
              {parsedJsonSongs.length > 0 && duplicateCount > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-amber-200 bg-amber-50/90 p-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>
                      {duplicateCount} song{duplicateCount === 1 ? '' : 's'} already present in your songbook.
                    </span>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-900 bg-white/80 border border-amber-300 rounded-lg px-2.5 py-1 shadow-2xs">
                    <input
                      type="checkbox"
                      checked={skipDuplicates}
                      onChange={(e) => handleToggleSkipDuplicates(e.target.checked)}
                      className="h-4 w-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                    />
                    <span>Skip already existing songs</span>
                  </label>
                </div>
              )}

              {/* Parsed Songs Preview */}
              {parsedJsonSongs.length > 0 && (
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-900">
                        {selectedCount} of {parsedJsonSongs.length} Selected
                      </span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        {newCount} New
                      </span>
                      {duplicateCount > 0 && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          {duplicateCount} Duplicates
                        </span>
                      )}
                    </div>

                    {/* Quick Selection Filter Actions */}
                    <div className="flex items-center gap-2 text-xs">
                      {duplicateCount > 0 && (
                        <button
                          type="button"
                          onClick={selectOnlyNew}
                          className="font-bold text-emerald-700 hover:underline"
                        >
                          Only New
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={selectAll}
                        className="font-bold text-slate-600 hover:text-slate-900"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={deselectAll}
                        className="font-bold text-slate-600 hover:text-slate-900"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {/* Search within preview */}
                  {parsedJsonSongs.length > 5 && (
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Filter preview..."
                        value={importSearch}
                        onChange={(e) => setImportSearch(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  )}

                  {/* Song List in Preview */}
                  <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white">
                    {filteredPreviewSongs.map((song, idx) => {
                      const realIndex = parsedJsonSongs.findIndex((s) => s.id === song.id);
                      return (
                        <div
                          key={song.id || idx}
                          onClick={() => toggleSongSelection(realIndex)}
                          className={`flex items-center justify-between gap-3 p-2.5 cursor-pointer transition ${
                            song.selected
                              ? song.isDuplicate
                                ? 'bg-amber-50/50'
                                : 'bg-emerald-50/40'
                              : 'bg-white opacity-60 hover:opacity-100'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {song.selected ? (
                              <CheckSquare className="h-4 w-4 text-emerald-600 shrink-0" />
                            ) : (
                              <Square className="h-4 w-4 text-slate-400 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-slate-900">
                                {song.title}
                              </p>
                              {song.title_alt && (
                                <p className="truncate text-[10px] text-slate-400 italic">
                                  {song.title_alt}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {song.isDuplicate ? (
                              <span className="rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-extrabold text-amber-900">
                                {song.selected ? 'Will Overwrite/Add' : 'Will Skip'}
                              </span>
                            ) : (
                              <span className="rounded-md bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                                New
                              </span>
                            )}
                            <span className="text-[10px] font-semibold text-slate-400">
                              {song.stanzas.length} stanzas
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'text' && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Song Title *
                  </label>
                  <input
                    type="text"
                    value={lyricsTitle}
                    onChange={(e) => setLyricsTitle(e.target.value)}
                    placeholder="e.g. Teri Stuti Aur Aradhana"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Language
                  </label>
                  <select
                    value={lyricsLang}
                    onChange={(e) => setLyricsLang(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-600 focus:outline-none"
                  >
                    <option value="hindi">हिन्दी (Hindi)</option>
                    <option value="marathi">मराठी (Marathi)</option>
                    <option value="english">English</option>
                  </select>
                </div>
              </div>

              {manualDuplicateMatch && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs font-bold text-amber-900">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    A song with this title is already present (#{manualDuplicateMatch.number || '•'} {manualDuplicateMatch.title}).
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lyrics (Auto-detects Chorus / Verses separated by blank lines)
                </label>
                <textarea
                  value={rawLyricsText}
                  onChange={(e) => handleLyricsChange(e.target.value)}
                  rows={6}
                  placeholder={`कोरस:\nतेरी स्तुति और आराधना करता रहूँ मैं सदा\nदिल से तूझे धन्यवाद देता रहूँ मैं सदा\n\nपद 1:\nसृष्टि के कण-कण में है तेरी महिमा\nचाँद सितारों में है तेरी गरिमा`}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-none"
                />
              </div>

              {parsedStanzas.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
                  <span className="text-xs font-extrabold text-slate-800">
                    Detected {parsedStanzas.length} Stanza(s):
                  </span>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {parsedStanzas.map((st, i) => (
                      <div key={i} className="rounded-lg border border-slate-200 bg-white p-2 text-xs">
                        <span className="font-extrabold text-emerald-700 block mb-0.5 uppercase text-[10px]">
                          {st.label}
                        </span>
                        <p className="line-clamp-2 text-slate-600 whitespace-pre-line text-[11px]">
                          {st.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5 bg-slate-50/50">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </button>

          {tab === 'json' ? (
            <button
              onClick={handleConfirmJsonImport}
              disabled={selectedCount === 0}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20 transition"
            >
              <Check className="h-4 w-4" />
              <span>Import {selectedCount} Selected Song{selectedCount === 1 ? '' : 's'}</span>
            </button>
          ) : (
            <button
              onClick={handleConfirmManualImport}
              disabled={!lyricsTitle.trim() || parsedStanzas.length === 0}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20 transition"
            >
              <Check className="h-4 w-4" />
              <span>Add Song to Songbook</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
