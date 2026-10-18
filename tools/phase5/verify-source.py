#!/usr/bin/env python3
"""Compare actual on-phone parser output with all pinned chapter hashes, without publishing text."""
import json,subprocess,tempfile,zipfile,io,xml.etree.ElementTree as ET
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
with tempfile.TemporaryDirectory() as tmp:
    tmp=Path(tmp);z=zipfile.ZipFile(ROOT/'.roqia-feasibility/sources/UthmanicWarsh_v2-1.zip')
    (tmp/'warsh.json').write_bytes(z.read('UthmanicWarsh_v2-1 data/warshData_v2-1.json'))
    doc=zipfile.ZipFile(io.BytesIO(z.read('UthmanicWarsh_v2-1 font/uthmanic_warsh_v21.docx')));root=ET.fromstring(doc.read('word/document.xml'));ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    ps=[''.join(t.text or '' for t in p.findall('.//w:t',ns)) for p in root.findall('.//w:body/w:p',ns)];headings=[i for i,p in enumerate(ps) if p.startswith('سُورَةُ')]
    openings={n:ps[i+1] for n,i in enumerate(headings,1) if ps[i+1].startswith('بِسْمِ')};(tmp/'openings.json').write_text(json.dumps(openings,ensure_ascii=False))
    subprocess.run(['node',str(ROOT/'tools/phase5/verify-source.cjs'),str(tmp)],cwd=ROOT,check=True)
