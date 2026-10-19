#!/usr/bin/env python3
"""Package the five user-provided originals and reproduce the 00:00–00:15 clip.
Requires Python 3 and FFmpeg/libmp3lame. No network acquisition.
"""
import hashlib
import json
import pathlib
import shutil
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[2]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    rows = json.loads((ROOT / 'tools/adhans/bundled-sources.json').read_text())
    with tempfile.TemporaryDirectory(prefix='roqia-numbered-adhans-') as directory:
        for row in rows:
            source = ROOT / row['sourceFile']
            if source.stat().st_size != row['sourceBytes'] or sha(source) != row['sourceSHA256']:
                raise ValueError('Source bytes changed: ' + row['sourceFile'])
            output = pathlib.Path(directory) / pathlib.Path(row['file']).name
            if row['clip']:
                subprocess.run([
                    'ffmpeg', '-v', 'error', '-y', '-i', str(source),
                    '-t', str(row['clip']['end'] - row['clip']['start']),
                    '-vn', '-c:a', 'libmp3lame', '-q:a', '3',
                    '-map_metadata', '-1', str(output),
                ], check=True)
            else:
                shutil.copyfile(source, output)
            if output.stat().st_size != row['bytes'] or sha(output) != row['sha256']:
                raise ValueError('Encoder output differs from reviewed bytes: ' + row['file'])
            shutil.copyfile(output, ROOT / row['file'])
            print(row['resource'] + ': source and packaged hashes verified', flush=True)


if __name__ == '__main__':
    main()
