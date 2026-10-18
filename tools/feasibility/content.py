#!/usr/bin/env python3
"""Maintainer-only acquisition/validation. Never imported by the mobile app."""
import argparse
import hashlib
import json
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urlparse
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
LOCK = Path(__file__).with_name('sources.lock.json')
WORK = ROOT / '.roqia-feasibility'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def verify(data, entry):
    if len(data) != entry['bytes'] or digest(data) != entry['sha256']:
        raise ValueError(f"Source changed or corrupt: {entry['id']}; review a new version, do not overwrite the lock")


def safe_path(value):
    return bool(re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]*(/[A-Za-z0-9][A-Za-z0-9_.-]*)*', value)) and all(p not in ('.', '..') for p in value.split('/'))


def https_url(value):
    u = urlparse(value)
    return u.scheme == 'https' and bool(u.hostname) and not u.username and not u.password and not u.fragment


def acquire(entries, destination):
    destination.mkdir(parents=True, exist_ok=True)
    for entry in entries:
        if not safe_path(entry['file']) or not https_url(entry['url']):
            raise ValueError('Unsafe acquisition entry')
        target = destination / entry['file']
        if target.exists():
            verify(target.read_bytes(), entry)
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=target.parent) as tmp:
            staged = Path(tmp) / 'download'
            # curl uses the system certificate store; never disable TLS verification.
            subprocess.run(['curl', '--fail', '--silent', '--show-error', '--location',
                            '--proto', '=https', '--proto-redir', '=https', '--max-time', '90',
                            '--max-filesize', str(entry['bytes']), entry['url'], '-o', str(staged)], check=True)
            verify(staged.read_bytes(), entry)
            staged.replace(target)


def metadata_counts(raw):
    if b'<!DOCTYPE' in raw or b'<!ENTITY' in raw:
        raise ValueError('Unexpected XML declaration')
    root = ET.fromstring(raw)
    if root.tag != 'quran' or root.get('type') != 'metadata':
        raise ValueError('Not Quran metadata')
    rows = root.findall('./suras/sura')
    if len(rows) != 114:
        raise ValueError('Expected 114 source surahs')
    counts = []
    for index, row in enumerate(rows, 1):
        if int(row.get('index', '0')) != index:
            raise ValueError('Missing, reordered or duplicate surah')
        count = int(row.get('ayas', '0'))
        if count < 1:
            raise ValueError('Invalid source verse count')
        counts.append(count)
    return counts


def parse_tanzil(raw, counts):
    text = raw.decode('utf-8', errors='strict')
    marker = '# PLEASE DO NOT REMOVE OR CHANGE THIS COPYRIGHT BLOCK'
    if text.count(marker) != 1 or len(counts) != 114:
        raise ValueError('Missing source notice or edition metadata')
    corpus, notice = text.split(marker, 1)
    notice = marker + notice
    if 'Tanzil Quran Text (Uthmani, Version 1.1)' not in notice:
        raise ValueError('Unexpected source edition/version')
    # Keep content characters and the notice unchanged. Only remove line delimiters.
    records = [line for line in corpus.splitlines() if line]
    chapters, cursor = [], 0
    for surah, count in enumerate(counts, 1):
        verses = []
        for verse in range(1, count + 1):
            if cursor >= len(records):
                raise ValueError('Truncated Quran source')
            fields = records[cursor].split('|', 2)
            if len(fields) != 3 or fields[:2] != [str(surah), str(verse)] or not fields[2]:
                raise ValueError(f'Missing/reordered/duplicate verse at {surah}:{verse}')
            verses.append({'number': verse, 'text': fields[2]})
            cursor += 1
        chapters.append({'surah': surah, 'verses': verses})
    if cursor != len(records):
        raise ValueError('Unexpected extra source records')
    reconstructed = [f"{c['surah']}|{v['number']}|{v['text']}" for c in chapters for v in c['verses']]
    if reconstructed != records:
        raise ValueError('Canonical text round-trip failed')
    # No source basmala splitting, Unicode normalization, digit replacement or font inference.
    return chapters, notice


