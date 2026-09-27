import { formatStanzasToText } from './parse';

/**
 * Downloads a string as a file in the browser
 */
export function downloadFile(content, fileName, contentType) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports entire songbook as clean JSON
 */
export function exportSongsToJson(songs, filename = 'church-songbook-all-songs.json') {
  const cleanSongs = (songs || []).map((s) => ({
    number: s.number != null ? Number(s.number) : null,
    title: s.title || '',
    title_alt: s.title_alt || '',
    language: s.language || 'hindi',
    stanzas: (s.stanzas || []).map((st) => ({
      label: st.label || 'Verse',
      text: st.text || '',
    })),
  }));

  const data = JSON.stringify(cleanSongs, null, 2);
  downloadFile(data, filename, 'application/json');
}

/**
 * Generates and downloads a clean sample JSON template with Hindi, Marathi, and English songs
 */
export function downloadSampleJsonTemplate() {
  const sampleData = [
    {
      title: "गा देवाचे उपकार",
      title_alt: "Ga Devache Upakar",
      language: "marathi",
      stanzas: [
        {
          label: "ध्रुवपद",
          text: "गा देवाचे उपकार, स्मर त्याचे उपकार\nमना, विसरू नको त्याचे उपकार\nप्रभू येशूने दिले नवजीवन आम्हा\nत्याच्या नामाची स्तुती गाऊ सदा"
        },
        {
          label: "चरण 1",
          text: "पापे सर्व तो क्षमा करतो\nरोग सर्व तो बरे करतो\nसंकटातून सोडवूनी कृपा करतो\nसदा सर्वकाळ तो सांभाळ करतो"
        }
      ]
    },
    {
      title: "तेरी स्तुति और आराधना",
      title_alt: "Teri Stuti Aur Aradhana",
      language: "hindi",
      stanzas: [
        {
          label: "कोरस",
          text: "तेरी स्तुति और आराधना करता रहूँ मैं सदा\nदिल से तूझे धन्यवाद देता रहूँ मैं सदा\nयेशु मेरे तू ही है मेरा खुदा"
        },
        {
          label: "पद 1",
          text: "सृष्टि के कण-कण में है तेरी महिमा\nचाँद सितारों में है तेरी गरिमा\nतूने रचाया मुझको भी अपने लिए\nजीवन दिया है तूने जीने के लिए"
        }
      ]
    },
    {
      title: "Amazing Grace",
      title_alt: "How Sweet The Sound",
      language: "english",
      stanzas: [
        {
          label: "Verse 1",
          text: "Amazing grace, how sweet the sound\nThat saved a wretch like me\nI once was lost, but now am found\nWas blind, but now I see"
        },
        {
          label: "Verse 2",
          text: "'Twas grace that taught my heart to fear\nAnd grace my fears relieved\nHow precious did that grace appear\nThe hour I first believed"
        }
      ]
    }
  ];

  const data = JSON.stringify(sampleData, null, 2);
  downloadFile(data, 'sample-songs-template.json', 'application/json');
}

/**
 * Exports single song as TXT for easy reading or printing
 */
export function exportSongToTxt(song) {
  const parts = [];
  if (song.number) parts.push(`Song #${song.number}`);
  parts.push(song.title);
  if (song.title_alt) parts.push(`(${song.title_alt})`);
  parts.push(`Language: ${song.language || 'hindi'}`);
  parts.push('\n---\n');
  parts.push(formatStanzasToText(song.stanzas || []));

  const filename = `${song.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
  downloadFile(parts.join('\n'), filename, 'text/plain;charset=utf-8');
}
