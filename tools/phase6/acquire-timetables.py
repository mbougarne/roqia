#!/usr/bin/env python3
"""Download official public HTML as data only. Never executes remote scripts."""

import concurrent.futures
import hashlib
import json
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[2]
out = Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)
cities = json.loads((root / 'src/features/prayer/cities.json').read_text())


def fetch(c):
    id = c['cityId']
    url = f'https://www.habous.gov.ma/prieres/index.php?ville={id}'
    p = out / (id + '.html')
    subprocess.run(['curl', '-sSfL', '--max-time', '30', url, '-o', str(p)], check=True)
    return {
        'cityId': id,
        'url': url,
        'sha256': hashlib.sha256(p.read_bytes()).hexdigest(),
    }


with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    rows = list(pool.map(fetch, cities))
(out / 'sources.json').write_text(json.dumps(rows, indent=2) + '\n')
