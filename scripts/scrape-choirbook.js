import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'ChoirbookScraper/1.0' } }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

function slugify(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Simple romanization map for common Devanagari characters if needed
const DEVANAGARI_MAP = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri',
  'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'अं': 'am', 'अः': 'ah',
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
  'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n', '्': '',
  'ॉ': 'o', 'ॅ': 'e', '़': ''
};

function transliterateDevanagari(text) {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    result += DEVANAGARI_MAP[char] !== undefined ? DEVANAGARI_MAP[char] : char;
  }
  return result;
}

function parseMarkdownSong(filePath, content, index) {
  const isHindi = filePath.includes('/hindi/');
  const filename = filePath.split('/').pop().replace(/\.md$/, '');

  // 1. Extract frontmatter tags
  let tags = [];
  let mainBody = content;
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fmMatch) {
    mainBody = content.slice(fmMatch[0].length).trim();
    const tagLines = fmMatch[1].match(/-\s*(.+)/g);
    if (tagLines) {
      tags = tagLines.map(l => l.replace(/^-\s*/, '').trim()).filter(Boolean);
    }
  }

  // 2. Extract Title from # Heading
  let title = filename;
  const titleMatch = mainBody.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  // 3. Extract English tab for transliteration / alternate title
  let romanizedText = '';
  const engTabMatch = mainBody.match(/===\s*"English"([\s\S]*?)(?:===\s*"|$)/);
  if (engTabMatch) {
    romanizedText = engTabMatch[1]
      .split('\n')
      .map(l => l.replace(/^ {4}/, '').trim())
      .filter(Boolean)
      .join('\n');
  }

  // Determine title_alt
  let title_alt = null;
  if (isHindi) {
    if (/[a-zA-Z]/.test(filename)) {
      title_alt = filename;
    } else if (romanizedText) {
      const firstLine = romanizedText.split('\n')[0].replace(/[\(\)0-9,\.\!\?]/g, '').trim();
      title_alt = firstLine || transliterateDevanagari(title);
    } else {
      title_alt = transliterateDevanagari(title);
    }
  }

  // 4. Extract lyrics text
  let lyricsText = mainBody;
  if (isHindi && mainBody.includes('=== "Hindi"')) {
    const hindiTabMatch = mainBody.match(/===\s*"Hindi"([\s\S]*?)(?:===\s*"|$)/);
    if (hindiTabMatch) {
      lyricsText = hindiTabMatch[1];
      lyricsText = lyricsText
        .split('\n')
        .map(l => l.replace(/^ {4}/, ''))
        .join('\n')
        .trim();
    }
  } else {
    // Strip # heading
    lyricsText = mainBody.replace(/^#\s+.+$/m, '').trim();
  }

  // Clean trailing markdown spaces (double space)
  lyricsText = lyricsText
    .split('\n')
    .map(l => l.replace(/[ \t]+$/, ''))
    .join('\n')
    .trim();

  // Split into stanzas by blank lines
  const rawStanzas = lyricsText
    .split(/\n\s*\n/)
    .map(s => s.trim())
    .filter(Boolean);

  const stanzas = rawStanzas.map((stText, sIdx) => {
    let label = '';
    if (isHindi) {
      label = sIdx === 0 ? 'कोरस' : `पद ${sIdx}`;
    } else {
      label = sIdx === 0 ? 'Verse 1' : `Verse ${sIdx + 1}`;
    }
    return {
      label,
      text: stText,
    };
  });

  // 5. Build stable, descriptive slug
  let baseForSlug = title_alt || title;
  let slug = slugify(baseForSlug);
  if (!slug) {
    slug = slugify(transliterateDevanagari(title)) || `song-${index + 1}`;
  }

  return {
    slug,
    number: index + 1,
    title,
    title_alt: title_alt && title_alt !== title ? title_alt : null,
    language: isHindi ? 'hindi' : 'english',
    tags,
    stanzas: stanzas.length > 0 ? stanzas : [{ label: isHindi ? 'पद 1' : 'Verse 1', text: title }],
  };
}

async function scrape() {
  console.log('Fetching choirbook repo tree from GitHub API...');
  const treeRes = await get('https://api.github.com/repos/choirbook/choirbook.github.io/git/trees/master?recursive=1');
  if (treeRes.status !== 200) {
    throw new Error(`Failed to fetch tree: ${treeRes.status} ${treeRes.body}`);
  }

  const treeData = JSON.parse(treeRes.body);
  const mdFiles = (treeData.tree || []).filter(
    f => f.path.startsWith('docs/') && f.path.endsWith('.md') && f.path !== 'docs/index.md'
  );

  console.log(`Found ${mdFiles.length} songs. Fetching all lyrics...`);

  const songs = [];
  const slugsSeen = new Set();

  for (let i = 0; i < mdFiles.length; i++) {
    const file = mdFiles[i];
    const rawUrl = `https://raw.githubusercontent.com/choirbook/choirbook.github.io/master/${encodeURI(file.path)}`;
    const res = await get(rawUrl);

    if (res.status === 200) {
      const song = parseMarkdownSong(file.path, res.body, i);

      let baseSlug = song.slug;
      let counter = 1;
      while (slugsSeen.has(song.slug)) {
        counter++;
        song.slug = `${baseSlug}-${counter}`;
      }
      slugsSeen.add(song.slug);

      songs.push(song);
      console.log(`[${i + 1}/${mdFiles.length}] [${song.language.toUpperCase()}] ${song.title} (${song.slug})`);
    } else {
      console.warn(`Failed to fetch ${file.path}: ${res.status}`);
    }
  }

  const outPath = path.resolve(__dirname, '../src/data/songs.seed.json');
  fs.writeFileSync(outPath, JSON.stringify(songs, null, 2), 'utf-8');
  console.log(`\n🎉 Successfully extracted and saved all ${songs.length} songs to ${outPath}`);
}

scrape().catch(console.error);
