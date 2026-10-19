#!/usr/bin/env python3
"""Apply Roqia's reviewed Android patch to exactly Track Player 5.0.0-alpha0. Fail on drift."""

import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACKAGE = ROOT / 'node_modules/react-native-track-player'
HERE = Path(__file__).resolve().parent


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest() if path.exists() else None


def main():
    if json.loads((PACKAGE / 'package.json').read_text())['version'] != '5.0.0-alpha0':
        raise RuntimeError('Review player patch for new version')
    manifest = json.loads((HERE / 'player-patch.json').read_text())
    current = {name: digest(PACKAGE / name) for name in manifest}
    if all(current[name] == hashes['after'] for name, hashes in manifest.items()):
        return
    if not all(current[name] == hashes['before'] for name, hashes in manifest.items()):
        raise RuntimeError(
            'Player sources differ from pinned patch inputs; reinstall before patching'
        )
    subprocess.run(
        ['patch', '-p1', '-i', str(HERE / 'player.patch')], cwd=PACKAGE, check=True
    )
    if not all(
        digest(PACKAGE / name) == hashes['after'] for name, hashes in manifest.items()
    ):
        raise RuntimeError('Player patch verification failed')


if __name__ == '__main__':
    main()