def package_hafs(source_dir, output, entries):
    by_id = {e['id']: e for e in entries}
    text_entry, meta_entry = by_id['tanzil-uthmani-1.1'], by_id['tanzil-metadata-1.0']
    raw = (source_dir / text_entry['file']).read_bytes()
    meta = (source_dir / meta_entry['file']).read_bytes()
    verify(raw, text_entry)
    verify(meta, meta_entry)
    counts = metadata_counts(meta)
    chapters, notice = parse_tanzil(raw, counts)
    if output.exists():
        raise ValueError('Output exists; use a new version/directory instead of modifying an installed pack')
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=output.parent) as tmp:
        staged = Path(tmp) / 'pack'
        (staged / 'chapters').mkdir(parents=True)
        (staged / 'original.txt').write_bytes(raw)
        (staged / 'quran-data.xml').write_bytes(meta)
        (staged / 'NOTICE.txt').write_text(notice, encoding='utf-8')
        for chapter in chapters:
            chapter.update({'editionId': 'hafs-tanzil-uthmani-1.1', 'numberingScheme': 'tanzil-madina-hafs', 'sourceNotice': notice})
            (staged / 'chapters' / f"{chapter['surah']:03}.json").write_text(json.dumps(chapter, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        assets = []
        for file in sorted(p for p in staged.rglob('*') if p.is_file()):
            data = file.read_bytes()
            assets.append({'relativePath': file.relative_to(staged).as_posix(), 'bytes': len(data), 'sha256': digest(data)})
        manifest = {'schemaVersion': 1, 'id': 'hafs-tanzil-uthmani-1.1', 'status': 'draft',
                    'riwaya': 'hafs', 'numberingScheme': 'tanzil-madina-hafs', 'version': '1.1',
                    'source': text_entry, 'metadataSource': meta_entry, 'surahs': 114, 'verses': sum(counts),
                    'mechanicalValidation': {'sourceHashes': True, 'structure': True, 'canonicalRoundTrip': True},
                    'editorialReview': 'pending', 'fontRenderingReview': 'pending', 'assets': assets}
        (staged / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
        staged.replace(output)
    return manifest


def recording_catalog(snapshot, riwaya_id, selected_ids):
    names = {1: 'hafs', 2: 'warsh', 18: 'warsh'}
    if riwaya_id not in names:
        raise ValueError('Riwaya requires explicit mapping')
    result, seen = [], set()
    for reciter in snapshot['reciters']:
        for recording in reciter['moshaf']:
            if recording['id'] not in selected_ids:
                continue
            if recording['id'] in seen or recording.get('rewaya_id') != riwaya_id:
                raise ValueError('Duplicate recording or riwaya mismatch')
            seen.add(recording['id'])
            raw_surahs = recording['surah_list'].split(',')
            if not all(re.fullmatch(r'[1-9][0-9]*', n) for n in raw_surahs):
                raise ValueError('Malformed chapter list')
            surahs = [int(n) for n in raw_surahs]
            if len(set(surahs)) != len(surahs) or len(surahs) != recording['surah_total'] or any(n < 1 or n > 114 for n in surahs):
                raise ValueError('Recording chapter inventory mismatch')
            base = recording['server']
            if not https_url(base) or not urlparse(base).hostname.endswith('.mp3quran.net') or not base.endswith('/'):
                raise ValueError('Unapproved audio host')
            result.append({'id': f"mp3quran.{reciter['id']}.{recording['id']}", 'reciterId': reciter['id'],
                           'recordingSetId': recording['id'], 'reciterName': reciter['name'], 'sourceLabel': recording['name'],
                           'providerRiwayaId': riwaya_id, 'riwaya': names[riwaya_id],
                           'tariq': 'al-azraq' if riwaya_id == 18 else None,
                           'status': 'draft', 'qualityVariants': [], 'timingData': None,
                           'providerDeclaredSurahs': surahs,
                           'files': [{'surah': n, 'url': f'{base}{n:03}.mp3', 'verification': 'pending'} for n in surahs]})
    if seen != set(selected_ids):
        raise ValueError('Selected recording missing from snapshot')
    return result


def validate_pack_files(pack_dir):
    pack_dir = pack_dir.resolve()
    manifest = json.loads((pack_dir / 'manifest.json').read_text())
    seen = set()
    for asset in manifest['assets']:
        relative = asset['relativePath']
        if not safe_path(relative) or relative in seen:
            raise ValueError('Unsafe/duplicate pack path')
        seen.add(relative)
        path = pack_dir / relative
        if path.is_symlink() or any(parent.is_symlink() for parent in path.parents if parent.is_relative_to(pack_dir)):
            raise ValueError('Symlinks are not content assets')
        if not path.resolve().is_relative_to(pack_dir.resolve()):
            raise ValueError('Path escapes pack')
        verify(path.read_bytes(), {'id': relative, **asset})
    if manifest.get('id') == 'hafs-tanzil-uthmani-1.1':
        # Hashes alone are insufficient if someone edits both a chapter and its manifest.
        # Revalidate the original against the independent source lock and compare every record.
        entries = {e['id']: e for e in json.loads(LOCK.read_text())['sources']}
        raw = (pack_dir / 'original.txt').read_bytes()
        meta = (pack_dir / 'quran-data.xml').read_bytes()
        verify(raw, entries['tanzil-uthmani-1.1'])
        verify(meta, entries['tanzil-metadata-1.0'])
        chapters, notice = parse_tanzil(raw, metadata_counts(meta))
        expected_paths = {'original.txt', 'quran-data.xml', 'NOTICE.txt'}
        for chapter in chapters:
            relative = f"chapters/{chapter['surah']:03}.json"
            expected_paths.add(relative)
            chapter.update({'editionId': manifest['id'], 'numberingScheme': 'tanzil-madina-hafs', 'sourceNotice': notice})
            if json.loads((pack_dir / relative).read_text()) != chapter:
                raise ValueError('Pack chapter differs from locked canonical source')
        if seen != expected_paths or (pack_dir / 'NOTICE.txt').read_text() != notice:
            raise ValueError('Incomplete pack or altered notice')
    return manifest


def publish_catalog(pack_dir, base_url, review):
    manifest = validate_pack_files(pack_dir)
    # A review is bound to the exact manifest. A changed asset/version invalidates it.
    expected = digest((pack_dir / 'manifest.json').read_bytes())
    if review.get('manifestSha256') != expected or not review.get('reviewer') or not review.get('reviewedAt'):
        raise ValueError('Missing review for this exact pack version')
    if not all(review.get(k) is True for k in ('sourceApproved', 'religiousTextReviewed', 'fontRenderingReviewed', 'offlineRenderVerified')):
        raise ValueError('Pending content/render review; pack cannot become installable')
    if not https_url(base_url) or not base_url.endswith('/'):
        raise ValueError('A real HTTPS static content base is required')
    assets = []
    for index, asset in enumerate(manifest['assets']):
        suffix = Path(asset['relativePath']).suffix
        assets.append({'id': f'asset-{index:03}', **asset, 'url': base_url + asset['relativePath'],
                       'mediaType': {'.txt': 'text/plain', '.xml': 'application/xml', '.json': 'application/json'}[suffix]})
    return {'schemaVersion': 1, 'catalogVersion': manifest['version'], 'packs': [{
        'id': manifest['id'], 'kind': 'quran', 'status': 'ready', 'version': manifest['version'],
        'source': {'provider': 'Tanzil', 'pageUrl': 'https://tanzil.net/download/', 'artifactUrl': manifest['source']['url'],
                   'attribution': 'Tanzil Project — https://tanzil.net', 'retrievedAt': manifest['source']['retrievedAt']},
        'riwaya': 'hafs', 'tariq': None, 'numberingScheme': manifest['numberingScheme'], 'language': 'ar',
        'compatibleEditionIds': [], 'capabilities': {'reflow': True, 'verseSearch': True, 'verseBookmarks': True,
            'pageView': False, 'translations': False, 'timedAudio': False}, 'assets': assets,
        'validationReport': f"review:{expected}"}]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['acquire', 'package-hafs', 'validate', 'catalog'])
    parser.add_argument('--work', type=Path, default=WORK)
    parser.add_argument('--pack', type=Path)
    parser.add_argument('--review', type=Path)
    parser.add_argument('--base-url')
    args = parser.parse_args()
    entries = json.loads(LOCK.read_text())['sources']
    pack = args.pack or args.work / 'packs' / 'hafs-tanzil-uthmani-1.1'
    if args.command == 'acquire':
        acquire(entries, args.work / 'sources')
        print(f'Verified {len(entries)} source artifacts.')
    elif args.command == 'package-hafs':
        result = package_hafs(args.work / 'sources', pack, entries)
        print(json.dumps({k: result[k] for k in ('id', 'status', 'surahs', 'verses')}))
    elif args.command == 'validate':
        print(json.dumps({'id': validate_pack_files(pack)['id'], 'integrity': 'passed'}))
    else:
        if not args.review or not args.base_url:
            parser.error('catalog requires --review and --base-url; review must match the exact manifest')
        result = publish_catalog(pack, args.base_url, json.loads(args.review.read_text()))
        print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
