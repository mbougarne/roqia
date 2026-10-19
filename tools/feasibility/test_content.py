import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location(
    'content', Path(__file__).with_name('content.py')
)
content = importlib.util.module_from_spec(spec)
spec.loader.exec_module(content)


class ContentTests(unittest.TestCase):
    def source(self):
        # Synthetic tokens, deliberately NOT Quran text.
        rows = [f'{i}|1|fixture-{i}' for i in range(1, 115)]
        return (
            '\n'.join(rows)
            + '\n\n# PLEASE DO NOT REMOVE OR CHANGE THIS COPYRIGHT BLOCK\n# Tanzil Quran Text (Uthmani, Version 1.1)\n'
        ).encode()

    def test_exact_round_trip_without_unicode_normalization(self):
        source = self.source().replace(b'fixture-1\n', 'a\u0301  \u0661\n'.encode(), 1)
        chapters, notice = content.parse_tanzil(source, [1] * 114)
        self.assertEqual(chapters[0]['verses'][0]['text'], 'a\u0301  \u0661')
        self.assertIn('COPYRIGHT BLOCK', notice)

    def test_missing_duplicate_out_of_order_or_extra_verses_rejected(self):
        source = self.source()
        for changed in [
            source.replace(b'2|1|fixture-2\n', b''),
            source.replace(b'2|1|', b'1|1|'),
            source.replace(b'2|1|', b'3|1|'),
            b'1|0|extra\n' + source,
        ]:
            with self.subTest(changed=changed[:20]), self.assertRaises(ValueError):
                content.parse_tanzil(changed, [1] * 114)

    def test_source_notice_and_edition_cannot_disappear(self):
        with self.assertRaises(ValueError):
            content.parse_tanzil(self.source().split(b'# PLEASE')[0], [1] * 114)
        with self.assertRaises(ValueError):
            content.parse_tanzil(self.source().replace(b'1.1', b'2.0'), [1] * 114)

    def test_digest_detects_one_byte_change(self):
        entry = {'id': 'fixture', 'bytes': 3, 'sha256': content.digest(b'abc')}
        content.verify(b'abc', entry)
        with self.assertRaises(ValueError):
            content.verify(b'abd', entry)

    def test_paths_and_urls(self):
        for bad in [
            '../secret',
            '/absolute',
            'a/../b',
            'a//b',
            'a\\b',
            'a/./b',
            'a/%2e%2e/b',
        ]:
            self.assertFalse(content.safe_path(bad), bad)
        self.assertTrue(content.safe_path('chapters/001.json'))
        for bad in [
            'http://host/file',
            'https://user:password@host/file',
            'https://',
            'file:///tmp/a',
        ]:
            self.assertFalse(content.https_url(bad))

    def test_recordings_keep_riwaya_and_partial_availability(self):
        source = {
            'reciters': [
                {
                    'id': 10,
                    'name': 'Fixture',
                    'moshaf': [
                        {
                            'id': 20,
                            'name': 'Fixture recording',
                            'rewaya_id': 2,
                            'surah_list': '1,114',
                            'surah_total': 2,
                            'server': 'https://cdn.mp3quran.net/fixture/',
                        }
                    ],
                }
            ]
        }
        result = content.recording_catalog(source, 2, [20])[0]
        self.assertEqual(result['id'], 'mp3quran.10.20')
        self.assertEqual(result['providerDeclaredSurahs'], [1, 114])
        self.assertIsNone(result['tariq'])
        self.assertEqual(
            result['files'][1]['url'], 'https://cdn.mp3quran.net/fixture/114.mp3'
        )
        with self.assertRaises(ValueError):
            content.recording_catalog(source, 1, [20])
        source['reciters'][0]['moshaf'][0]['surah_list'] = '1,1'
        with self.assertRaises(ValueError):
            content.recording_catalog(source, 2, [20])

    def test_missing_recording_rejected(self):
        with self.assertRaises(ValueError):
            content.recording_catalog({'reciters': []}, 2, [20])

    def test_pending_or_stale_review_cannot_publish(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp)
            (p / 'file.json').write_bytes(b'{}')
            manifest = {
                'id': 'fixture',
                'assets': [
                    {
                        'relativePath': 'file.json',
                        'bytes': 2,
                        'sha256': content.digest(b'{}'),
                    }
                ],
            }
            (p / 'manifest.json').write_text(json.dumps(manifest))
            with self.assertRaises(ValueError):
                content.publish_catalog(p, 'https://example.org/', {})
            review = {
                'manifestSha256': content.digest((p / 'manifest.json').read_bytes()),
                'reviewer': 'fixture',
                'reviewedAt': '2026-10-18',
            }
            with self.assertRaises(ValueError):
                content.publish_catalog(p, 'https://example.org/', review)
            (p / 'file.json').write_bytes(b'{x')
            with self.assertRaises(ValueError):
                content.validate_pack_files(p)

    def test_symlink_is_not_a_pack_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp)
            (p / 'real.json').write_bytes(b'{}')
            (p / 'link.json').symlink_to(p / 'real.json')
            (p / 'manifest.json').write_text(
                json.dumps(
                    {
                        'assets': [
                            {
                                'relativePath': 'link.json',
                                'bytes': 2,
                                'sha256': content.digest(b'{}'),
                            }
                        ]
                    }
                )
            )
            with self.assertRaises(ValueError):
                content.validate_pack_files(p)

    def test_rehashing_an_edited_chapter_does_not_bypass_canonical_validation(self):
        # Synthetic fixture content, not Quran text or an approved source pack.
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp)
            source = p / 'source'
            source.mkdir()
            raw = self.source()
            metadata = (
                '<quran type="metadata"><suras>'
                + ''.join(f'<sura index="{i}" ayas="1" />' for i in range(1, 115))
                + '</suras></quran>'
            ).encode()
            entries = []
            for id, file, data in [
                ('tanzil-uthmani-1.1', 'text.txt', raw),
                ('tanzil-metadata-1.0', 'metadata.xml', metadata),
            ]:
                (source / file).write_bytes(data)
                entries.append(
                    {
                        'id': id,
                        'file': file,
                        'bytes': len(data),
                        'sha256': content.digest(data),
                    }
                )
            lock = p / 'lock.json'
            lock.write_text(json.dumps({'sources': entries}))
            pack = p / 'pack'
            with patch.object(content, 'LOCK', lock):
                content.package_hafs(source, pack, entries)
                content.validate_pack_files(pack)
                chapter = pack / 'chapters/001.json'
                changed = json.loads(chapter.read_text())
                changed['verses'][0]['text'] = 'tampered-fixture'
                chapter.write_text(json.dumps(changed))
                manifest = json.loads((pack / 'manifest.json').read_text())
                asset = next(
                    a
                    for a in manifest['assets']
                    if a['relativePath'] == 'chapters/001.json'
                )
                asset.update(
                    bytes=chapter.stat().st_size,
                    sha256=content.digest(chapter.read_bytes()),
                )
                (pack / 'manifest.json').write_text(json.dumps(manifest))
                with self.assertRaisesRegex(
                    ValueError, 'differs from locked canonical source'
                ):
                    content.validate_pack_files(pack)


if __name__ == '__main__':
    unittest.main()
