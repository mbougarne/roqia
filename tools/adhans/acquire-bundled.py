#!/usr/bin/env python3
"""Reproduce the reviewed Android adhan resources; never fetch audio at app runtime.
Requires Python 3 and FFmpeg/libmp3lame. Output must match the reviewed bytes.
"""
import argparse
import hashlib
import json
import pathlib
import shutil
import subprocess
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=pathlib.Path, required=True)
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    rows = json.loads((ROOT / 'tools/adhans/bundled-sources.json').read_text())
    for row in rows:
        source = args.cache / row['sourceFile']
        if not source.exists():
            with urllib.request.urlopen(urllib.request.Request(
                row['sourceURL'], headers={'User-Agent': 'Roqia content review (https://github.com/mbougarne/roqia)'}
            ), timeout=120) as response:
                source.write_bytes(response.read())
        if source.stat().st_size != row['sourceBytes'] or sha(source) != row['sourceSHA256']:
            raise ValueError('Source bytes changed: ' + row['sourceFile'])
        output = args.cache / pathlib.Path(row['file']).name
        if row['key'].startswith('doha_'):
            shutil.copyfile(source, output)
        else:
            command = ['ffmpeg', '-v', 'error', '-y']
            if row['clip']:
                command += ['-ss', str(row['clip'][0]), '-t', str(row['clip'][1])]
            command += ['-i', str(source), '-vn', '-ac', '1', '-c:a', 'libmp3lame', '-q:a', '3', '-map_metadata', '-1', str(output)]
            subprocess.run(command, check=True)
        if output.stat().st_size != row['bytes'] or sha(output) != row['sha256']:
            raise ValueError('Encoder output differs from reviewed bytes. Retain the packaged asset or review new output: ' + row['key'])
        shutil.copyfile(output, ROOT / row['file'])
        print(row['key'] + ': source and packaged hashes verified', flush=True)


if __name__ == '__main__':
    main()
