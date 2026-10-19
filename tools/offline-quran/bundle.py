"""Package the three pinned originals, byte-for-byte, for first-run offline import."""
import hashlib,json,shutil
from pathlib import Path
root=Path(__file__).resolve().parents[2]
texts=json.loads((root/'src/features/quran/catalog.data.json').read_text())['texts']
translations=json.loads((root/'src/features/quran/translations.data.json').read_text())
packs=[texts[0]['pack']]+[t['pack'] for t in translations]
for p in packs:
 for a in p['assets']:
  source=root/('.roqia-feasibility/sources/UthmanicWarsh_v2-1.zip' if p['id']=='quran-warsh' else '.roqia-feasibility/translations/'+p['preparation']['translationId']+'.txt')
  raw=source.read_bytes();assert len(raw)==a['bytes'] and hashlib.sha256(raw).hexdigest()==a['sha256']
  target=root/'bundled-content/roqia-offline'/p['id']/p['version']/a['file'];target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(raw)
print('Three original packs verified and bundled')
