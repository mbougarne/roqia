#!/usr/bin/env python3
"""Validate the pinned Warsh source and prepare local-only Android font fixtures."""
import argparse
import csv
import io
import json
import struct
import zipfile
from collections import Counter
from pathlib import Path

from content import LOCK, WORK, digest, verify

EDITION = 'warsh-kfgqpc-v2.1-update6'
ARCHIVE_ID = 'kfgqpc-warsh-v2.1-update6'
FONT_ID = 'almaghribi-v4.9.6-evaluation'
DATA = 'UthmanicWarsh_v2-1 data/'
FONT = 'UthmanicWarsh_v2-1 font/uthmanic_warsh_v21.ttf'


def font_tables(raw):
    return {tag.decode('ascii'): (offset, length)
            for tag, _, offset, length in
            (struct.unpack_from('>4sIII', raw, 12 + i * 16)
             for i in range(struct.unpack_from('>H', raw, 4)[0]))}


def font_names(raw):
    offset, _ = font_tables(raw)['name']
    _, count, storage = struct.unpack_from('>HHH', raw, offset)
    result = {}
    for i in range(count):
        platform, _, _, name_id, length, start = struct.unpack_from('>HHHHHH', raw, offset + 6 + i * 12)
        if platform not in (0, 3):
            continue
        value = raw[offset + storage + start:offset + storage + start + length].decode('utf-16-be')
        result.setdefault(str(name_id), [])
        if value not in result[str(name_id)]:
            result[str(name_id)].append(value)
    return result


def font_cmap(raw):
    """Read Unicode cmap formats 4/12, not system fallback or glyph semantics."""
    offset, _ = font_tables(raw)['cmap']
    result = {}
    for i in range(struct.unpack_from('>H', raw, offset + 2)[0]):
        platform, encoding, relative = struct.unpack_from('>HHI', raw, offset + 4 + i * 8)
        if not (platform == 0 or platform == 3 and encoding in (1, 10)):
            continue
        start = offset + relative
        fmt = struct.unpack_from('>H', raw, start)[0]
        if fmt == 4:
            count = struct.unpack_from('>H', raw, start + 6)[0] // 2
            for j in range(count):
                end = struct.unpack_from('>H', raw, start + 14 + 2 * j)[0]
                first = struct.unpack_from('>H', raw, start + 16 + 2 * count + 2 * j)[0]
                delta = struct.unpack_from('>h', raw, start + 16 + 4 * count + 2 * j)[0]
                position = start + 16 + 6 * count + 2 * j
                distance = struct.unpack_from('>H', raw, position)[0]
                for cp in range(first, end + 1):
                    if distance:
                        glyph = struct.unpack_from('>H', raw, position + distance + 2 * (cp - first))[0]
                        glyph = (glyph + delta) & 65535 if glyph else 0
                    else:
                        glyph = (cp + delta) & 65535
                    if glyph:
                        result[cp] = glyph
        elif fmt == 12:
            for j in range(struct.unpack_from('>I', raw, start + 12)[0]):
                first, end, glyph = struct.unpack_from('>III', raw, start + 16 + 12 * j)
                result.update({cp: glyph + cp - first for cp in range(first, end + 1) if glyph + cp - first})
    if not result:
        raise ValueError('No supported Unicode cmap')
    return result


def validate_rows(rows, csv_rows):
    if len(rows) != 6214 or len(csv_rows) != len(rows):
        raise ValueError('Expected 6214 records in this specific edition')
    counts = Counter()
    previous_surah = 1
    for index, (row, csv_row) in enumerate(zip(rows, csv_rows), 1):
        surah, ayah = row['sura_no'], row['aya_no']
        if row['id'] != index or surah not in (previous_surah, previous_surah + 1) or not 1 <= surah <= 114:
            raise ValueError('Missing, duplicate or reordered source record')
        counts[surah] += 1
        if ayah != counts[surah] or not isinstance(row['aya_text'], str) or not row['aya_text'].strip():
            raise ValueError('Invalid verse sequence/text')
        if set(csv_row) != set(row) or any(str(value) != csv_row[key] for key, value in row.items()):
            raise ValueError('JSON and CSV disagree; do not normalize either source')
        previous_surah = surah
    if set(counts) != set(range(1, 115)):
        raise ValueError('Missing surah')
    # A derived storage round-trip must preserve all canonical strings/codepoints.
    if json.loads(json.dumps(rows, ensure_ascii=False)) != rows:
        raise ValueError('Canonical JSON round-trip failed')
    return [counts[n] for n in range(1, 115)]


