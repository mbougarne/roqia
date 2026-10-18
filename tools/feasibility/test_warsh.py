import copy
import unittest

from warsh import validate_rows


class WarshValidationTests(unittest.TestCase):
    def setUp(self):
        # Synthetic non-scripture fixtures; no downloaded corpus needed in CI.
        self.rows = []
        for surah in range(1, 115):
            for ayah in range(1, (6101 if surah == 1 else 1) + 1):
                self.rows.append({'id': len(self.rows) + 1, 'sura_no': surah, 'aya_no': ayah,
                                  'aya_text': 'fixture a\u0301\u00a0\ufc00'})
        self.csv = [{k: str(v) for k, v in row.items()} for row in self.rows]

    def test_exact_cross_format_strings_preserved(self):
        original = copy.deepcopy(self.rows)
        self.assertEqual(sum(validate_rows(self.rows, self.csv)), 6214)
        self.assertEqual(self.rows, original)

    def test_missing_duplicate_reordered_and_extra_records_rejected(self):
        for rows in [self.rows[:-1], [self.rows[1], self.rows[0], *self.rows[2:]],
                     [self.rows[0], self.rows[0], *self.rows[2:]], self.rows + [self.rows[-1]]]:
            with self.subTest(), self.assertRaises(ValueError):
                validate_rows(rows, [{k: str(v) for k, v in r.items()} for r in rows])

    def test_normalization_or_marker_replacement_disagreement_rejected(self):
        for changed in ['fixture á\u00a0\ufc00', 'fixture a\u0301 \ufc00', 'fixture a\u0301\u00a01']:
            csv_rows = copy.deepcopy(self.csv)
            csv_rows[0]['aya_text'] = changed
            with self.subTest(changed=changed), self.assertRaisesRegex(ValueError, 'disagree'):
                validate_rows(self.rows, csv_rows)

    def test_hafs_numbering_or_empty_text_cannot_be_silently_accepted(self):
        for field, value in [('aya_no', 2), ('sura_no', 115), ('aya_text', ''), ('id', 0)]:
            rows = copy.deepcopy(self.rows); rows[0][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                validate_rows(rows, [{k: str(v) for k, v in r.items()} for r in rows])


if __name__ == '__main__':
    unittest.main()
