#!/usr/bin/env python3
"""Refresh metadata only from the official MP3Quran catalogs; never download audio."""
import datetime
import json
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[2]


def fetch(url):
    with urlopen(url, timeout=30) as response:
        return json.load(response)


def main():
    timing = fetch('https://www.mp3quran.net/api/v3/ayat_timing/reads')
    rows = []
    for rid, riwaya, arabic in [(2, 'warsh', 'ورش عن نافع'), (1, 'hafs', 'حفص عن عاصم')]:
        url = f'https://www.mp3quran.net/api/v3/reciters?language=ar&rewaya={rid}'
        for reciter in fetch(url)['reciters']:
            for read in reciter['moshaf']:
                assert read['rewaya_id'] == rid
                surahs = list(map(int, read['surah_list'].split(',')))
                assert len(set(surahs)) == len(surahs) and all(1 <= n <= 114 for n in surahs)
                rows.append({'id': f'mp3quran-{read["id"]}-{riwaya}', 'read': read['id'],
                             'reciterId': reciter['id'], 'title': reciter['name'], 'label': read['name'],
                             'riwaya': riwaya, 'folder': read['server'], 'surahs': read['surah_list'],
                             'sourceUrl': url, 'timingAvailable': any(t['id'] == read['id'] and
                              t['folder_url'] == read['server'] and t['rewaya'] == arabic for t in timing)})
    assert len({r['id'] for r in rows}) == len(rows)
    output = {'fetchedAt': datetime.datetime.now(datetime.timezone.utc).date().isoformat(), 'recordings': rows}
    (ROOT / 'src/features/quran/remote-recordings.data.json').write_text(
        json.dumps(output, ensure_ascii=False, indent=2) + '\n')
    print(f'{len(rows)} recording descriptors; run catalog tests and review source changes before committing.')


if __name__ == '__main__':
    main()
