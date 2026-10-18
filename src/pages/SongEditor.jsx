import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useSongs } from '../store/SongContext';
import { useSettings } from '../store/SettingsContext';
import { projectorStyle, FONT_STACKS } from '../lib/theme';
import { isSeedSong } from '../lib/seed';
import { formatCommaLines, NEXT_LINE_SHIFT_SYMBOL } from '../lib/parse';
import SongImportModal from '../components/SongImportModal';
import {
  ArrowLeft,
  Trash2,
  MoveUp,
  MoveDown,
  Copy
} from 'lucide-react';

export default function SongEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { songs, addSong, editSong, updateSongBeatTempo } = useSongs();
  const { settings } = useSettings();

  const isEdit = Boolean(id);

  const [number, setNumber] = useState('');
  const [title, setTitle] = useState('');
  const [titleAlt, setTitleAlt] = useState('');
  const [language, setLanguage] = useState('hindi'); // 'hindi' | 'marathi' | 'english'
  const [songType, setSongType] = useState('worship'); // 'praise' | 'worship'
  const [beat, setBeat] = useState('13');
  const [tempo, setTempo] = useState('75');
  const [stanzas, setStanzas] = useState([
    { id: 'st-1', label: 'Verse 1', text: '' },
    { id: 'st-2', label: 'Chorus', text: '' },
  ]);

  const [isSeed, setIsSeed] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [previewSlideIdx, setPreviewSlideIdx] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [mobileTab, setMobileTab] = useState('edit'); // 'edit' | 'preview'

  // Initialize from location state if duplicating or from query parameters (e.g. from missing songs)
  useEffect(() => {
    if (!isEdit) {
      if (location.state) {
        if (location.state.title) setTitle(location.state.title);
        if (location.state.title_alt) setTitleAlt(location.state.title_alt);
        if (location.state.language) setLanguage(location.state.language);
        if (location.state.type) setSongType(location.state.type);
        if (location.state.beat) setBeat(location.state.beat);
        if (location.state.tempo) setTempo(String(location.state.tempo));
        if (location.state.stanzas && location.state.stanzas.length) {
          setStanzas(location.state.stanzas);
        }
      } else if (location.search) {
        const params = new URLSearchParams(location.search);
        const queryTitle = params.get('title');
        if (queryTitle) setTitle(queryTitle);
      }
    }
  }, [isEdit, location.state, location.search]);

  // Auto suggest next song number for new songs
  useEffect(() => {
    if (!isEdit && songs.length > 0 && !number) {
      const maxNum = songs.reduce((max, s) => {
        const n = typeof s.number === 'number' ? s.number : parseInt(s.number, 10);
        return !isNaN(n) && n > max ? n : max;
      }, 0);
      if (maxNum > 0) {
        setNumber(String(maxNum + 1));
      }
    }
  }, [isEdit, songs, number]);

  // Load existing song if editing
  useEffect(() => {
    if (isEdit && songs.length > 0) {
      const existing = songs.find((s) => String(s.id) === String(id));
      if (existing) {
        setNumber(existing.number != null ? String(existing.number) : '');
        setTitle(existing.title || '');
        setTitleAlt(existing.title_alt || '');
        setLanguage(existing.language || 'hindi');
        setSongType(existing.type === 'praise' ? 'praise' : 'worship');
        setBeat(existing.beat || '4/4');
        setTempo(existing.tempo != null ? String(existing.tempo) : '75');
        setStanzas(
          existing.stanzas && existing.stanzas.length > 0
            ? existing.stanzas
            : [{ id: 'st-1', label: 'Verse 1', text: '' }]
        );
        setIsSeed(isSeedSong(existing));
      }
    }
  }, [isEdit, id, songs]);

  const handleDuplicateToDb = () => {
    navigate('/songs/new', {
      state: {
        title: `${title} (copy)`,
        title_alt: titleAlt ? `${titleAlt} (copy)` : '',
        language,
        type: songType,
        beat,
        tempo,
        stanzas: stanzas.map((st) => ({
          id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          label: st.label,
          text: st.text,
        })),
      },
    });
  };

  const handleAddStanza = (labelPreset = '') => {
    let label = labelPreset;

    if (!label) {
      const verseMatches = stanzas.filter(s =>
        s.label.toLowerCase().includes('verse') ||
        s.label.includes('पद') ||
        s.label.includes('चरण') ||
        s.label.includes('कडवे')
      );
      const nextNum = verseMatches.length + 1;
      label = language === 'marathi' ? `चरण ${nextNum}` : language === 'hindi' ? `पद ${nextNum}` : `Verse ${nextNum}`;
    }

    setStanzas((prev) => [
      ...prev,
      {
        id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        label,
        text: '',
      },
    ]);
  };

  const handleDuplicateChorus = () => {
    const chorusStanza = stanzas.find(
      (s) =>
        s.label.toLowerCase().includes('chorus') ||
        s.label.includes('कोरस') ||
        s.label.includes('ध्रुवपद') ||
        s.label.includes('स्थायी')
    );
    if (chorusStanza) {
      setStanzas((prev) => [
        ...prev,
        {
          id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          label: chorusStanza.label,
          text: chorusStanza.text,
        },
      ]);
    } else {
      const defaultChorusLabel = language === 'marathi' ? 'ध्रुवपद' : language === 'hindi' ? 'कोरस' : 'Chorus';
      handleAddStanza(defaultChorusLabel);
    }
  };

  const handleDuplicateStanza = (index) => {
    const target = stanzas[index];
    if (!target) return;
    const duplicated = {
      id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: target.label,
      text: target.text,
    };
    setStanzas((prev) => {
      const copy = [...prev];
      copy.splice(index + 1, 0, duplicated);
      return copy;
    });
  };

  const handleUpdateStanza = (index, field, value) => {
    setStanzas((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  /**
   * Inserts the next-line shift symbol (..) at the cursor position
   * in the specified stanza's textarea.
   */
  const handleInsertNextLineShift = (index) => {
    const el = document.getElementById(`stanza-textarea-${index}`);
    const currentText = stanzas[index]?.text || '';
    const symbol = ' .. ';

    if (!el) {
      handleUpdateStanza(index, 'text', currentText + symbol);
      return;
    }

    const start = el.selectionStart ?? currentText.length;
    const end = el.selectionEnd ?? currentText.length;
    const nextText = currentText.slice(0, start) + symbol + currentText.slice(end);

    handleUpdateStanza(index, 'text', nextText);

    setTimeout(() => {
      el.focus();
      const newPos = start + symbol.length;
      el.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleRemoveStanza = (index) => {
    if (stanzas.length <= 1) {
      alert('A song must have at least one stanza.');
      return;
    }
    setStanzas((prev) => prev.filter((_, i) => i !== index));
    setPreviewSlideIdx((p) => Math.max(0, Math.min(p, stanzas.length - 2)));
  };

  const handleMoveStanza = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= stanzas.length) return;
    setStanzas((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, moved);
      return copy;
    });
  };

  const handleImportModalResult = (importedSongs) => {
    if (!importedSongs || importedSongs.length === 0) return;
    const first = importedSongs[0];
    if (first.title) setTitle(first.title);
    if (first.title_alt) setTitleAlt(first.title_alt);
    if (first.number != null) setNumber(String(first.number));
    if (first.language) setLanguage(first.language);
    if (first.type) setSongType(first.type);
    if (first.beat) setBeat(first.beat);
    if (first.tempo) setTempo(String(first.tempo));
    if (first.stanzas && first.stanzas.length) setStanzas(first.stanzas);
  };

  const handleSubmit = async (e, launchProjector = false) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a song title');
      return;
    }

    const validStanzas = stanzas.filter((s) => s.text.trim().length > 0);
    if (validStanzas.length === 0) {
      alert('Please enter lyrics for at least one stanza / slide.');
      return;
    }

    const songData = {
      number: number ? parseInt(number, 10) : null,
      title: title.trim(),
      title_alt: titleAlt.trim() || null,
      language,
      type: songType === 'praise' ? 'praise' : 'worship',
      beat: beat ? String(beat).trim() : null,
      tempo: tempo ? parseInt(tempo, 10) : null,
      stanzas: validStanzas,
      source: 'db',
    };

    try {
      setIsSaving(true);
      let targetId = id;
      if (isEdit) {
        await editSong(id, songData);
      } else {
        const created = await addSong(songData);
        targetId = created.id;
      }

      // Sync beat, tempo, and type to Supabase metadata store
      if (targetId) {
        try {
          await updateSongBeatTempo(targetId, {
            type: songType,
            beat: beat ? String(beat).trim() : null,
            tempo: tempo ? parseInt(tempo, 10) : null,
          });
        } catch (syncErr) {
          console.warn('Sync beat/tempo to Supabase metadata error:', syncErr.message);
        }
      }

      if (launchProjector && targetId) {
        navigate(`/present/${targetId}`);
      } else {
        navigate('/');
      }
    } catch (err) {
      alert(`Error saving song: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const previewSlides = useMemo(() => {
    return [
      { kind: 'title', label: 'TITLE SLIDE', title: title || 'Song Title Preview', subtitle: '', number },
      ...stanzas.map((s, idx) => ({
        kind: 'stanza',
        label: s.label || `Slide ${idx + 1}`,
        lines: s.text ? formatCommaLines(s.text).split('\n') : ['[Enter stanza lyrics...]'],
      })),
    ];
  }, [title, number, stanzas]);

  const activeSlide = previewSlides[previewSlideIdx] || previewSlides[0];

  return (
    <div className="mx-auto max-w-5xl pb-16 space-y-4 w-full max-w-full overflow-x-hidden">
      {/* Top Header */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition shadow-2xs active:scale-95 shrink-0"
            title="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-base sm:text-lg font-black text-slate-900 truncate">
            {isEdit ? 'Edit Song' : 'New Song'}
          </h1>
        </div>

        {/* Action Buttons: Clean text-only buttons */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center rounded-xl border border-slate-300/80 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs active:scale-95 text-center"
          >
            Import
          </button>

          {isEdit && (
            <button
              type="button"
              onClick={handleDuplicateToDb}
              className="flex-1 sm:flex-none flex items-center justify-center rounded-xl border border-slate-300/80 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs active:scale-95 text-center"
              title="Duplicate into a new song"
            >
              Duplicate
            </button>
          )}

          <button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            disabled={isSaving}
            className="flex-1 sm:flex-none flex items-center justify-center rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition shadow-sm active:scale-95 text-center"
          >
            Present
          </button>

          <button
            type="button"
            onClick={(e) => handleSubmit(e, false)}
            disabled={isSaving}
            className="flex-1 sm:flex-none flex items-center justify-center rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-black text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition active:scale-95 text-center"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Mobile Tab Switcher (Visible on mobile screens) */}
      <div className="lg:hidden flex rounded-xl border border-slate-200/90 bg-white p-1 shadow-2xs">
        <button
          type="button"
          onClick={() => setMobileTab('edit')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition text-center ${mobileTab === 'edit'
            ? 'bg-slate-900 text-white shadow-2xs'
            : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          Edit Lyrics ({stanzas.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition text-center ${mobileTab === 'preview'
            ? 'bg-emerald-600 text-white shadow-2xs'
            : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          Preview ({previewSlideIdx + 1}/{previewSlides.length})
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Left Column: Form Details & Stanzas */}
        <div className={`space-y-4 lg:col-span-7 ${mobileTab === 'preview' ? 'hidden lg:block' : 'block'}`}>
          {/* Metadata Card */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-5 space-y-3 shadow-xs">
            <div className="grid grid-cols-2 sm:grid-cols-12 gap-2.5 sm:gap-3.5">
              {/* Main Title */}
              <div className="col-span-2 sm:col-span-6">
                <label className="mb-1 block text-xs font-black text-slate-700">
                  Main Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'marathi' ? "उदा. गा देवाचे उपकार" : language === 'hindi' ? "उदा. तेरी स्तुति" : "e.g. Amazing Grace"}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200/90 px-3 py-2 text-xs text-slate-900 font-black focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 transition shadow-2xs bg-slate-50/70 focus:bg-white"
                />
              </div>

              {/* Alt Title */}
              <div className="col-span-2 sm:col-span-6">
                <label className="mb-1 block text-xs font-black text-slate-700">
                  Alternate Title / Transliteration
                </label>
                <input
                  type="text"
                  placeholder={language === 'marathi' ? "Ga Devache Upakar" : "Teri Stuti Aur Aradhana"}
                  value={titleAlt}
                  onChange={(e) => setTitleAlt(e.target.value)}
                  className="w-full rounded-xl border border-slate-200/90 px-3 py-2 text-xs text-slate-900 font-semibold focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 transition shadow-2xs bg-slate-50/70 focus:bg-white"
                />
              </div>

              {/* Primary Language */}
              <div className="col-span-2 sm:col-span-5">
                <label className="mb-1 block text-xs font-black text-slate-700">
                  Primary Language
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setLanguage('hindi')}
                    className={`rounded-xl border py-1.5 text-xs font-black transition-all ${
                      language === 'hindi'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600 shadow-2xs'
                        : 'border-slate-200/90 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    हिन्दी
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('marathi')}
                    className={`rounded-xl border py-1.5 text-xs font-black transition-all ${
                      language === 'marathi'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600 shadow-2xs'
                        : 'border-slate-200/90 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    मराठी
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('english')}
                    className={`rounded-xl border py-1.5 text-xs font-black transition-all ${
                      language === 'english'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600 shadow-2xs'
                        : 'border-slate-200/90 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              {/* Number */}
              <div className="col-span-1 sm:col-span-2">
                <label className="mb-1 flex items-center justify-between text-xs font-black text-slate-700">
                  <span>Number</span>
                  <span className="text-[10px] text-emerald-700 font-extrabold">(Auto)</span>
                </label>
                <input
                  type="number"
                  placeholder="Auto"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-200/90 px-3 py-1.5 text-xs font-black text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 transition shadow-2xs bg-slate-50/70 focus:bg-white"
                />
              </div>

              {/* Song Type */}
              <div className="col-span-1 sm:col-span-2">
                <label className="text-xs font-black text-slate-700 block mb-1">
                  Type
                </label>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setSongType('worship')}
                    className={`rounded-xl border py-1.5 text-[11px] font-black transition-all text-center ${
                      songType === 'worship'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600 shadow-2xs'
                        : 'border-slate-200/90 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Worship
                  </button>
                  <button
                    type="button"
                    onClick={() => setSongType('praise')}
                    className={`rounded-xl border py-1.5 text-[11px] font-black transition-all text-center ${
                      songType === 'praise'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-800 ring-1 ring-indigo-600 shadow-2xs'
                        : 'border-slate-200/90 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Praise
                  </button>
                </div>
              </div>

              {/* Beat */}
              <div className="col-span-1 sm:col-span-1.5">
                <label className="text-xs font-black text-slate-700 block mb-1">
                  Beat
                </label>
                <input
                  type="text"
                  placeholder="13, 31..."
                  value={beat}
                  onChange={(e) => setBeat(e.target.value)}
                  className="w-full rounded-xl border border-slate-200/90 px-2.5 py-1.5 text-xs font-black text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 transition shadow-2xs bg-slate-50/70 focus:bg-white"
                />
              </div>

              {/* Tempo */}
              <div className="col-span-1 sm:col-span-1.5">
                <label className="text-xs font-black text-slate-700 block mb-1">
                  Tempo
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="30"
                    max="260"
                    step="1"
                    placeholder="75"
                    value={tempo}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setTempo(isNaN(val) ? '' : String(val));
                    }}
                    className="w-full rounded-xl border border-slate-200/90 px-2 py-1.5 text-xs font-black text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 transition shadow-2xs bg-slate-50/70 focus:bg-white"
                  />
                  <span className="text-[10px] font-bold text-slate-400 shrink-0">BPM</span>
                </div>
              </div>
            </div>
          </section>

          {/* Stanzas & Slides Section */}
          <section className="space-y-3">
            {/* Instruction on top: double dot .. for next-line shift */}
            <div className="flex items-start sm:items-center gap-2 rounded-xl border border-teal-200/90 bg-teal-50/80 px-3 py-2 text-xs text-teal-900 shadow-2xs">
              <span className="shrink-0 text-sm">💡</span>
              <p className="leading-snug">
                <span className="font-extrabold text-teal-950">Next Line Shift: </span>
                Type <code className="bg-white px-1.5 py-0.5 rounded border border-teal-200 font-mono font-black text-teal-800">..</code> (double dot) or press Enter to shift lyrics to the next line within a slide.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-black text-slate-900">
                Stanzas & Slides ({stanzas.length})
              </h2>

              {/* Quick Action Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddStanza(language === 'marathi' ? 'ध्रुवपद' : language === 'hindi' ? 'कोरस' : 'Chorus')}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-800 hover:bg-emerald-100 transition shadow-2xs"
                  title="Add Chorus slide"
                >
                  + {language === 'marathi' ? 'ध्रुवपद' : language === 'hindi' ? 'कोरस' : 'Chorus'}
                </button>

                <button
                  type="button"
                  onClick={handleDuplicateChorus}
                  className="rounded-lg border border-slate-300/80 bg-white px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                  title="Insert duplicate of Chorus at the end"
                >
                  Repeat Chorus
                </button>

                <button
                  type="button"
                  onClick={() => handleAddStanza(language === 'marathi' ? 'सेतु (Bridge)' : language === 'hindi' ? 'सेतु (Bridge)' : 'Bridge')}
                  className="rounded-lg border border-slate-300/80 bg-white px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                >
                  + Bridge
                </button>

                <button
                  type="button"
                  onClick={() => handleAddStanza()}
                  className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-black text-white hover:bg-emerald-700 transition shadow-xs"
                >
                  + {language === 'marathi' ? 'चरण' : language === 'hindi' ? 'पद' : 'Verse'}
                </button>
              </div>
            </div>

            {/* Stanzas List */}
            <div className="space-y-2.5">
              {stanzas.map((stanza, idx) => {
                const isChorus =
                  stanza.label.toLowerCase().includes('chorus') ||
                  stanza.label.includes('कोरस') ||
                  stanza.label.includes('ध्रुवपद') ||
                  stanza.label.includes('स्थायी');

                return (
                  <div
                    key={stanza.id || idx}
                    className={`rounded-2xl border p-3 sm:p-4 transition-all duration-150 ${
                      isChorus
                        ? 'border-emerald-300/80 bg-emerald-50/40 shadow-xs'
                        : 'border-slate-200/90 bg-white hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    {/* Stanza Header Row */}
                    <div className="mb-2 flex items-center justify-between gap-1.5 min-w-0">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-slate-100 border border-slate-200/80 text-[11px] font-black text-slate-700">
                          {idx + 1}
                        </span>

                        <input
                          type="text"
                          value={stanza.label}
                          onChange={(e) => handleUpdateStanza(idx, 'label', e.target.value)}
                          placeholder="Label (e.g. Verse 1)"
                          className={`w-full min-w-0 max-w-[140px] sm:max-w-[220px] rounded-lg border px-2 py-1 text-xs font-black focus:outline-none truncate ${
                            isChorus
                              ? 'border-emerald-300 bg-white text-emerald-800 focus:border-emerald-600'
                              : 'border-slate-200 bg-slate-50/70 text-slate-900 focus:border-emerald-600'
                          }`}
                        />
                      </div>

                      {/* Stanza Action Buttons */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDuplicateStanza(idx)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                          title="Duplicate Stanza"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveStanza(idx, -1)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 transition"
                          title="Move Up"
                        >
                          <MoveUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === stanzas.length - 1}
                          onClick={() => handleMoveStanza(idx, 1)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 transition"
                          title="Move Down"
                        >
                          <MoveDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveStanza(idx)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                          title="Delete Stanza"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Stanza Textarea - Direct, fast, clean */}
                    <textarea
                      id={`stanza-textarea-${idx}`}
                      rows={3}
                      value={stanza.text}
                      onChange={(e) => handleUpdateStanza(idx, 'text', e.target.value)}
                      placeholder="Type lyrics here (use .. for next line)..."
                      className="w-full rounded-xl border border-slate-200/90 p-2.5 sm:p-3 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 leading-relaxed font-sans shadow-2xs bg-white"
                    />
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => handleAddStanza()}
              className="w-full rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 py-2.5 text-xs font-black text-slate-600 hover:border-emerald-600 hover:text-emerald-700 transition"
            >
              + Add Stanza / Slide
            </button>
          </section>
        </div>

        {/* Right Column: Live Projector Slide Preview */ }
  <div className={`space-y-4 lg:col-span-5 ${mobileTab === 'edit' ? 'hidden lg:block' : 'block'}`}>
    <div className="sticky top-20 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
          Live Projector Preview
        </h2>

        <span className="text-[11px] font-black text-slate-500">
          Slide {previewSlideIdx + 1} / {previewSlides.length}
        </span>
      </div>

      {/* Simulated 16:9 Projector Screen */}
      <div
        className="relative aspect-video w-full rounded-2xl border border-slate-200/90 p-6 flex flex-col items-center justify-center text-center shadow-lg overflow-hidden select-none transition-all duration-200"
        style={{
          background: settings.background,
          color: settings.textColor,
          fontFamily: FONT_STACKS[settings.fontFamily] || FONT_STACKS.sans,
        }}
      >
        {activeSlide.kind === 'title' ? (
          <div>
            {activeSlide.number && (
              <div
                className="text-[11px] font-black tracking-[0.25em] opacity-40 mb-1"
                style={{ color: settings.textColor }}
              >
                SONG #{activeSlide.number}
              </div>
            )}
            <h3 className="text-xl font-black leading-tight">
              {activeSlide.title}
            </h3>
            {activeSlide.subtitle && (
              <p className="text-xs opacity-60 mt-1 italic font-semibold">
                {activeSlide.subtitle}
              </p>
            )}
          </div>
        ) : (
          <div className="w-full px-2">
            <div
              className="text-[10px] font-black uppercase tracking-[0.25em] mb-1.5"
              style={{ color: settings.accentColor }}
            >
              {activeSlide.label}
            </div>
            <p
              className="text-base font-black leading-tight whitespace-pre-line"
              style={{ lineHeight: settings.lineHeight }}
            >
              {activeSlide.lines.join('\n')}
            </p>
          </div>
        )}

        {settings.showProgressDots && previewSlides.length > 1 && (
          <div className="absolute bottom-2 flex justify-center gap-1">
            {previewSlides.map((_, i) => (
              <span
                key={i}
                className="h-1 rounded-full transition-all duration-150"
                style={{
                  width: i === previewSlideIdx ? 16 : 4,
                  background: i === previewSlideIdx ? settings.accentColor : settings.textColor,
                  opacity: i === previewSlideIdx ? 0.95 : 0.25,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Slide Navigator Buttons */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={previewSlideIdx === 0}
          onClick={() => setPreviewSlideIdx((p) => Math.max(0, p - 1))}
          className="flex-1 rounded-xl border border-slate-300/80 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-30 shadow-xs transition"
        >
          ← Prev Slide
        </button>
        <button
          type="button"
          disabled={previewSlideIdx === previewSlides.length - 1}
          onClick={() => setPreviewSlideIdx((p) => Math.min(previewSlides.length - 1, p + 1))}
          className="flex-1 rounded-xl border border-slate-300/80 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-30 shadow-xs transition"
        >
          Next Slide →
        </button>
      </div>

      {/* Quick Carousel */}
      <div className="flex gap-1.5 overflow-x-auto pb-2">
        {previewSlides.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setPreviewSlideIdx(idx)}
            className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-black transition ${idx === previewSlideIdx
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-slate-200/90 text-slate-600 hover:text-slate-900'
              }`}
          >
            {s.kind === 'title' ? 'Title' : s.label}
          </button>
        ))}
      </div>
    </div>
  </div>
      </div >

    {/* Song Import Modal */ }
    < SongImportModal
  isOpen = { importModalOpen }
  onClose = {() => setImportModalOpen(false)
}
onImportSongs = { handleImportModalResult }
  />
    </div >
  );
}