def prepare(source_dir, output):
    entries = {e['id']: e for e in json.loads(LOCK.read_text())['sources']}
    archive = (source_dir / entries[ARCHIVE_ID]['file']).read_bytes()
    maghribi = (source_dir / entries[FONT_ID]['file']).read_bytes()
    verify(archive, entries[ARCHIVE_ID])
    verify(maghribi, entries[FONT_ID])
    with zipfile.ZipFile(io.BytesIO(archive)) as z:
        # Read only named members; never extract arbitrary archive paths.
        source_json = z.read(DATA + 'warshData_v2-1.json')
        source_csv = z.read(DATA + 'warshData_v2-1.csv')
        rows = json.loads(source_json)
        counts = validate_rows(rows, list(csv.DictReader(io.StringIO(source_csv.decode('utf-8-sig')))))
        font = z.read(FONT)
        readme = z.read(DATA + 'read.me')
    chars = Counter(''.join(r['aya_text'] for r in rows))
    chosen = {(1, 1), (1, 3), (2, 253), (2, 254), (112, 1)}
    # Include an actual source verse for each uncommon recitation/section mark.
    for cp in (0x06D2, 0x06DE, 0x06DF, 0x06E5, 0x06E6, 0x06E8, 0x06E9, 0x06EA):
        match = next((r for r in rows if chr(cp) in r['aya_text']), None)
        if match:
            chosen.add((match['sura_no'], match['aya_no']))
    samples = [{'ref': f"{r['sura_no']}:{r['aya_no']}", 'text': r['aya_text']}
               for r in rows if (r['sura_no'], r['aya_no']) in chosen]
    output.mkdir(parents=True, exist_ok=True)
    reports = []
    for key, filename, raw in [('WarshKfgqpc', 'warsh.ttf', font), ('WarshMaghribi', 'maghribi.otf', maghribi)]:
        cmap = font_cmap(raw)
        missing = sorted(ord(c) for c in chars if ord(c) not in cmap)
        reports.append({'family': key, 'file': filename, 'sha256': digest(raw), 'bytes': len(raw),
                        'names': font_names(raw), 'missingCodepoints': [f'U+{cp:04X}' for cp in missing],
                        'missingDistinct': len(missing), 'missingOccurrences': sum(chars[chr(cp)] for cp in missing),
                        'coverageOnlyNotShapingApproval': True})
        (output / filename).write_bytes(raw)
    payload = {'editionId': EDITION, 'sourceSha256': digest(archive), 'fonts': reports, 'samples': samples,
               'codepoints': sorted(ord(c) for c in chars), 'verses': [{'ref': f"{r['sura_no']}:{r['aya_no']}", 'text': r['aya_text']} for r in rows]}
    (output / 'font-probe.json').write_text(json.dumps(payload, ensure_ascii=False) + '\n', encoding='utf-8')
    (output / 'read.me').write_bytes(readme)
    # Do not copy the source corpus/fonts into Git or declare a ready catalog pack.
    return {'editionId': EDITION, 'status': 'draft', 'archive': entries[ARCHIVE_ID],
            'surahs': 114, 'verses': len(rows), 'perSurahCounts': counts, 'distinctCodepoints': len(chars),
            'canonicalJsonSha256': digest(source_json), 'canonicalCsvSha256': digest(source_csv),
            'mechanicalValidation': {'lockedSource': True, 'uniqueOrderedReferences': True,
                                     'jsonCsvExactAgreement': True, 'canonicalRoundTrip': True},
            'fontReports': reports, 'sampleReferences': [s['ref'] for s in samples],
            'qualifiedReview': 'pending', 'androidRendering': 'separate evidence',
            'notes': ['Retain source verse marker glyphs unchanged; Western numbers belong to separate UI badges.',
                      'U+FC00..U+FD1C are source-font verse markers, not portable Unicode verse numbers.',
                      'Cmap coverage cannot establish correct glyph meaning or mark positioning.']}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--work', type=Path, default=WORK)
    args = parser.parse_args()
    print(json.dumps(prepare(args.work / 'sources', args.work / 'warsh-probe'), ensure_ascii=False, indent=2))
