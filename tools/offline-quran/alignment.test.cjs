require('../foundation/register.cjs');
const {test} = require('node:test'),
  assert = require('node:assert/strict');
const fs = require('node:fs'),
  crypto = require('node:crypto');
const {
  alignWarshTranslation,
} = require('../../src/features/quran/translationAlignment.ts');
const {chapters} = require('../../src/features/quran/domain.ts');
const translations = require('../../src/features/quran/translations.data.json');
const catalog = require('../../src/features/quran/catalog.data.json');
test('bundled originals exactly match pinned sizes and hashes', () => {
  for (const {pack} of [catalog.texts[0], ...translations])
    for (const a of pack.assets) {
      const raw = fs.readFileSync(
        `bundled-content/roqia-offline/${pack.id}/${pack.version}/${a.file}`,
      );
      assert.equal(raw.length, a.bytes);
      assert.equal(
        crypto.createHash('sha256').update(raw).digest('hex'),
        a.sha256,
      );
    }
});
test('all 114 chapters preserve every complete source verse once, in order, for both languages', () => {
  for (const {pack} of translations) {
    const raw = fs.readFileSync(
      `bundled-content/roqia-offline/${pack.id}/${pack.version}/${pack.assets[0].file}`,
      'utf8',
    );
    const lines = raw.split(/\r?\n/).filter(l => /^\d+\|\d+\|/.test(l));
    let count = 0;
    chapters.forEach((chapter, i) => {
      const source = lines
        .filter(l => l.startsWith(`${i + 1}|`))
        .map(l => {
          const [, n, ...text] = l.split('|');
          return {number: +n, text: text.join('|')};
        });
      const out = alignWarshTranslation(i + 1, source);
      const opening = out.find(v => v.number === 0);
      const actual = [
        ...(opening ? [opening.text] : []),
        ...out
          .filter(v => v.number > 0 && v.text)
          .flatMap(v => v.text.split('\n\n')),
      ];
      assert.deepEqual(
        actual,
        source.map(v => v.text),
      );
      assert.equal(out.filter(v => v.number > 0).length, chapter.warshVerses);
      count += actual.length;
    });
    assert.equal(count, 6236);
  }
});
test('Fatiha keeps basmala separate and groups the final Hafs verse across Warsh 6–7', () => {
  const out = alignWarshTranslation(
    1,
    Array.from({length: 7}, (_, i) => ({
      number: i + 1,
      text: `verse-${i + 1}`,
    })),
  );
  assert.equal(out[0].text, 'verse-2');
  assert.equal(out[5].text, '');
  assert.equal(out[6].text, 'verse-7');
  assert.equal(out[6].warshStart, 6);
  assert.equal(out.find(v => v.number === 0).text, 'verse-1');
});
test('incomplete or reordered source is rejected', () => {
  assert.throws(() => alignWarshTranslation(1, []), /alignment_source/);
  assert.throws(
    () =>
      alignWarshTranslation(
        1,
        Array.from({length: 7}, () => ({number: 1, text: 'x'})),
      ),
    /alignment_source/,
  );
});
