#!/usr/bin/env python3
"""Build a draft audio inventory; optionally probe six real provider files."""

import argparse
import json
import subprocess
from pathlib import Path

from content import WORK, digest, recording_catalog

HERE = Path(__file__).parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--fetch-samples', action='store_true')
    args = parser.parse_args()
    recordings, sources = [], []
    for name, riwaya, ids in [('reciters-warsh', 2, [120]), ('reciters-hafs', 1, [1])]:
        raw = (HERE / 'fixtures' / f'{name}.json').read_bytes()
        sources.append(
            {
                'url': f'https://www.mp3quran.net/api/v3/reciters?language=eng&rewaya={riwaya}',
                'retrievedAt': '2026-10-18',
                'snapshotSha256': digest(raw),
            }
        )
        recordings += recording_catalog(json.loads(raw), riwaya, ids)
    if args.fetch_samples:
        for recording in recordings:
            for entry in recording['files']:
                if entry['surah'] not in (1, 112, 114):
                    continue
                target = WORK / 'audio' / recording['id'] / f'{entry["surah"]:03}.mp3'
                target.parent.mkdir(parents=True, exist_ok=True)
                headers = target.with_suffix('.headers')
                subprocess.run(
                    [
                        'curl',
                        '--fail',
                        '--silent',
                        '--show-error',
                        '--location',
                        '--proto',
                        '=https',
                        '--proto-redir',
                        '=https',
                        '--max-time',
                        '90',
                        '--max-filesize',
                        '20000000',
                        '--dump-header',
                        str(headers),
                        entry['url'],
                        '-o',
                        str(target),
                    ],
                    check=True,
                )
                raw = target.read_bytes()
                signature = raw[:3] == b'ID3' or (
                    len(raw) > 2 and raw[0] == 255 and raw[1] & 224 == 224
                )
                if not signature:
                    raise ValueError('Not an ID3/MPEG audio file')
                selected_headers = [
                    line.strip()
                    for line in headers.read_text().splitlines()
                    if line.lower().startswith(
                        (
                            'http/',
                            'content-type:',
                            'etag:',
                            'accept-ranges:',
                            'content-length:',
                        )
                    )
                ]
                metadata = json.loads(
                    subprocess.check_output(
                        [
                            'ffprobe',
                            '-v',
                            'error',
                            '-show_entries',
                            'format=duration:stream=codec_name,sample_rate,channels',
                            '-of',
                            'json',
                            str(target),
                        ]
                    )
                )
                entry.update(
                    {
                        'decoderMetadata': metadata,
                        'verification': 'transport-and-signature-only',
                        'bytes': len(raw),
                        'sha256': digest(raw),
                        'responseHeaders': selected_headers,
                        'listeningReview': 'pending',
                    }
                )
    print(
        json.dumps(
            {'status': 'draft', 'sources': sources, 'recordings': recordings},
            indent=2,
            ensure_ascii=False,
        )
    )


if __name__ == '__main__':
    main()
