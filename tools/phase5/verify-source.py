#!/usr/bin/env python3
"""Run the shared source parser against locked originals and every chapter hash."""

import hashlib
import io
import json
import subprocess
import tempfile
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
with tempfile.TemporaryDirectory() as tmp:
    tmp = Path(tmp)
    locks = {
        s['file']: s
        for s in json.loads((ROOT / 'tools/feasibility/sources.lock.json').read_text())[
            'sources'
        ]
    }
    for kind, version in [('warsh', '2-1'), ('hafs', '2-0')]:
        prefix = f'Uthmanic{kind.title()}_v{version}'
        raw = (ROOT / '.roqia-feasibility/sources' / (prefix + '.zip')).read_bytes()
        lock = locks[prefix + '.zip']
        assert (
            len(raw) == lock['bytes']
            and hashlib.sha256(raw).hexdigest() == lock['sha256']
        )
        z = zipfile.ZipFile(io.BytesIO(raw))
        (tmp / (kind + '.json')).write_bytes(
            z.read(f'{prefix} data/{kind}Data_v{version}.json')
        )
        document_version = '21' if kind == 'warsh' else version
        doc = zipfile.ZipFile(
            io.BytesIO(
                z.read(f'{prefix} font/uthmanic_{kind}_v{document_version}.docx')
            )
        )
        root = ET.fromstring(doc.read('word/document.xml'))
        ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        ps = [
            ''.join(t.text or '' for t in p.findall('.//w:t', ns))
            for p in root.findall('.//w:body/w:p', ns)
        ]
        headings = [i for i, p in enumerate(ps) if p.startswith('سُورَةُ')]
        openings = {
            n: ps[i + 1]
            for n, i in enumerate(headings, 1)
            if ps[i + 1].startswith(('بِسْمِ', 'بِسۡمِ', 'بِّسۡمِ'))
        }
        assert len(headings) == 114 and len(openings) == 113 and 9 not in openings
        (tmp / (kind + '-openings.json')).write_text(
            json.dumps(openings, ensure_ascii=False)
        )
    subprocess.run(
        ['node', str(ROOT / 'tools/phase5/verify-source.cjs'), str(tmp)],
        cwd=ROOT,
        check=True,
    )
