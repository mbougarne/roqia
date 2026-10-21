#!/usr/bin/env python3
"""Generate metadata/hashes only. The app downloads originals; no corpus/font is republished."""

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
from content import verify
from kfgqpc_hafs import build as build_hafs
from warsh import DATA, FONT, font_names, validate_rows

sha = lambda b: hashlib.sha256(b).hexdigest()


def encoded(value):
    return (
        json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n'
    ).encode()


def generate():
    sources = ROOT / '.roqia-feasibility/sources'
    locks = {
        x['id']: x
        for x in json.loads((ROOT / 'tools/feasibility/sources.lock.json').read_text())[
            'sources'
        ]
    }

    def original(id):
        x = locks[id]
        raw = (sources / x['file']).read_bytes()
        verify(raw, x)
        return raw

    def file(id, name, raw, mime, url=None):
        a = {
            'id': id,
            'file': name,
            'bytes': len(raw),
            'sha256': sha(raw),
            'mime': mime,
        }
        if url:
            a['url'] = url
        return a

    catalog = {'texts': [], 'translations': [], 'recordings': []}
    edition = 'warsh-kfgqpc-v2.1-update6'
    numbering = 'kfgqpc-warsh-v2.1'
    source = locks['kfgqpc-warsh-v2.1-update6']
    raw = original(source['id'])
    assets = [
        file(
            'original',
            'original.zip',
            raw,
            'application/zip',
            source['url'],
        )
    ]
    derived = []
    openings = {}
    prep = {
        'kind': 'quran-source-v1',
        'editionId': edition,
        'sourceAssetId': 'original',
    }
    z = zipfile.ZipFile(io.BytesIO(raw))
    rows = json.loads(z.read(DATA + 'warshData_v2-1.json'))
    validate_rows(
        rows,
        list(
            csv.DictReader(
                io.StringIO(z.read(DATA + 'warshData_v2-1.csv').decode('utf-8-sig'))
            )
        ),
    )
    members = [
        (
            DATA + 'warshData_v2-1.json',
            'source-data',
            'original-data.json',
            'application/json',
        ),
        (FONT, 'source-font', 'source-font.ttf', 'font/ttf'),
        (
            'UthmanicWarsh_v2-1 font/uthmanic_warsh_v21.docx',
            'source-document',
            'original-document.docx',
            'application/zip',
        ),
        (DATA + 'read.me', 'source-readme', 'source-readme.txt', 'text/plain'),
    ]
    for entry, id, name, mime in members:
        derived.append(file(id, name, z.read(entry), mime))
    prep.update(
        dataAssetId='source-data',
        documentAssetId='source-document',
        archiveMembers=[{'entry': e, 'assetId': i} for e, i, _, _ in members],
    )
    document = zipfile.ZipFile(io.BytesIO(z.read(members[2][0])))
    ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    root = ET.fromstring(document.read('word/document.xml'))
    ps = [
        ''.join(t.text or '' for t in p.findall('.//w:t', ns))
        for p in root.findall('.//w:body/w:p', ns)
    ]
    headings = [i for i, p in enumerate(ps) if p.startswith('سُورَةُ')]
    assert len(headings) == 114
    openings = {
        n: ps[i + 1] for n, i in enumerate(headings, 1) if ps[i + 1].startswith('بِسْمِ')
    }
    assert len(openings) == 113 and 9 not in openings
    chapters = [
        {
            'surah': n,
            'verses': [
                {
                    'number': r['aya_no'],
                    'text': r['aya_text'],
                    'sourceId': str(r['id']),
                }
                for r in rows
                if r['sura_no'] == n
            ],
        }
        for n in range(1, 115)
    ]
    names = font_names(z.read(FONT))
    notice = (
        'King Fahd Glorious Quran Printing Complex · Warsh v2.1 / update 6.0\nhttps://qurancomplex.gov.sa/en/techquran/dev/\nOriginal archive, unchanged, delivered by the quran.ws mirror; publisher checksums recorded in the app source.\n\n'
        + '\n'.join(names.get('0', []) + names.get('13', []))
    )
    prep['notice'] = notice
    for c in chapters:
        c = {
            **c,
            'editionId': edition,
            'numberingScheme': numbering,
            'sourceNotice': notice,
            **({'opening': openings[c['surah']]} if c['surah'] in openings else {}),
        }
        derived.append(
            file(
                'chapter-' + str(c['surah']),
                f'{c["surah"]:03}.json',
                encoded(c),
                'application/json',
            )
        )
    pack = {
        'id': 'quran-warsh',
        'version': 'source-1',
        'title': 'مصحف ورش عن نافع',
        'manifestHash': '',
        'review': 'approved',
        'capabilities': ['quran-text'],
        'sourceMetadata': {
            'publisher': 'KFGQPC',
            'edition': edition,
            'delivery': 'original-source-on-device-import',
            'manualArabicReview': 'deferred-owner-2026-10-18',
            'sourceSha256': source['sha256'],
        },
        'assets': assets,
        'derivedAssets': derived,
        'preparation': prep,
    }
    # approved authorizes this transport/import descriptor; manual review is explicitly deferred.
    pack['manifestHash'] = sha(
        encoded({k: v for k, v in pack.items() if k != 'manifestHash'})
    )
    catalog['texts'].append(
        {
            'editionId': edition,
            'pack': pack,
            'chapterAssets': {str(n): 'chapter-' + str(n) for n in range(1, 115)},
            'fontAssetId': 'source-font',
            'notice': notice,
            'basmalaPolicy': 'source-verbatim',
        }
    )
    source = locks['kfgqpc-hafs-v2.0-update13']
    catalog['texts'].append(
        build_hafs(
            original(source['id']),
            source,
            [
                c['hafsVerses']
                for c in json.loads(
                    (ROOT / 'src/features/quran/chapters.json').read_text()
                )
            ],
        )
    )
    return catalog


if __name__ == '__main__':
    target = ROOT / 'src/features/quran/catalog.data.json'
    data = json.dumps(generate(), ensure_ascii=False, indent=2) + '\n'
    if '--check' in sys.argv:
        assert target.read_text() == data, (
            'Catalog metadata drift; regenerate from locked originals'
        )
    else:
        target.write_text(data)
