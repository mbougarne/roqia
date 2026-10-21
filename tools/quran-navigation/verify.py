"""Verify section references against the locked, unchanged KFGQPC originals."""

import csv
import hashlib
import io
import json
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
reference = json.loads(
    Path(__file__).with_name('boundaries.reference.json').read_text()
)
locks = json.loads((ROOT / 'tools/feasibility/sources.lock.json').read_text())[
    'sources'
]
result = {}
for kind, version, count in [('hafs', '2-0', 6236), ('warsh', '2-1', 6214)]:
    filename = f'Uthmanic{kind.title()}_v{version}.zip'
    lock = next(s for s in locks if s['file'] == filename)
    raw = (ROOT / '.roqia-feasibility/sources' / filename).read_bytes()
    assert (
        len(raw) == lock['bytes'] and hashlib.sha256(raw).hexdigest() == lock['sha256']
    )
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        member = f'Uthmanic{kind.title()}_v{version} data/{kind}Data_v{version}'
        rows = json.loads(z.read(member + '.json'))
        other = list(
            csv.DictReader(io.StringIO(z.read(member + '.csv').decode('utf-8-sig')))
        )
    assert len(rows) == len(other) == count
    assert all(all(str(v) == b[k] for k, v in a.items()) for a, b in zip(rows, other))
    positions = {(a['sura_no'], a['aya_no']): a for a in rows}
    starts = reference[kind]['hizb']
    provenance = reference[kind]['provenance']
    reference_raw = (
        ROOT / '.roqia-feasibility/sources/navigation' / provenance['file']
    ).read_bytes()
    assert hashlib.sha256(reference_raw).hexdigest() == provenance['fileSha256']
    if kind == 'hafs':
        quarters = re.search(
            r'export const HizbQuarterList: AyahId\[\] = \[([\s\S]*?)\]',
            reference_raw.decode(),
        )[1]
        ordinal_starts = list(map(int, re.findall(r'\d+', quarters)))[1:-1:4]
        extracted = [
            [rows[i - 1]['sura_no'], rows[i - 1]['aya_no']] for i in ordinal_starts
        ]
    else:
        originals = json.loads(reference_raw)
        assert [h['number'] for h in originals] == list(range(1, 61))
        assert all(
            not h['start']['partial_verse'] and h['start']['char_offset'] == 0
            for h in originals
        )
        extracted = [[h['start']['sura'], h['start']['aya']] for h in originals]
    assert starts == extracted, 'reference_extraction_mismatch'
    assert len(starts) == 60 and starts[0] == [1, 1]
    ids = [positions[tuple(start)]['id'] for start in starts]
    assert ids == sorted(set(ids)) and ids[0] == 1
    # A section starts at a surah opening or the publisher's original division
    # ornament. Never infer Warsh coordinates from Hafs verse ordinals.
    assert all(v == 1 or '۞' in positions[s, v]['aya_text'] for s, v in starts)
    # All 30 Warsh juz starts agree with the publisher's own labels. Hafs has
    # two off-by-one labels: its division ornament is at 3:93 / 9:93 instead.
    mismatches = []
    publisher_starts = [
        [r['sura_no'], r['aya_no']]
        for i, r in enumerate(rows)
        if i == 0 or rows[i - 1]['jozz'] != r['jozz']
    ]
    assert len(publisher_starts) == 30
    for i, (start, publisher) in enumerate(zip(starts[::2], publisher_starts), 1):
        if start != publisher:
            mismatches.append([i, start, publisher])
    assert mismatches == (
        [[4, [3, 93], [3, 92]], [11, [9, 93], [9, 94]]] if kind == 'hafs' else []
    ), mismatches
    # Inclusive ranges tile every original verse once, with no gaps/overlap.
    assert sum(b - a for a, b in zip(ids, ids[1:] + [count + 1])) == count
    result[kind] = starts

target = ROOT / 'src/features/quran/division-index.json'
encoded = json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n'
if '--check' in sys.argv:
    assert json.loads(target.read_text()) == result, 'division_index_stale'
else:
    target.write_text(encoded)
print(
    'Verified 60 hizbs and 30 juz per riwaya against original division markers and verse identities.'
)
