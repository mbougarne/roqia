require('./register.cjs');
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {
  createFormatters,
  normalizeDigits,
  number,
} = require('../../src/design/format.ts');

test('both numeral choices cover integers, fractions, dates and padded playback times', () => {
  const western = createFormatters('western');
  const eastern = createFormatters('eastern');
  for (const locale of ['ar-MA', 'fr-FR', 'en-US']) {
    const value = eastern.number(1203.5, {maximumFractionDigits: 1}, locale);
    assert.match(value, /١/);
    assert.match(value, /٥/);
    assert.doesNotMatch(value, /[0-9]/);
    assert.doesNotMatch(
      western.number(1203.5, {maximumFractionDigits: 1}, locale),
      /[٠-٩]/,
    );
    assert.doesNotMatch(
      eastern.time(new Date('2026-01-01T12:34:00Z'), {timeZone: 'UTC'}, locale),
      /[0-9]/,
    );
  }
  assert.equal(western.duration(65.9), '1:05');
  assert.equal(eastern.duration(65.9), '١:٠٥');
  assert.equal(eastern.duration(3600), '٦٠:٠٠');
  assert.equal(eastern.duration(NaN), '٠:٠٠');
  assert.equal(eastern.bytes(1024), '١ KB');
  assert.equal(
    eastern.date(
      new Date('2026-01-19T12:00:00Z'),
      {year: 'numeric', timeZone: 'UTC'},
      'en-US',
    ),
    '٢٠٢٦',
  );
  assert.equal(
    number(123, {useGrouping: false}),
    '123',
    'canonical marker formatting keeps Western digits',
  );
});

test('display shaping preserves padding and numeric inputs normalize for canonical parsing', () => {
  assert.equal(
    createFormatters('eastern').digits('06:05 · 12 / 33'),
    '٠٦:٠٥ · ١٢ / ٣٣',
  );
  assert.equal(normalizeDigits('٠٦:٠٥'), '06:05');
  assert.equal(normalizeDigits('-۱۲.۵'), '-12.5');
  assert.equal(Number(normalizeDigits('١٢.٥')), 12.5);
});
