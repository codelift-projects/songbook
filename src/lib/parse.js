import { hasDevanagari } from './translit';

/**
 * Automatically detects whether text is primarily Marathi, Hindi, or English
 */
export function detectLanguage(text) {
  if (!text) return 'hindi';
  if (!hasDevanagari(text)) return 'english';

  const t = text.toLowerCase();
  // Marathi markers
  const marathiKeywords = [
    'ध्रुवपद', 'चरण', 'कडवे', 'आहे', 'नाही', 'माझा', 'तुझा', 'देवाचे', 
    'प्रभूचे', 'स्तुती', 'ख्रिस्त', 'आम्ही', 'तुम्ही', 'करा', 'गावा', 'सांग', 'येशू'
  ];

  const matchMarathi = marathiKeywords.some((w) => t.includes(w));
  return matchMarathi ? 'marathi' : 'hindi';
}

/**
 * Parses raw song lyrics text into structured stanzas.
 * Supports markers like:
 * [Verse 1], Verse 1:, V1:, 1., [Chorus], Chorus:, [Bridge], [Outro], [Pre-Chorus],
 * हिन्दी: [पद 1], पद 1, पद 1:, 1., [कोरस], कोरस, [अंतरा 1], अंतरा, [स्थायी], [मुखड़ा]
 * मराठी: [ध्रुवपद], ध्रुवपद:, [चरण 1], चरण 1:, [कडवे 1], कडवे 1:, [स्तुती]
 */
export function parseLyrics(rawText) {
  if (!rawText || !rawText.trim()) return [];

  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/\n\s*\n+/).map((b) => b.trim()).filter(Boolean);

  let verseCounter = 1;
  const lang = detectLanguage(rawText);

  return blocks.map((block, idx) => {
    const lines = block.split('\n').map((l) => l.trimEnd());
    const firstLine = lines[0]?.trim() || '';

    // Check for section header patterns across English, Hindi, and Marathi
    const headerPattern = /^(?:\[?(Verse|Chorus|Pre-Chorus|Bridge|Ending|Outro|Refrain|Tag|Intro|पद|कोरस|अंतरा|स्थायी|मुखड़ा|टेक|गीत|ध्रुवपद|चरण|कडवे)\s*(\d+)?\]?:?)$/i;
    const headerMatch = firstLine.match(headerPattern);

    if (headerMatch) {
      const type = headerMatch[1];
      const num = headerMatch[2] ? ` ${headerMatch[2]}` : '';
      const label = `${type}${num}`.trim();
      const content = lines.slice(1).join('\n').trim();
      return {
        id: `stanza-${idx + 1}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        label: label || (lang === 'marathi' ? `चरण ${verseCounter++}` : lang === 'hindi' ? `पद ${verseCounter++}` : `Verse ${verseCounter++}`),
        text: content || firstLine,
      };
    }

    // Numbered verse prefix like: 1. Amazing grace... or [1] or 1)
    const numberedMatch = firstLine.match(/^(\d+)[\.\)]\s*(.*)$/);
    if (numberedMatch) {
      const num = numberedMatch[1];
      const remainder = numberedMatch[2];
      const restOfLines = lines.slice(1);
      const allLines = [remainder, ...restOfLines].filter(Boolean).join('\n').trim();
      const label = lang === 'marathi' ? `चरण ${num}` : lang === 'hindi' ? `पद ${num}` : `Verse ${num}`;
      return {
        id: `stanza-${idx + 1}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        label,
        text: allLines,
      };
    }

    // Custom bracket header: [Any text here]
    const bracketMatch = firstLine.match(/^\[(.*?)\]:?$/);
    if (bracketMatch) {
      const label = bracketMatch[1].trim();
      const content = lines.slice(1).join('\n').trim();
      return {
        id: `stanza-${idx + 1}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        label,
        text: content,
      };
    }

    // Default: Auto-increment verse
    const defaultLabel = lang === 'marathi' ? `चरण ${verseCounter++}` : lang === 'hindi' ? `पद ${verseCounter++}` : `Verse ${verseCounter++}`;
    return {
      id: `stanza-${idx + 1}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      label: defaultLabel,
      text: lines.join('\n').trim(),
    };
  });
}

/**
 * Dynamically breaks lines at commas so text after comma appears on next line
 */
export function formatCommaLines(text) {
  if (!text) return '';
  return String(text)
    .split('\n')
    .map((line) => line.replace(/([,，])\s*(?=\S)/g, '$1\n'))
    .join('\n');
}

/**
 * Serializes stanzas array back to plain text for export or editing
 */
export function formatStanzasToText(stanzas) {
  if (!Array.isArray(stanzas)) return '';
  return stanzas
    .map((s) => {
      const label = s.label ? `[${s.label}]\n` : '';
      return `${label}${s.text || ''}`.trim();
    })
    .join('\n\n');
}
