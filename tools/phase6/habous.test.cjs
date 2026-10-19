require('../foundation/register.cjs');
const {test} = require('node:test'),
  assert = require('node:assert/strict');
const {parseHabous} = require('../../src/features/prayer/habous.ts');

function fixture() {
  return (
    '<h2>أكتوبر / نونبر 2026</h2><select><option value="index.php?ville=58" selected>الدار البيضاء</option></select><table id="horaire">' +
    Array.from(
      {length: 30},
      (_, i) =>
        '<tr>' +
        [
          'الأحد',
          String(i + 1),
          String(i < 19 ? i + 13 : i - 18),
          '05:12',
          '06:35',
          '12:18',
          '15:25',
          '17:50',
          '19:08',
        ]
          .map(c => '<td>' + c + '</td>')
          .join('') +
        '</tr>',
    ).join('') +
    '</table>'
  );
}
test('ministry parser rejects malformed first/last rows, gaps, wrong city and changed headers', () => {
  const html = fixture();
  assert.equal(Object.keys(parseHabous(html, '58').dates).length, 30);
  assert.throws(
    () => parseHabous(html.replace('05:12', '25:12'), '58'),
    /invalid_timetable_row/,
  );
  const end = html.lastIndexOf('05:12');
  assert.throws(
    () => parseHabous(html.slice(0, end) + '25:12' + html.slice(end + 5), '58'),
    /invalid_timetable_row/,
  );
  assert.throws(
    () => parseHabous(html.replace('<td>15</td>', '<td>16</td>'), '58'),
    /nonconsecutive/,
  );
  assert.throws(() => parseHabous(html, '1'), /wrong_city/);
  assert.throws(
    () => parseHabous(html.replace('أكتوبر', 'unknown'), '58'),
    /calendar_header/,
  );
});
