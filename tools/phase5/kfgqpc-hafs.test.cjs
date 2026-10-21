require('../foundation/register.cjs');
const {test} = require('node:test'),
  assert = require('node:assert/strict');
const {quranCatalog} = require('../../src/features/quran/catalog.ios.ts');
const android = require('../../src/features/quran/catalog.ts').quranCatalog;
const {
  chapters,
  validateQuranCatalog,
  currentHafsLocator,
  locatorKey,
  hafsEditionId,
  hafsPackVersion,
} = require('../../src/features/quran/domain.ts');
const {
  parseOriginalSource,
} = require('../../src/features/quran/sourceParser.ts');

test('iPhone imports paired KFGQPC Hafs text/font while Android keeps its existing source', () => {
  validateQuranCatalog(quranCatalog);
  assert.equal(quranCatalog.texts[1].editionId, hafsEditionId);
  assert.equal(android.texts[1].editionId, 'hafs-tanzil-uthmani-1.1');
  assert.deepEqual(quranCatalog.texts[0], android.texts[0]);
  assert.deepEqual(quranCatalog.translations, android.translations);
  assert.deepEqual(quranCatalog.recordings, android.recordings);
  const bad = structuredClone(quranCatalog);
  bad.texts[1].pack.derivedAssets.find(a => a.id === 'source-font').sha256 =
    '0'.repeat(64);
  assert.throws(() => validateQuranCatalog(bad), /edition_font_mismatch/);
});

test('KFGQPC Hafs keeps source strings and IDs, separates 112 openings, and rejects reordered or missing verses', () => {
  const preparation = quranCatalog.texts[1].pack.preparation;
  let id = 0;
  const rows = chapters.flatMap(c =>
    Array.from({length: c.hafsVerses}, (_, i) => ({
      id: ++id,
      sura_no: c.number,
      aya_no: i + 1,
      aya_text: `TEST ONLY  \u06e1 \ufc00 ${i}  `,
    })),
  );
  const openings = Object.fromEntries(
    chapters
      .filter(c => c.number !== 9)
      .map(c => [
        c.number,
        c.number === 95 || c.number === 97
          ? 'بِّسۡمِ TEST ONLY  '
          : 'بِسۡمِ TEST ONLY  ',
      ]),
  );
  const parsed = parseOriginalSource(
    preparation,
    JSON.stringify(rows),
    openings,
  );
  assert.equal(parsed.flatMap(c => c.verses).length, 6236);
  assert.equal(parsed.filter(c => c.opening).length, 112);
  assert.equal(parsed[0].opening, undefined);
  assert.equal(parsed[8].opening, undefined);
  assert.equal(parsed[3].opening, openings[4]);
  assert.equal(parsed[94].opening, openings[95]);
  assert.equal(
    parsed[3].verses[0].text,
    rows.find(r => r.sura_no === 4).aya_text,
  );
  assert.equal(parsed[0].verses[0].sourceId, '1');
  for (const bad of [rows.slice(1), [...rows].reverse(), [rows[0], ...rows]])
    assert.throws(() =>
      parseOriginalSource(preparation, JSON.stringify(bad), openings),
    );
  assert.throws(() =>
    parseOriginalSource(preparation, JSON.stringify(rows), {
      ...openings,
      9: openings[1],
    }),
  );
});

test('existing Hafs bookmarks map only the verified numbering and version, without mutating saved records', () => {
  const old = {
    editionId: 'hafs-tanzil-uthmani-1.1',
    numberingScheme: 'tanzil-madina-hafs',
    surah: 4,
    verse: 176,
    packVersion: 'source-1',
  };
  const before = structuredClone(old);
  const current = currentHafsLocator(old);
  assert.equal(current.editionId, hafsEditionId);
  assert.equal(current.packVersion, hafsPackVersion);
  assert.equal(current.verse, 176);
  assert.deepEqual(old, before);
  assert.notEqual(locatorKey(current), locatorKey(old));
  assert.deepEqual(currentHafsLocator({...old, packVersion: 'future'}), {
    ...old,
    packVersion: 'future',
  });
  assert.throws(
    () => currentHafsLocator({...old, verse: 177}),
    /invalid_locator/,
  );
  const warsh = {
    ...old,
    editionId: 'warsh-kfgqpc-v2.1-update6',
    numberingScheme: 'kfgqpc-warsh-v2.1',
    surah: 2,
    verse: 285,
  };
  assert.deepEqual(currentHafsLocator(warsh), warsh);
});
