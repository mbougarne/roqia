// IANA tzdb 2026c: Morocco moved to UTC on 2026-09-20. Older Android ICU data can disagree.
// https://data.iana.org/time-zones/tzdb-2026c/NEWS
const fixtures = [
  ['2026-01-15T12:00:00Z', '13:00'],
  ['2026-03-01T12:00:00Z', '12:00'],
  ['2026-04-15T12:00:00Z', '13:00'],
  ['2026-09-19T12:00:00Z', '13:00'],
  ['2026-09-20T12:00:00Z', '12:00'],
  ['2026-10-18T12:00:00Z', '12:00'],
];

function checkMoroccoTimeZoneData() {
  const formatter = new Intl.DateTimeFormat('en-GB-u-nu-latn', {
    timeZone: 'Africa/Casablanca',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const checks = fixtures.map(([utc, expected]) => ({
    utc,
    expected,
    actual: formatter.format(new Date(utc)),
  }));
  return {supported: checks.every(c => c.expected === c.actual), checks};
}
module.exports = {checkMoroccoTimeZoneData};
