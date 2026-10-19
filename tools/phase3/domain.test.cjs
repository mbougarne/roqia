require('../foundation/register.cjs');
const {test} = require('node:test'),
  assert = require('node:assert/strict');
const {
  reminderDefaults,
  reminderPlan,
  validateReminders,
  isOwnedReminder,
} = require('../../src/features/settings/reminders/plan.ts');
const {
  matches,
  searchKey,
} = require('../../src/features/devotional/discovery.ts');
const {contentItems} = require('../../src/repositories/content.ts');

test('fresh reminders are off; legacy times and identities are retained', () => {
  assert.deepEqual(reminderPlan(reminderDefaults), []);
  assert.deepEqual(
    reminderDefaults.map(r => r.localTimeHHmm),
    ['06:00', '18:00', '22:30'],
  );
  assert.equal(isOwnedReminder('adhkar-night-1800'), true);
  assert.equal(isOwnedReminder('other-feature-notification'), false);
});
test('weekday schedule skips past times, preserves local wall time and isolates IDs', () => {
  const now = new Date(2026, 9, 18, 7, 30); // Sunday, local time
  const rows = reminderDefaults.map(r => ({
    ...r,
    enabled: true,
    weekdays: [0, 2, 5],
  }));
  const plan = reminderPlan(rows, now);
  assert.equal(plan.length, 9);
  assert.equal(new Set(plan.map(p => p.id)).size, 9);
  const morningSunday = plan.find(p => p.id.endsWith('0600:0'));
  const next = new Date(morningSunday.timestamp);
  assert.equal(next.getDate(), 25);
  assert.equal(next.getHours(), 6);
  for (const entry of plan) {
    assert.ok(entry.timestamp > now.getTime());
    assert.ok([0, 2, 5].includes(new Date(entry.timestamp).getDay()));
  }
  assert.equal(
    reminderPlan(
      rows.map(r => ({...r, enabled: false})),
      now,
    ).length,
    0,
  );
});
test('invalid times, duplicate IDs and empty weekdays cannot reach native scheduling', () => {
  for (const patch of [
    {localTimeHHmm: '24:00'},
    {localTimeHHmm: '٠٦:٠٠'},
    {weekdays: []},
    {weekdays: [1, 1]},
    {weekdays: [7]},
    {category: 'unknown'},
    {soundId: 'remote'},
  ])
    assert.throws(() =>
      validateReminders(
        reminderDefaults.map((r, i) => (i ? r : {...r, ...patch})),
      ),
    );
  assert.throws(() =>
    validateReminders([
      reminderDefaults[0],
      reminderDefaults[0],
      reminderDefaults[2],
    ]),
  );
});
test('search normalization leaves canonical text and stable IDs unchanged', () => {
  const before = JSON.stringify(contentItems);
  const item = {id: 'devotional.adhkar.0001', content: 'أَذْكَارُ الصَّبَاحِ'};
  assert.ok(matches(item, 'اذكار الصباح', 'adhkar'));
  assert.equal(matches(item, 'اذكار', 'dua'), false);
  assert.equal(searchKey('  أَسْتَغْفِرُ  '), 'استغفر');
  for (const i of contentItems) {
    matches(i, 'الله', 'all');
    assert.ok(i.id.startsWith('devotional.'));
  }
  assert.equal(JSON.stringify(contentItems), before);
});
test('starting on a DST gap day does not move a later weekday to the wrong hour', () => {
  const original = process.env.TZ;
  try {
    process.env.TZ = 'Europe/Paris';
    const rows = reminderDefaults.map(r => ({
      ...r,
      enabled: true,
      localTimeHHmm: '02:30',
      weekdays: [2],
    }));
    const plan = reminderPlan(rows, new Date(2026, 2, 29, 12, 0));
    for (const entry of plan) {
      const next = new Date(entry.timestamp);
      assert.equal(next.getDay(), 2);
      assert.equal(next.getHours(), 2);
      assert.equal(next.getMinutes(), 30);
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});
