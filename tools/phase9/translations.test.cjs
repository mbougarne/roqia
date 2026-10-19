require('../foundation/register.cjs');
const {test} = require('node:test'),
  assert = require('node:assert/strict');
const {quranCatalog} = require('../../src/features/quran/catalog.ts');
const {
  chapters,
  validateQuranCatalog,
} = require('../../src/features/quran/domain.ts');
const {validateCatalog} = require('../../src/features/downloads/types.ts');
const {
  parseTranslationSource,
} = require('../../src/features/quran/translationParser.ts');

const t = quranCatalog.translations[0],
  p = t.pack.preparation;
const lines = chapters.flatMap(c =>
  Array.from(
    {length: c.hafsVerses},
    (_, i) => `${c.number}|${i + 1}|TEST ONLY é à «œ»  e\u0301 | suffix `,
  ),
);
const raw = rows => rows.join('\n') + '\n\n' + p.sourceFooter;
test('normal catalog offers two independently downloadable Hafs translations with pinned originals', () => {
  validateQuranCatalog(quranCatalog);
  validateCatalog(quranCatalog.translations.map(t => t.pack));
  assert.deepEqual(
    quranCatalog.translations.map(t => t.language),
    ['fr', 'en'],
  );
  for (const t of quranCatalog.translations) {
    assert.equal(t.pack.assets.length, 1);
    assert.match(t.pack.assets[0].url, /^https:\/\/tanzil.net\/trans\//);
    assert.equal(t.pack.derivedAssets.length, 114);
    assert.equal(t.pack.sourceMetadata.usage, 'non-commercial');
    assert.ok(t.notice.includes(t.title));
  }
  for (const change of [
    c => c.translations.push(c.translations[0]),
    c => (c.translations[0].chapterAssets[2] = 'chapter-1'),
    c => (c.translations[0].pack.preparation.translationId = 'en.pickthall'),
    c => (c.translations[0].textVersion = 'future'),
    c => (c.translations[0].editionId = c.texts[0].editionId),
  ]) {
    const c = structuredClone(quranCatalog);
    change(c);
    assert.throws(() => validateQuranCatalog(c));
  }
});
test('translation import preserves accents, decomposed Unicode, spaces, pipes and source notice', () => {
  const result = parseTranslationSource(p, raw(lines));
  assert.equal(result.length, 114);
  assert.equal(result.flatMap(c => c.verses).length, 6236);
  assert.equal(
    result[0].verses[0].text,
    'TEST ONLY é à «œ»  e\u0301 | suffix ',
  );
  assert.equal(result[0].sourceNotice, p.notice);
  assert.equal(result[0].textVersion, t.textVersion);
  assert.equal(result[113].verses.length, 6);
});
test('translation import rejects missing, duplicate, out-of-order, empty and extra records', () => {
  for (const rows of [
    lines.slice(1),
    [lines[0], ...lines],
    [...lines].reverse(),
    [...lines, '115|1|extra'],
    lines.map((l, i) => (i === 500 ? '' : l)),
    lines.map((l, i) => (i === 0 ? '1|1|  ' : l)),
  ])
    assert.throws(() => parseTranslationSource(p, raw(rows)));
});
test('translation import refuses wrong original footer, edition, numbering and text version', () => {
  for (const patch of [
    {editionId: 'warsh-kfgqpc-v2.1-update6'},
    {numberingScheme: 'warsh'},
    {textVersion: 'future'},
    {translationId: 'en.pickthall'},
    {sourceFooter: 'wrong'},
    {notice: 'missing source footer'},
  ])
    assert.throws(() => parseTranslationSource({...p, ...patch}, raw(lines)));
  assert.throws(() =>
    parseTranslationSource(p, raw(lines).replace('Tanzil.net', 'different')),
  );
});
