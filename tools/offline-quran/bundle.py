"""Package the four pinned originals, byte-for-byte, for first-run offline import."""

import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parents[2]
texts = json.loads((root / 'src/features/quran/catalog.data.json').read_text())['texts']
translations = json.loads(
    (root / 'src/features/quran/translations.data.json').read_text()
)
packs = [t['pack'] for t in texts + translations]
for p in packs:
    for a in p['assets']:
        source = root / (
            '.roqia-feasibility/sources/'
            + {
                'quran-warsh': 'UthmanicWarsh_v2-1.zip',
                'quran-hafs': 'UthmanicHafs_v2-0.zip',
            }[p['id']]
            if 'quran-text' in p['capabilities']
            else '.roqia-feasibility/translations/'
            + p['preparation']['translationId']
            + '.txt'
        )
        raw = source.read_bytes()
        assert len(raw) == a['bytes'] and hashlib.sha256(raw).hexdigest() == a['sha256']
        target = (
            root / 'bundled-content/roqia-offline' / p['id'] / p['version'] / a['file']
        )
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(raw)
print('Four original packs verified and bundled')
