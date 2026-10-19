require('./register.cjs');
const {test} = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  crypto = require('node:crypto');
const {prepareMigration} = require('../../src/repositories/migration.ts');
const {
  contentItems,
  defaultCounts,
} = require('../../src/repositories/content.ts');
const aliases = require('../../src/repositories/legacy-counter-map.json');
const {devotionalQueue} = require('../../src/features/audio/queue.ts');
const {resolveLink} = require('../../src/navigation/routes.ts');
const {
  number,
  time,
  bytes,
  arabicPlural,
} = require('../../src/design/format.ts');

const raw = counts => ({
  '@roqia/app-state': JSON.stringify({mode: 'dark', repeatCounts: counts}),
  '@roqia/walkthrough-seen': '1',
  '@roqia/intro-note-seen': '1',
});
test('stable IDs are unique and original religious text, defaults and audio are unchanged', () => {
  const baseline = require('./canonical-content.json');
  assert.equal(new Set(contentItems.map(i => i.id)).size, baseline.count);
  assert.equal(
    crypto
      .createHash('sha256')
      .update(JSON.stringify(contentItems.map(({id: _id, ...item}) => item)))
      .digest('hex'),
    baseline.sha256,
    'Original religious fields/defaults/audio changed from the reviewed baseline',
  );
});
test('migration preserves mode, education, legacy times and all alias identities', () => {
  for (const [key, id] of Object.entries(aliases)) {
    const migrated = prepareMigration(raw({[key]: 0}));
    assert.equal(migrated.counts[id], 0);
    assert.equal(migrated.unmappedCount, 0);
  }
  const migrated = prepareMigration(raw({}));
  assert.equal(migrated.settings.themePreference, 'dark');
  assert.equal(migrated.settings.onboardingVersion, 1);
  assert.equal(migrated.settings.guidanceSeen, true);
  assert.deepEqual(
    migrated.reminders.map(r => r.localTimeHHmm),
    ['06:00', '18:00', '22:30'],
  );
  const fresh = prepareMigration({});
  assert.equal(fresh.settings.themePreference, 'system');
  assert.ok(fresh.reminders.every(r => !r.enabled));
});
test('invalid counters are bounded and alias conflicts preserve furthest progress', () => {
  const entries = Object.entries(aliases),
    id = entries[0][1],
    same = entries.filter(e => e[1] === id);
  assert.equal(
    prepareMigration(raw({[same[0][0]]: 1000})).counts[id],
    defaultCounts()[id],
  );
  assert.equal(prepareMigration(raw({[same[0][0]]: -1})).counts[id], 0);
  assert.equal(
    prepareMigration(raw({[same[0][0]]: null})).counts[id],
    defaultCounts()[id],
  );
  assert.equal(
    prepareMigration(raw({[same[0][0]]: 2, [same[1][0]]: 1})).counts[id],
    1,
  );
  assert.equal(prepareMigration(raw({unknown: 1})).unmappedCount, 1);
  assert.throws(() => prepareMigration({'@roqia/app-state': '{broken'}));
});
test('migration is deterministic apart from timestamps and does not mutate raw data', () => {
  const input = raw({[Object.keys(aliases)[0]]: 1}),
    before = structuredClone(input);
  const first = prepareMigration(input),
    second = prepareMigration(input);
  assert.deepEqual(first.counts, second.counts);
  assert.deepEqual(input, before);
});
test('all original recordings, arrays and repetitions are available to the shared player', () => {
  const queue = devotionalQueue(contentItems);
  const originals = contentItems.flatMap(i =>
    [i.audioFile, ...(i.audioArray ?? []).map(a => a.fileName)].filter(Boolean),
  );
  assert.deepEqual(new Set(queue.map(t => t.audioFile)), new Set(originals));
  for (const item of contentItems) {
    const q = devotionalQueue([item]);
    assert.equal(
      q.length,
      (item.audioArray?.length ?? (item.audioFile ? 1 : 0)) *
        Math.max(1, item.repeat ?? 1),
    );
  }
  for (const file of originals)
    assert.ok(fs.existsSync(`src/assets/audio/${file}`));
});
test('legacy notification links, new tabs and invalid/missing pack links resolve safely', () => {
  for (const [path, screen] of [
    ['adkar/morning', 'Morning'],
    ['adkar/night', 'Night'],
    ['adkar/before-sleep', 'BeforeSleep'],
    ['duaa', 'Duaa'],
    ['tasbihat', 'Tasbihat'],
    ['about', 'About'],
  ])
    assert.deepEqual(resolveLink('roqia://' + path), {screen});
  assert.deepEqual(resolveLink('roqia://quran'), {tab: 'Quran'});
  assert.deepEqual(resolveLink('roqia://quran/warsh/1/1'), {
    recovery: 'missing-pack',
  });
  for (const url of [
    'https://example.com',
    'roqia://../storage',
    'roqia://quran/%2e%2e/1',
    'roqia://bogus',
  ])
    assert.deepEqual(resolveLink(url), {recovery: 'invalid-link'});
});
test('generated numbers use Western digits in Arabic, French and English', () => {
  for (const locale of ['ar-MA', 'fr-FR', 'en-US']) {
    assert.ok(!/[\u0660-\u0669\u06f0-\u06f9]/.test(number(123456, {}, locale)));
    assert.ok(
      !/[\u0660-\u0669\u06f0-\u06f9]/.test(
        time(new Date('2026-01-01T12:34:00Z'), {timeZone: 'UTC'}, locale),
      ),
    );
  }
  assert.match(bytes(1024), /1 KB/);
  assert.equal(
    arabicPlural(2, {
      zero: 'zero',
      one: 'one',
      two: 'two',
      few: 'few',
      many: 'many',
      other: 'other',
    }),
    'two',
  );
});

test('both themes keep normal text and action text above 4.5:1 contrast', () => {
  const colors = require('../../design/roqia-v2/tokens/colors.json');
  const luminance = hex => {
    const rgb = hex
      .slice(1)
      .match(/../g)
      .map(n => parseInt(n, 16) / 255)
      .map(n => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4));
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  for (const mode of ['light', 'dark']) {
    const p = colors[mode];
    for (const [fg, bg] of [
      ['textPrimary', 'background'],
      ['textSecondary', 'background'],
      ['textPrimary', 'surface'],
      ['textSecondary', 'surface'],
      ['textOnAction', 'actionPrimary'],
      ['textOnAction', 'actionPressed'],
    ]) {
      const a = luminance(p[fg]),
        b = luminance(p[bg]);
      assert.ok(
        (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5,
        mode + ' ' + fg + '/' + bg,
      );
    }
  }
});

test('malformed counter maps and oversized input fail before migration can reset progress', () => {
  for (const repeatCounts of [null, 'broken', [], 42])
    assert.throws(
      () =>
        prepareMigration({'@roqia/app-state': JSON.stringify({repeatCounts})}),
      /invalid_legacy_counters/,
    );
  assert.throws(
    () =>
      prepareMigration({'@roqia/app-state': 'x'.repeat(2 * 1024 * 1024 + 1)}),
    /legacy_state_too_large/,
  );
});
