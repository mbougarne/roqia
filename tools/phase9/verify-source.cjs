// Independently compare the actual app parser against every source row and Python-generated hash.
require('../foundation/register.cjs');
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict'),
  crypto = require('node:crypto');
const {
  parseTranslationSource,
} = require('../../src/features/quran/translationParser.ts');
const catalog = require('../../src/features/quran/translations.data.json');

const sha = raw => crypto.createHash('sha256').update(raw).digest('hex');
const root = process.argv[2] ?? '.roqia-feasibility/translations';
const reports = catalog.map(t => {
  const raw = fs.readFileSync(path.join(root, t.id + '.txt')),
    a = t.pack.assets[0];
  assert.equal(raw.length, a.bytes);
  assert.equal(sha(raw), a.sha256);
  const original = raw.toString('utf8'),
    chapters = parseTranslationSource(t.pack.preparation, original);
  const rows = original.split('\n').filter(l => /^\d+\|\d+\|/.test(l));
  assert.deepEqual(
    chapters.flatMap(c =>
      c.verses.map(v => `${c.surah}|${v.number}|${v.text}`),
    ),
    rows,
  );
  for (const c of chapters) {
    const bytes = Buffer.from(JSON.stringify(c) + '\n'),
      a = t.pack.derivedAssets.find(a => a.id === `chapter-${c.surah}`);
    assert.equal(bytes.length, a.bytes);
    assert.equal(sha(bytes), a.sha256);
  }
  return {
    translation: t.id,
    chapters: chapters.length,
    verses: rows.length,
    originalBytes: raw.length,
    sourceSha256: sha(raw),
    allSourceStringsExact: true,
    allChapterHashesMatch: true,
  };
});
console.log(JSON.stringify({reports}, null, 2));
