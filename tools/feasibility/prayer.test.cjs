const {test} = require('node:test');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const {calculate, nextCivilDate, nextPrayer} = require('./prayer.cjs');
const base = {
  date: '2026-10-18',
  latitude: 33.5731,
  longitude: -7.5898,
  timeZone: 'Africa/Casablanca',
  research: true,
};
test('unapproved Morocco profile cannot masquerade as production configuration', () => {
  assert.throws(() => calculate({...base, research: false}), /research-only/);
});
test('civil date and zone validation, including leap and year boundaries', () => {
  assert.equal(nextCivilDate('2024-02-28'), '2024-02-29');
  assert.equal(nextCivilDate('2026-12-31'), '2027-01-01');
  assert.throws(() => calculate({...base, date: '2026-02-29'}));
  assert.throws(() => calculate({...base, timeZone: 'invalid'}));
  assert.throws(() => calculate({...base, latitude: Infinity}));
});
test('UTC prayer instants do not depend on the developer/device time zone', () => {
  const path = require.resolve('./prayer.cjs');
  const results = [
    'UTC',
    'America/Los_Angeles',
    'Asia/Tokyo',
    'Africa/Casablanca',
  ].map(TZ =>
    execFileSync(process.execPath, [path, base.date], {
      env: {...process.env, TZ},
      encoding: 'utf8',
    }),
  );
  for (const result of results) assert.equal(result, results[0]);
});
test('Morocco Ramadan offsets come from IANA rules, not fixed UTC+1', () => {
  const offset = date =>
    new Intl.DateTimeFormat('en', {
      timeZone: 'Africa/Casablanca',
      timeZoneName: 'shortOffset',
    }).format(new Date(date));
  assert.match(offset('2026-01-15T12:00:00Z'), /GMT\+1/);
  assert.match(offset('2026-03-01T12:00:00Z'), /GMT(?:\+0)?$/);
  assert.match(offset('2026-04-15T12:00:00Z'), /GMT\+1/);
});
test('user adjustment applies exactly once and sunrise is not the next prayer', () => {
  const normal = calculate(base);
  const adjusted = calculate({...base, offsets: {fajr: 4}});
  assert.equal(
    Date.parse(adjusted.events[0].utc) - Date.parse(normal.events[0].utc),
    240000,
  );
  assert.equal(nextPrayer(base, normal.events[0].utc).name, 'dhuhr');
  assert.equal(nextPrayer(base, normal.events.at(-1).utc).name, 'fajr');
});
test('unresolvable polar times stay unavailable instead of midnight placeholders', () => {
  const result = calculate({...base, latitude: 89, date: '2026-06-21'});
  assert.ok(
    result.events.some(e => e.status === 'unavailable' && e.utc === null),
  );
});

test('runtime includes the Morocco September 2026 IANA transition', () => {
  assert.equal(
    require('./timezone.cjs').checkMoroccoTimeZoneData().supported,
    true,
  );
});
