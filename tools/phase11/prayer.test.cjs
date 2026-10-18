require('../foundation/register.cjs');
const {test} = require('node:test'),
  assert = require('node:assert/strict');
const d = require('../../src/features/prayer/domain.ts'),
  t = require('../../src/features/prayer/time.ts');
const cities = require('../../src/features/prayer/cities.json'),
  tables = require('../../src/features/prayer/timetables.json');
const p = () => ({
  ...d.defaults(),
  location: cities[0],
  modes: Object.fromEntries(d.prayers.map(n => [n, 'full'])),
});
test('rolling plan advances beyond original three-day horizon with no expired/duplicate/sunrise events', () => {
  const first = d.notificationPlan(
    p(),
    Date.parse('2026-10-18T12:00:00Z'),
    tables,
    0,
  );
  const later = d.notificationPlan(
    p(),
    Date.parse('2026-10-22T12:00:00Z'),
    tables,
    0,
  );
  assert.ok(later.coveredUntil > first.coveredUntil);
  assert.ok(later.plan.length > 0);
  assert.ok(
    later.plan.every(
      e =>
        e.at > Date.parse('2026-10-22T12:00:00Z') && !e.id.includes('sunrise'),
    ),
  );
  assert.equal(new Set(later.plan.map(e => e.id)).size, later.plan.length);
});
test('official expiry shortens coverage then produces no alarms and no formula fallback', () => {
  const table = tables.find(x => x.cityId === p().location.cityId),
    last = Object.keys(table.dates).sort().at(-1);
  const now = t.localInstant(p().location.zone, last, '12:00');
  const lastPlan = d.notificationPlan(p(), now, tables, 0);
  assert.equal(
    lastPlan.coveredUntil,
    t.localInstant(p().location.zone, t.nextDate(last), '00:00'),
  );
  const expired = d.notificationPlan(p(), lastPlan.coveredUntil, tables, 0);
  assert.equal(expired.plan.length, 0);
  assert.equal(expired.coveredUntil, lastPlan.coveredUntil);
});
test('seasonal named-method plans apply adjustments once, use selected timezone and invalidate old IDs', () => {
  for (const date of [
    '2026-01-15',
    '2026-03-01',
    '2026-06-21',
    '2026-09-20',
    '2026-12-31',
  ]) {
    const prefs = {
      ...p(),
      method: 'MuslimWorldLeague',
      offsets: {...p().offsets, dhuhr: 7},
    };
    const schedule = d.day(prefs, date);
    assert.equal(schedule.rows[2].at - schedule.rows[2].raw, 420000);
    const now = t.localInstant(prefs.location.zone, date, '00:00');
    const a = d.notificationPlan(prefs, now, [], 0),
      b = d.notificationPlan({...prefs, revision: 99}, now, [], 0);
    assert.ok(a.plan.length);
    assert.ok(b.plan.every(e => !a.plan.some(x => x.id === e.id)));
    assert.equal(t.civilDate(prefs.location.zone, a.plan[0].at), date);
  }
});
test('prayer after Isha rolls to next-day Fajr; exact event boundary is never replayed', () => {
  const prefs = p(),
    date = '2026-10-18',
    schedule = d.day(
      prefs,
      date,
      tables.find(t => t.cityId === prefs.location.cityId),
    );
  const now = schedule.rows.at(-1).at;
  const {plan} = d.notificationPlan(prefs, now, tables, 0);
  assert.equal(plan[0].name, 'fajr');
  assert.ok(plan[0].id.includes('2026-10-19'));
  assert.ok(plan.every(e => e.at > now));
});
