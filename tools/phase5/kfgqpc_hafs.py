"""Build deterministic descriptors from KFGQPC's unchanged Hafs archive."""

import csv
import hashlib
import io
import json
import xml.etree.ElementTree as ET
import zipfile

from warsh import font_names

EDITION = 'hafs-kfgqpc-v2.0-update13'
VERSION = 'kfgqpc-2.0-update13'
NUMBERING = 'kfgqpc-madina-hafs'


def build(raw, source, counts):
    sha = lambda b: hashlib.sha256(b).hexdigest()
    encoded = lambda v: (
        json.dumps(v, ensure_ascii=False, separators=(',', ':')) + '\n'
    ).encode()
    assert len(raw) == source['bytes'] and sha(raw) == source['sha256']
    assert hashlib.md5(raw).hexdigest() == source['publisherMd5']
    assert hashlib.sha1(raw).hexdigest() == source['publisherSha1']
    z = zipfile.ZipFile(io.BytesIO(raw))
    data = 'UthmanicHafs_v2-0 data/'
    font = 'UthmanicHafs_v2-0 font/'
    rows = json.loads(z.read(data + 'hafsData_v2-0.json'))
    csv_rows = list(
        csv.DictReader(
            io.StringIO(z.read(data + 'hafsData_v2-0.csv').decode('utf-8-sig'))
        )
    )
    assert len(rows) == len(csv_rows) == 6236
    seen = [0] * 114
    for index, (r, other) in enumerate(zip(rows, csv_rows), 1):
        assert r['id'] == index and 1 <= r['sura_no'] <= 114
        seen[r['sura_no'] - 1] += 1
        assert r['aya_no'] == seen[r['sura_no'] - 1] and r['aya_text'].strip()
        assert set(other) == set(r) and all(str(v) == other[k] for k, v in r.items())
    assert seen == counts
    document = zipfile.ZipFile(io.BytesIO(z.read(font + 'uthmanic_hafs_v2-0.docx')))
    ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    xml = ET.fromstring(document.read('word/document.xml'))
    ps = [
        ''.join(t.text or '' for t in p.findall('.//w:t', ns))
        for p in xml.findall('.//w:body/w:p', ns)
    ]
    headings = [i for i, p in enumerate(ps) if p.startswith('سُورَةُ')]
    assert len(headings) == 114
    openings = {
        n: ps[i + 1]
        for n, i in enumerate(headings, 1)
        if ps[i + 1].startswith(('بِسۡمِ', 'بِّسۡمِ'))
    }
    assert len(openings) == 113 and 9 not in openings
    # Al-Fatihah's basmala is already verse 1 in this Hafs source. The other
    # openings come verbatim from its Word document, outside the verse rows.
    del openings[1]
    names = font_names(z.read(font + 'uthmanic_hafs_v20.ttf'))
    notice = (
        'King Fahd Glorious Quran Printing Complex · Hafs v2.0 / update 13.0\n'
        'https://qurancomplex.gov.sa/en/techquran/dev/\n'
        'Original archive, unchanged, delivered by the quran.ws mirror; publisher checksums recorded in the app source.\n\n'
        + '\n'.join(names.get('0', []) + names.get('13', []))
    )

    def asset(id, file, content, mime, url=None):
        return dict(
            id=id,
            file=file,
            bytes=len(content),
            sha256=sha(content),
            mime=mime,
            **({'url': url} if url else {}),
        )

    members = [
        (
            data + 'hafsData_v2-0.json',
            'source-data',
            'original-data.json',
            'application/json',
        ),
        (font + 'uthmanic_hafs_v20.ttf', 'source-font', 'source-font.ttf', 'font/ttf'),
        (
            font + 'uthmanic_hafs_v2-0.docx',
            'source-document',
            'original-document.docx',
            'application/zip',
        ),
        (data + 'read.me', 'source-readme', 'source-readme.txt', 'text/plain'),
    ]
    derived = [
        asset(id, file, z.read(entry), mime) for entry, id, file, mime in members
    ]
    for surah in range(1, 115):
        chapter = dict(
            surah=surah,
            verses=[
                dict(number=r['aya_no'], text=r['aya_text'], sourceId=str(r['id']))
                for r in rows
                if r['sura_no'] == surah
            ],
            editionId=EDITION,
            numberingScheme=NUMBERING,
            sourceNotice=notice,
            **({'opening': openings[surah]} if surah in openings else {}),
        )
        derived.append(
            asset(
                f'chapter-{surah}',
                f'{surah:03}.json',
                encoded(chapter),
                'application/json',
            )
        )
    pack = dict(
        id='quran-hafs',
        version=VERSION,
        title='مصحف حفص عن عاصم',
        manifestHash='',
        review='approved',
        capabilities=['quran-text'],
        sourceMetadata=dict(
            publisher='KFGQPC',
            edition=EDITION,
            delivery='original-source-on-device-import',
            manualArabicReview='pending-iphone-2026-10-21',
            sourceSha256=source['sha256'],
        ),
        assets=[
            asset('original', 'original.zip', raw, 'application/zip', source['url'])
        ],
        derivedAssets=derived,
        preparation=dict(
            kind='quran-source-v1',
            editionId=EDITION,
            sourceAssetId='original',
            notice=notice,
            dataAssetId='source-data',
            documentAssetId='source-document',
            archiveMembers=[dict(entry=e, assetId=i) for e, i, _, _ in members],
        ),
    )
    pack['manifestHash'] = sha(
        encoded({k: v for k, v in pack.items() if k != 'manifestHash'})
    )
    return dict(
        editionId=EDITION,
        pack=pack,
        chapterAssets={str(n): f'chapter-{n}' for n in range(1, 115)},
        fontAssetId='source-font',
        notice=notice,
        basmalaPolicy='source-verbatim',
    )
