import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useSongs } from '../store/SongContext';
import { useSettings } from '../store/SettingsContext';
import { projectorStyle, FONT_STACKS } from '../lib/theme';
import { isSeedSong } from '../lib/seed';
import SongImportModal from '../components/SongImportModal';
import { 
  Save, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Play, 
  Upload, 
  MoveUp, 
  MoveDown,
  Copy,
  Eye,
  Music2,
  Lock,
  Sparkles
} from 'lucide-react';

export default function SongEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { songs, addSong, editSong } = useSongs();
  const { settings } = useSettings();

  const isEdit = Boolean(id);

  const [number, setNumber] = useState('');
  const [title, setTitle] = useState('');
  const [titleAlt, setTitleAlt] = useState('');
  const [language, setLanguage] = useState('hindi'); // 'hindi' | 'marathi' | 'english'
  const [stanzas, setStanzas] = useState([
    { id: 'st-1', label: 'Verse 1', text: '' },
    { id: 'st-2', label: 'Chorus', text: '' },
  ]);

  const [isSeed, setIsSeed] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [previewSlideIdx, setPreviewSlideIdx] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize from location state if duplicating
  useEffect(() => {
    if (!isEdit && location.state) {
      if (location.state.title) setTitle(location.state.title);
      if (location.state.title_alt) setTitleAlt(location.state.title_alt);
      if (location.state.language) setLanguage(location.state.language);
      if (location.state.stanzas && location.state.stanzas.length) {
        setStanzas(location.state.stanzas);
      }
    }
  }, [isEdit, location.state]);

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
      const existing = songs.find((s) => s.id === id);
      if (existing) {
        setNumber(existing.number != null ? String(existing.number) : '');
        setTitle(existing.title || '');
        setTitleAlt(existing.title_alt || '');
        setLanguage(existing.language || 'hindi');
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
        stanzas: stanzas.map((st) => ({
          id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          label: st.label,
          text: st.text,
        })),
      },
    });
  };

  const handleAddStanza = (labelPreset = '') => {
    if (isSeed) return;
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
    if (isSeed) return;
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
    if (isSeed) return;
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
    if (isSeed) return;
    setStanzas((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveStanza = (index) => {
    if (isSeed) return;
    if (stanzas.length <= 1) {
      alert('A song must have at least one stanza.');
      return;
    }
    setStanzas((prev) => prev.filter((_, i) => i !== index));
    setPreviewSlideIdx((p) => Math.max(0, Math.min(p, stanzas.length - 2)));
  };

  const handleMoveStanza = (index, direction) => {
    if (isSeed) return;
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
    if (isSeed || !importedSongs || importedSongs.length === 0) return;
    const first = importedSongs[0];
    if (first.title) setTitle(first.title);
    if (first.title_alt) setTitleAlt(first.title_alt);
    if (first.number != null) setNumber(String(first.number));
    if (first.language) setLanguage(first.language);
    if (first.stanzas && first.stanzas.length) setStanzas(first.stanzas);
  };

  const handleSubmit = async (e, launchProjector = false) => {
    if (e) e.preventDefault();
    if (isSeed) {
      alert('Seed songs cannot be saved. Duplicate it to make your own version.');
      return;
    }
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
      { kind: 'title', label: 'TITLE SLIDE', title: title || 'Song Title Preview', subtitle: titleAlt, number },
      ...stanzas.map((s, idx) => ({
        kind: 'stanza',
        label: s.label || `Slide ${idx + 1}`,
        lines: s.text ? s.text.split('\n') : ['[Enter stanza lyrics...]'],
      })),
    ];
  }, [title, titleAlt, number, stanzas]);

  const activeSlide = previewSlides[previewSlideIdx] || previewSlides[0];

  return (
    <div className="mx-auto max-w-5xl pb-16 space-y-5">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Music2 className="h-5 w-5 text-emerald-600" />
              <span>{isSeed ? 'Seed Song (Read-Only)' : isEdit ? 'Edit Song' : 'Create New Song'}</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {isSeed ? 'Bundled seed song · Duplicate to create an editable copy' : 'Song numbers are auto-assigned automatically.'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {isSeed ? (
            <>
              <button
                type="button"
                onClick={() => navigate(`/present/${id}`)}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition shadow-sm"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Present</span>
              </button>

              <button
                type="button"
                onClick={handleDuplicateToDb}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-black text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition"
              >
                <Copy className="h-4 w-4" />
                <span>Duplicate & Edit</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setImportModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-300/80 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
              >
                <Upload className="h-3.5 w-3.5 text-emerald-600" />
                <span>Import JSON / Lyrics</span>
              </button>

              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                disabled={isSaving}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition shadow-sm"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Save & Present</span>
              </button>

              <button
                type="button"
                onClick={(e) => handleSubmit(e, false)}
                disabled={isSaving}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-black text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? 'Saving...' : 'Save Song'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Read-Only Seed Banner */}
      {isSeed && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-xs text-amber-900 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-100 border border-amber-300 text-amber-700 shrink-0">
              <Lock className="h-4 w-4" />
            </span>
            <div>
              <p className="font-black text-amber-950">
                This is a seed song and cannot be edited.
              </p>
              <p className="text-amber-800 font-medium">
                Duplicate it to make your own custom editable version in your library.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDuplicateToDb}
            className="shrink-0 flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-black text-white hover:bg-amber-700 shadow-2xs transition"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Duplicate Song</span>
          </button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Left Column: Form Details & Stanzas */}
        <div className="space-y-5 lg:col-span-7">
          {/* Metadata Card */}
          <section className={`rounded-2xl border border-slate-200/90 bg-white p-5 space-y-4 shadow-xs ${isSeed ? 'opacity-90' : ''}`}>
            <div className="grid gap-4 sm:grid-cols-12">
              {/* Number (Auto-assigned) */}
              <div className="sm:col-span-4">
                <label className="mb-1 flex items-center justify-between text-xs font-black text-slate-700">
                  <span>Song Number</span>
                  <span className="text-[10px] text-emerald-700 font-extrabold">(Auto)</span>
                </label>
                <input
                  type="number"
                  placeholder="Auto"
                  disabled={isSeed}
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className={`w-full rounded-xl border border-slate-200/90 px-3 py-2 text-xs font-black text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15 transition shadow-2xs ${
                    isSeed ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50/70 focus:bg-white'
                  }`}
                />
              </div>

              {/* Language Selector with Hindi, Marathi, and English */}
              <div className="sm:col-span-8">
                <label className="mb-1 block text-xs font-black text-slate-700">
                  Primary Language
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    disabled={isSeed}
                    onClick={() => setLanguage('hindi')}
                    className={`rounded-xl border py-2 text-xs font-black transition-all ${
                      language === 'hindi'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600 shadow-2xs'
                        : 'border-slate-200/90 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    } ${isSeed ? 'cursor-not-allowed opacity-80' : ''}`}
                  >
                    हिन्दी
                  </button>
                  <button
                    type="button"
                    disabled={isSeed}
                    onClick={() => setLanguage('marathi')}
                    className={`rounded-xl border py-2 text-xs font-black transition-all ${
                      language === 'marathi'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600 shadow-2xs'
                        : 'border-slate-200/90 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    } ${isSeed ? 'cursor-not-allowed opacity-80' : ''}`}
                  >
                    मराठी
                  </button>
                  <button
                    type="button"
                    disabled={isSeed}
                    onClick={() => setLanguage('english')}
                    className={`rounded-xl border py-2 text-xs font-black transition-all ${
                      language === 'english'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600 shadow-2xs'
                        : 'border-slate-200/90 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    } ${isSeed ? 'cursor-not-allowed opacity-80' : ''}`}
                  >
                    English
                  </button>
                </div>
              </div>

              {/* Title */}
              <div className="sm:col-span-6">
                <label className="mb-1 block text-xs font-black text-slate-700">
                  Main Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={isSeed}
                  placeholder={language === 'marathi' ? "उदा. गा देवाचे उपकार" : language === 'hindi' ? "उदा. तेरी स्तुति" : "e.g. Amazing Grace"}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full rounded-xl border border-slate-200/90 px-3 py-2 text-xs text-slate-900 font-black focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15 transition shadow-2xs ${
                    isSeed ? 'bg-slate-100 text-slate-600 cursor-not-allowed' : 'bg-slate-50/70 focus:bg-white'
                  }`}
                />
              </div>

              {/* Alt Title */}
              <div className="sm:col-span-6">
                <label className="mb-1 block text-xs font-black text-slate-700">
                  Alternate Title / Transliteration
                </label>
                <input
                  type="text"
                  disabled={isSeed}
                  placeholder={language === 'marathi' ? "Ga Devache Upakar" : "Teri Stuti Aur Aradhana"}
                  value={titleAlt}
                  onChange={(e) => setTitleAlt(e.target.value)}
                  className={`w-full rounded-xl border border-slate-200/90 px-3 py-2 text-xs text-slate-900 font-semibold focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15 transition shadow-2xs ${
                    isSeed ? 'bg-slate-100 text-slate-600 cursor-not-allowed' : 'bg-slate-50/70 focus:bg-white'
                  }`}
                />
              </div>
            </div>
          </section>

          {/* Stanzas & Slides Section */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span>Stanzas & Slides ({stanzas.length})</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Each stanza creates a slide in projector view.
                </p>
              </div>

              {/* Quick Action Buttons (Only when not seed) */}
              {!isSeed && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAddStanza(language === 'marathi' ? 'ध्रुवपद' : language === 'hindi' ? 'कोरस' : 'Chorus')}
                    className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-black text-emerald-800 hover:bg-emerald-100 transition shadow-2xs"
                    title="Add Chorus slide"
                  >
                    + {language === 'marathi' ? 'ध्रुवपद' : language === 'hindi' ? 'कोरस' : 'Chorus'}
                  </button>

                  <button
                    type="button"
                    onClick={handleDuplicateChorus}
                    className="rounded-lg border border-slate-300/80 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                    title="Insert duplicate of Chorus at the end"
                  >
                    <Copy className="inline mr-1 h-3 w-3 text-emerald-600" />
                    Repeat Chorus
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddStanza(language === 'marathi' ? 'सेतु (Bridge)' : language === 'hindi' ? 'सेतु (Bridge)' : 'Bridge')}
                    className="rounded-lg border border-slate-300/80 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                  >
                    + Bridge
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddStanza()}
                    className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-700 transition shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ {language === 'marathi' ? 'चरण' : language === 'hindi' ? 'पद' : 'Verse'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Stanzas List */}
            <div className="space-y-3">
              {stanzas.map((stanza, idx) => {
                const isChorus =
                  stanza.label.toLowerCase().includes('chorus') ||
                  stanza.label.includes('कोरस') ||
                  stanza.label.includes('ध्रुवपद') ||
                  stanza.label.includes('स्थायी');

                return (
                  <div
                    key={stanza.id || idx}
                    className={`rounded-2xl border p-4 transition-all duration-150 ${
                      isChorus
                        ? 'border-emerald-300/80 bg-emerald-50/40 shadow-xs'
                        : 'border-slate-200/90 bg-white hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    {/* Stanza Header Row */}
                    <div className="mb-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="grid h-6 w-6 place-items-center rounded-lg bg-slate-100 border border-slate-200/80 text-[11px] font-black text-slate-700">
                          {idx + 1}
                        </span>

                        <input
                          type="text"
                          disabled={isSeed}
                          value={stanza.label}
                          onChange={(e) => handleUpdateStanza(idx, 'label', e.target.value)}
                          placeholder="Label (e.g. Verse 1, ध्रुवपद)"
                          className={`rounded-lg border px-2.5 py-1 text-xs font-black focus:outline-none ${
                            isChorus
                              ? 'border-emerald-300 bg-white text-emerald-800 focus:border-emerald-600'
                              : 'border-slate-200 bg-slate-50/70 text-slate-900 focus:border-emerald-600'
                          } ${isSeed ? 'cursor-not-allowed opacity-80' : ''}`}
                        />
                      </div>

                      {/* Stanza Action Buttons (hidden if seed) */}
                      {!isSeed && (
                        <div className="flex items-center gap-1">
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
                      )}
                    </div>

                    {/* Stanza Textarea */}
                    <textarea
                      rows={4}
                      disabled={isSeed}
                      value={stanza.text}
                      onChange={(e) => handleUpdateStanza(idx, 'text', e.target.value)}
                      placeholder="Enter lyrics for this slide (each line break is preserved in projector)..."
                      className={`w-full rounded-xl border border-slate-200/90 p-3 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15 leading-relaxed font-sans shadow-2xs ${
                        isSeed ? 'bg-slate-50 text-slate-700 cursor-not-allowed' : 'bg-white'
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {!isSeed && (
              <button
                type="button"
                onClick={() => handleAddStanza()}
                className="w-full rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 py-3 text-xs font-black text-slate-600 hover:border-emerald-600 hover:text-emerald-700 transition"
              >
                + Add Stanza / Slide
              </button>
            )}
          </section>
        </div>

        {/* Right Column: Live Projector Slide Preview */}
        <div className="space-y-4 lg:col-span-5">
          <div className="sticky top-20 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-emerald-600" />
                <span>Live Projector Preview</span>
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
                  className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-black transition ${
                    idx === previewSlideIdx
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
      </div>

      {/* Song Import Modal */}
      <SongImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportSongs={handleImportModalResult}
      />
    </div>
  );
}
