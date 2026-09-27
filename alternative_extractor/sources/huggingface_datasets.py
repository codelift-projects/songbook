import json
from ..utils import polite_get

HF_DATASETS = [
    {
        "name": "bridgeconn/snow-mountain",
        "lang": "hindi"
    },
    {
        "name": "SamaFiroz/indic-asr-eval-results-hi",
        "lang": "hindi"
    }
]

def extract_huggingface():
    """
    Parses Hugging Face datasets for Christian lyrics / hymn content.
    """
    print("[Source 4: Hugging Face] Querying Indic Christian dataset records...")
    songs = []

    for ds in HF_DATASETS:
        name = ds["name"]
        api_url = f"https://datasets-server.huggingface.co/rows?dataset={name}&config=default&split=train&limit=50"
        resp_text = polite_get(api_url)
        if not resp_text:
            continue

        try:
            data = json.loads(resp_text)
            rows = data.get("rows", [])
            for r in rows:
                row_data = r.get("row", {})
                text = row_data.get("text") or row_data.get("sentence") or row_data.get("transcription") or ""
                
                # Check for Christian keywords
                if any(w in text for w in ['यीशु', 'येशु', 'प्रभु', 'मसीह', 'आराधना', 'स्तुति', 'हल्लेलूयाह']):
                    lines = [l.strip() for l in text.split("\n") if l.strip()]
                    if len(lines) >= 4:
                        title = lines[0]
                        songs.append({
                            "raw_title": title,
                            "raw_lyrics": "\n".join(lines[1:]),
                            "source_url": f"https://huggingface.co/datasets/{name}",
                            "source_site": "Hugging Face Dataset",
                            "tags": ["HuggingFace", ds["lang"]],
                            "language": ds["lang"]
                        })
        except Exception as e:
            print(f"[HuggingFace] Error querying {name}: {e}")

    print(f"[HuggingFace] Finished. Extracted {len(songs)} songs from datasets.")
    return songs
