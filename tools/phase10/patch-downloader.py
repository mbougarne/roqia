#!/usr/bin/env python3
"""Apply Roqia's reviewed Android patch to exactly downloader 4.6.3. Fail on drift."""

import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACKAGE = ROOT / 'node_modules/@kesha-antonov/react-native-background-downloader'
HERE = Path(__file__).resolve().parent


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest() if path.exists() else None


def main():
    if json.loads((PACKAGE / 'package.json').read_text())['version'] != '4.6.3':
        raise RuntimeError('Review downloader patch for new version')
    manifest = json.loads((HERE / 'downloader-patch.json').read_text())
    current = {name: digest(PACKAGE / name) for name in manifest}
    if all(current[name] == hashes['after'] for name, hashes in manifest.items()):
        return
    if not all(current[name] == hashes['before'] for name, hashes in manifest.items()):
        raise RuntimeError(
            'Downloader sources differ from pinned patch inputs; reinstall before patching'
        )
    subprocess.run(
        ['patch', '-p1', '-i', str(HERE / 'downloader.patch')], cwd=PACKAGE, check=True
    )
    if not all(
        digest(PACKAGE / name) == hashes['after'] for name, hashes in manifest.items()
    ):
        raise RuntimeError('Downloader patch verification failed')


if __name__ == '__main__':
    main()
