#!/usr/bin/env python3
"""Prepare private, unpublished Android fixtures from locked sources. No text normalization."""

import argparse
import csv
import hashlib
import io
import json
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/feasibility'))
from content import metadata_counts, parse_tanzil, verify
from warsh import DATA, FONT, font_names, validate_rows

sha = lambda b: hashlib.sha256(b).hexdigest()


def main(source, translations, out):
    if out.exists():
        raise ValueError('Use a new output directory')
    out.mkdir(parents=True)
    locks = {
        s['id']: s
        for s in json.loads((ROOT / 'tools/feasibility/sources.lock.json').read_text())[
            'sources'
        ]
    }

    def locked(id):
        e = locks[id]
        raw = (source / e['file']).read_bytes()
        verify(raw, e)
        return raw

    hafs, notice = parse_tanzil(
        locked('tanzil-uthmani-1.1'), metadata_counts(locked('tanzil-metadata-1.0'))
    )
    with zipfile.ZipFile(io.BytesIO(locked('kfgqpc-warsh-v2.1-update6'))) as z:
        rows = json.loads(z.read(DATA + 'warshData_v2-1.json'))
        validate_rows(
            rows,
            list(
                csv.DictReader(
                    io.StringIO(z.read(DATA + 'warshData_v2-1.csv').decode('utf-8-sig'))
                )
            ),
        )
        font = z.read(FONT)
        fontNotice = '\n'.join(font_names(font).get('13', []))
    warsh = [
        {
            'surah': n,
            'verses': [
                {'number': r['aya_no'], 'text': r['aya_text'], 'sourceId': str(r['id'])}
                for r in rows
                if r['sura_no'] == n
            ],
        }
        for n in range(1, 115)
    ]
    metadata = ET.fromstring(locked('tanzil-metadata-1.0')).findall('./suras/sura')
    expected = [
        {
            'number': int(r.get('index')),
            'name': r.get('name'),
            'english': r.get('ename'),
            'transliteration': r.get('tname'),
            'hafsVerses': int(r.get('ayas')),
            'warshVerses': len(warsh[i]['verses']),
        }
        for i, r in enumerate(metadata)
    ]
    assert (
        json.loads((ROOT / 'src/features/quran/chapters.json').read_text()) == expected
    ), 'Bundled metadata differs from locked originals'
    catalog = {'texts': [], 'translations': [], 'recordings': []}
    reports = []

    def pack(id, title, files, capabilities, metadata):
        directory = out / id
        directory.mkdir()
        assets = []
        for name, raw, mime in files:
            (directory / name).write_bytes(raw)
            assets.append(
                {
                    'id': name.replace('.', '-'),
                    'file': name,
                    'url': f'http://127.0.0.1:8083/{id}/{name}',
                    'bytes': len(raw),
                    'sha256': sha(raw),
                    'mime': mime,
                }
            )
        return {
            'id': id,
            'version': 'fixture-1',
            'title': title,
            'manifestHash': sha(json.dumps(assets, sort_keys=True).encode()),
            'review': 'approved',
            'capabilities': capabilities,
            'sourceMetadata': metadata,
            'assets': assets,
        }

    for kind, edition, numbering, chapters, fontBytes, sourceNotice in [
        (
            'warsh',
            'warsh-kfgqpc-v2.1-update6',
            'kfgqpc-warsh-v2.1',
            warsh,
            font,
            fontNotice
            + '\nPrivate local test; Quran data redistribution and qualified review pending.',
        ),
        (
            'hafs',
            'hafs-tanzil-uthmani-1.1',
            'tanzil-madina-hafs',
            hafs,
            (ROOT / 'src/assets/fonts/NotoSansArabic.ttf').read_bytes()
            if (ROOT / 'src/assets/fonts/NotoSansArabic.ttf').exists()
            else (
                ROOT / 'android/app/src/main/assets/fonts/NotoSansArabic.ttf'
            ).read_bytes(),
            notice,
        ),
    ]:
        files = []
        for c in chapters:
            c = {
                **c,
                'editionId': edition,
                'numberingScheme': numbering,
                'sourceNotice': sourceNotice,
            }
            raw = (json.dumps(c, ensure_ascii=False) + '\n').encode()
            assert json.loads(raw)['verses'] == c['verses']
            files.append((f'{c["surah"]:03}.json', raw, 'application/json'))
        files.append(('source-font.ttf', fontBytes, 'font/ttf'))
        p = pack(
            f'phase4-lab-{kind}',
            f'LOCAL TEST · {kind}',
            files,
            ['quran-text'],
            {
                'publisher': 'KFGQPC' if kind == 'warsh' else 'Tanzil',
                'purpose': 'private-debug-only',
                'edition': edition,
            },
        )
        catalog['texts'].append(
            {
                'editionId': edition,
                'pack': p,
                'chapterAssets': {str(n): f'{n:03}-json' for n in range(1, 115)},
                'fontAssetId': 'source-font-ttf',
                'notice': sourceNotice,
                'basmalaPolicy': 'source-verbatim',
            }
        )
        reports.append(
            {
                'edition': edition,
                'chapters': len(chapters),
                'verses': sum(len(c['verses']) for c in chapters),
                'canonicalRoundTrip': True,
                'fontSha256': sha(fontBytes),
            }
        )
    for id, lang, title in [
        ('fr.hamidullah', 'fr', 'Muhammad Hamidullah'),
        ('en.pickthall', 'en', 'Mohammed Marmaduke William Pickthall'),
    ]:
        raw = (translations / (id + '.txt')).read_bytes()
        lock = json.loads(
            (Path(__file__).with_name('translations.lock.json')).read_text()
        )[id]
        verify(raw, {'id': id, **lock})
        text = raw.decode('utf-8')
        lines = [l for l in text.splitlines() if l and not l.startswith('#')]
        verses = []
        for l in lines:
            fields = l.split('|', 2)
            if len(fields) != 3:
                continue
            verses.append((int(fields[0]), int(fields[1]), fields[2]))
        expected = [(c['surah'], v['number']) for c in hafs for v in c['verses']]
        assert [(s, v) for s, v, _ in verses] == expected
        notice = (
            '\n'.join(l for l in text.splitlines() if l.startswith('#'))
            + '\nhttps://tanzil.net/trans/ · Non-commercial use. Private validation; editorial review pending.'
        )
        files = []
        for s in range(1, 115):
            c = {
                'translationId': id,
                'textVersion': 'fixture-1',
                'editionId': 'hafs-tanzil-uthmani-1.1',
                'numberingScheme': 'tanzil-madina-hafs',
                'surah': s,
                'verses': [{'number': v, 'text': t} for n, v, t in verses if n == s],
                'sourceNotice': notice,
            }
            data = (json.dumps(c, ensure_ascii=False) + '\n').encode()
            assert json.loads(data) == c
            files.append((f'{s:03}.json', data, 'application/json'))
        p = pack(
            'phase4-lab-' + lang,
            title,
            files,
            ['translation'],
            {
                'translator': title,
                'source': 'https://tanzil.net/trans/',
                'purpose': 'private-debug-only',
            },
        )
        catalog['translations'].append(
            {
                'id': id,
                'language': lang,
                'title': title,
                'editionId': 'hafs-tanzil-uthmani-1.1',
                'numberingScheme': 'tanzil-madina-hafs',
                'textVersion': 'fixture-1',
                'pack': p,
                'chapterAssets': {str(n): f'{n:03}-json' for n in range(1, 115)},
                'notice': notice,
            }
        )
        reports.append(
            {
                'translation': id,
                'records': len(verses),
                'canonicalRoundTrip': True,
                'sourceSha256': sha(raw),
            }
        )
    audioReport = json.loads(
        (ROOT / 'docs/feasibility/android/evidence/audio-inventory.json').read_text()
    )
    for recording in audioReport['recordings']:
        # Only locked, previously acquired sample files; never label the fixture complete.
        if not recording.get('files'):
            continue
        files = []
        for f in recording['files']:
            if not (
                ROOT
                / '.roqia-feasibility/audio'
                / recording['id']
                / f'{f["surah"]:03}.mp3'
            ).exists():
                continue
            raw = (
                ROOT
                / '.roqia-feasibility/audio'
                / recording['id']
                / f'{f["surah"]:03}.mp3'
            ).read_bytes()
            verify(raw, {'id': recording['id'], **f})
            p = pack(
                f'phase4-lab-audio-{recording["recordingSetId"]}-{f["surah"]}',
                recording['reciterName'],
                [(f'{f["surah"]:03}.mp3', raw, 'audio/mpeg')],
                ['audio'],
                {
                    'reciter': recording['reciterName'],
                    'riwaya': recording['riwaya'],
                    'purpose': 'private-debug-only',
                },
            )
            files.append(
                {'surah': f['surah'], 'pack': p, 'assetId': f'{f["surah"]:03}-mp3'}
            )
        catalog['recordings'].append(
            {
                'id': recording['id'],
                'title': recording['reciterName'],
                'riwaya': recording['riwaya'],
                'tariq': recording['tariq'],
                'quality': 'ملف المصدر الأصلي',
                'notice': 'Private local samples; recording identity and redistribution review pending. https://www.mp3quran.net/',
                'chapters': files,
            }
        )
    (out / 'catalog.json').write_text(
        json.dumps(catalog, ensure_ascii=False, indent=2) + '\n'
    )
    (out / 'validation.json').write_text(
        json.dumps(
            {
                'privateFixtureOnly': True,
                'notPublicationApproval': True,
                'reports': reports,
            },
            indent=2,
        )
        + '\n'
    )


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--sources', type=Path, default=ROOT / '.roqia-feasibility/sources')
    p.add_argument('--translations', type=Path, required=True)
    p.add_argument('--out', type=Path, required=True)
    a = p.parse_args()
    main(a.sources, a.translations, a.out)
