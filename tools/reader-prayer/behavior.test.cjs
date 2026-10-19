require('../foundation/register.cjs');
const {test} = require('node:test'),
  assert = require('node:assert/strict');
const {readerPassages} = require('../../src/features/quran/readerLayout.ts');
const {
  gpsLocation,
  preferencesForLocation,
  liveHeading,
  cityMatches,
} = require('../../src/features/prayer/locationSelection.ts');
const {defaults, day, bearing} = require('../../src/features/prayer/domain.ts');
const cities = require('../../src/features/prayer/cities.json'),
  tables = require('../../src/features/prayer/timetables.json');
test('continuous paragraphs preserve every exact source string and keep verse-mode rows separate', () => {
  const verses = Array.from({length: 286}, (_, i) => ({
    number: i + 1,
    text: 'عربي\u064e ' + String(i) + ' '.repeat(100),
  }));
  const pages = readerPassages(verses, true);
  assert.deepEqual(pages.flat(), verses);
  assert.equal(pages.length, 1);
  assert.ok(pages.every(p => p.length > 0));
  assert.deepEqual(
    readerPassages(verses, false),
    verses.map(v => [v]),
  );
  assert.deepEqual(readerPassages([], true), []);
});
test('fresh compass samples are live even between timer ticks; unreliable and stale samples are not', () => {
  assert.equal(liveHeading({at: 1050, accuracy: 3}, 1060), true);
  assert.equal(liveHeading({at: 1050, accuracy: 1}, 1060), false);
  assert.equal(liveHeading({at: 1050, accuracy: 3}, 3550), false);
  assert.equal(liveHeading({at: 1050, accuracy: 3}, 1000), false);
});
test('GPS preserves coordinates/name and switches unsupported official-city method to explicit calculation', () => {
  const location = gpsLocation(
    {
      latitude: 32.33725,
      longitude: -6.34983,
      accuracy: 20,
      acquiredAt: 123,
      name: 'بني ملال',
    },
    'Africa/Casablanca',
  );
  const p = preferencesForLocation(defaults(), location);
  assert.equal(p.location.name, 'بني ملال');
  assert.equal(p.location.source, 'gps');
  assert.equal(p.location.cityId, null);
  assert.equal(p.method, 'MuslimWorldLeague');
  assert.equal(day(p, '2026-10-19').rows.length, 6);
  assert.ok(Number.isFinite(bearing(location)));
  assert.equal(
    preferencesForLocation({...p, method: 'Egyptian'}, location).method,
    'Egyptian',
  );
  assert.equal(
    gpsLocation({...location, name: undefined}, location.zone).name,
    'موقعي المحفوظ',
  );
});
test('Beni Mellal is searchable and has a distinct official timetable and valid Qibla bearing', () => {
  const c = cities.find(c => c.name === 'بني ملال');
  assert.equal(c.cityId, '73');
  for (const q of ['بني', 'بَنِي ملال', 'Béni Mellal', 'beni mellal'])
    assert.equal(cityMatches(c.name, q), true);
  const p = preferencesForLocation(defaults(), c),
    table = tables.find(t => t.cityId === c.cityId);
  assert.equal(p.method, 'habous');
  assert.ok(table);
  assert.equal(day(p, Object.keys(table.dates)[0], table).rows.length, 6);
  assert.ok(bearing(c) > 80 && bearing(c) < 110);
});
test('bundled Beni Mellal table comes from the selected official city, not a legacy widget id', () => {
  const fs = require('node:fs');
  const {parseHabous} = require('../../src/features/prayer/habous.ts');
  const html = fs.readFileSync(
    'docs/implementation/reader-prayer/beni-mellal-source.html',
    'utf8',
  );
  assert.match(
    html,
    /<option[^>]*ville=73[^>]*selected[^>]*>بني ملال<\/option>/,
  );
  assert.deepEqual(
    parseHabous(html, '73').dates,
    tables.find(t => t.cityId === '73').dates,
  );
});

test('alignment wraps north and has distinct entry and exit thresholds', () => {
  const {
    qiblaAligned,
  } = require('../../src/features/prayer/locationSelection.ts');
  assert.equal(qiblaAligned(359, 2, false), true);
  assert.equal(qiblaAligned(2, 359, false), true);
  assert.equal(qiblaAligned(90, 96, false), false);
  assert.equal(qiblaAligned(90, 96, true), true);
  assert.equal(qiblaAligned(90, 99, true), false);
});
test('continuous scroll offsets retain edition-local verse boundaries', () => {
  const {verseAtOffset} = require('../../src/features/quran/readerLayout.ts');
  assert.equal(verseAtOffset([10, 20, 30], 0), 0);
  assert.equal(verseAtOffset([10, 20, 30], 10), 1);
  assert.equal(verseAtOffset([10, 20, 30], 29), 1);
  assert.equal(verseAtOffset([10, 20, 30], 60), 2);
});

test('translation popups resolve every verse in a grouped passage without changing text', () => {
  const {
    translationForVerse,
  } = require('../../src/features/quran/translationAlignment.ts');
  const group = {
    number: 7,
    warshStart: 6,
    sourceStart: 7,
    sourceEnd: 7,
    text: 'Complete source meaning',
  };
  const rows = [{number: 0, text: 'Opening'}, {number: 6, text: ''}, group];
  assert.equal(translationForVerse(rows, 6), group);
  assert.equal(translationForVerse(rows, 7), group);
  assert.equal(translationForVerse(rows, 0).text, 'Opening');
  assert.equal(translationForVerse(rows, 5), undefined);
});
