require('../foundation/register.cjs');
const {test} = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs');
const d = require('../../src/features/prayer/domain.ts'),
  t = require('../../src/features/prayer/time.ts');
const tables = require('../../src/features/prayer/timetables.json'),
  cities = require('../../src/features/prayer/cities.json');
const p = () => ({...d.defaults(), location: cities[0]});
test('bundled IANA rules handle Morocco Ramadan and September change independently of host ICU', () => {
  for (const [utc, expected] of [
    ['2026-01-15T12:00:00Z', '13:00'],
    ['2026-03-01T12:00:00Z', '12:00'],
    ['2026-04-15T12:00:00Z', '13:00'],
    ['2026-09-19T12:00:00Z', '13:00'],
    ['2026-09-20T12:00:00Z', '12:00'],
  ])
    assert.equal(t.clock('Africa/Casablanca', Date.parse(utc)), expected);
  assert.equal(
    t.civilDate('America/New_York', Date.parse('2026-01-01T01:00:00Z')),
    '2025-12-31',
  );
  assert.equal(t.nextDate('2024-02-28'), '2024-02-29');
  assert.equal(t.nextDate('2026-12-31'), '2027-01-01');
  assert.throws(
    () => t.localInstant('America/New_York', '2026-03-08', '02:30'),
    /ambiguous/,
  );
  assert.throws(
    () => t.localInstant('America/New_York', '2026-11-01', '01:30'),
    /ambiguous/,
  );
  assert.throws(
    () => t.clock('Africa/Casablanca', Date.parse('2031-01-01T00:00:00Z')),
    /timezone/,
  );
});
test('all 360 official source days have ordered instants; source expiry never silently switches method', () => {
  assert.equal(tables.length, 12);
  let count = 0;
  for (const table of tables)
    for (const date of Object.keys(table.dates)) {
      const prefs = {
          ...p(),
          location: cities.find(c => c.cityId === table.cityId),
        },
        schedule = d.day(prefs, date, table);
      assert.equal(schedule.rows.length, 6);
      assert.deepEqual(
        schedule.rows.map(r => t.clock('Africa/Casablanca', r.at)),
        table.dates[date],
      );
      count++;
    }
  assert.equal(count, 360);
  assert.throws(
    () => d.day(p(), '2027-01-01', tables[0]),
    /timetable_unavailable/,
  );
  assert.throws(
    () => d.day(p(), '2026-10-18', tables[1]),
    /timetable_unavailable/,
  );
  const adjusted = {...p(), offsets: {...p().offsets, dhuhr: 2}};
  const row = d.day(adjusted, '2026-10-18', tables[0]).rows[2];
  assert.equal(row.at - row.raw, 120000);
});
test('calculation uses selected location civil date; polar undefined results fail closed', () => {
  const prefs = {...p(), method: 'MuslimWorldLeague'};
  for (const method of [
    'MuslimWorldLeague',
    'Egyptian',
    'UmmAlQura',
    'NorthAmerica',
  ])
    assert.equal(d.day({...prefs, method}, '2026-10-18').rows.length, 6);
  assert.throws(
    () =>
      d.day(
        {
          ...prefs,
          location: {
            ...prefs.location,
            cityId: null,
            source: 'manual',
            latitude: 89,
            longitude: 0,
            zone: 'Etc/UTC',
          },
        },
        '2026-06-21',
      ),
    /undefined_prayer_times/,
  );
});
test('location and preference validation reject silent city remapping, invalid zones and excessive offsets', () => {
  for (const patch of [
    {latitude: 91},
    {longitude: 181},
    {latitude: NaN},
    {zone: 'fake/zone'},
    {latitude: 30},
    {source: 'gps'},
  ])
    assert.throws(() => d.validateLocation({...cities[0], ...patch}));
  assert.throws(() =>
    d.validatePreferences({...p(), offsets: {...p().offsets, fajr: 31}}),
  );
  assert.throws(() =>
    d.validatePreferences({
      ...p(),
      modes: {...p().modes, sunrise: 'notification'},
    }),
  );
});
test('Qibla uses true-north great-circle bearing and circular smoothing across zero', () => {
  assert.ok(
    Math.abs(d.bearing({latitude: 33.5731, longitude: -7.5898}) - 93.7) < 0.5,
  );
  assert.ok(d.smoothHeading(359, 1) > 359);
  assert.ok(d.smoothHeading(1, 359) < 1);
  for (const longitude of [-179.99, 179.99])
    assert.ok(Number.isFinite(d.bearing({latitude: 20, longitude})));
  assert.throws(
    () => d.bearing({latitude: 21.4225241, longitude: 39.8261818}),
    /at_kaaba/,
  );
});
test('bounded notification window reserves daily-reminder capacity, excludes sunrise/past and uses generations', () => {
  const prefs = {
    ...p(),
    modes: Object.fromEntries(d.prayers.map(n => [n, 'notification'])),
    preMinutes: 10,
  };
  const now = Date.parse('2026-10-18T20:00:00Z');
  const a = d.notificationPlan(prefs, now, tables, 21);
  assert.ok(a.plan.length <= 27);
  assert.ok(a.plan.every(e => e.at > now && !e.id.includes('sunrise')));
  assert.equal(new Set(a.plan.map(e => e.id)).size, a.plan.length);
  assert.equal(a.plan[0].name, 'fajr');
  assert.ok(a.plan[0].id.includes('2026-10-19'));
  assert.equal(d.notificationPlan(prefs, now, tables, 48).plan.length, 0);
  assert.equal(d.notificationPlan(p(), now, tables, 0).plan.length, 0);
  const b = d.notificationPlan({...prefs, revision: 1}, now, tables, 0);
  assert.ok(!a.plan.some(e => b.plan.some(x => x.id === e.id)));
  assert.equal(
    d.notificationPlan(prefs, Date.parse('2026-12-01T00:00:00Z'), tables, 0)
      .plan.length,
    0,
  );
});
