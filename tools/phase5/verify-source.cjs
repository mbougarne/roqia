require('../foundation/register.cjs');
const fs = require('node:fs'),
  assert = require('node:assert/strict'),
  crypto = require('node:crypto'),
  path = require('node:path');
const {
  parseOriginalSource,
} = require('../../src/features/quran/sourceParser.ts');
const catalog = require('../../src/features/quran/catalog.data.json');
const legacyHafs = require('../../src/features/quran/legacy-hafs.data.json');

const reports = [];
for (const t of [...catalog.texts, legacyHafs]) {
  const kind = t.editionId.startsWith('warsh') ? 'warsh' : 'hafs';
  const archive = !!t.pack.preparation.archiveMembers;
  const raw = fs.readFileSync(
    archive
      ? path.join(process.argv[2], kind + '.json')
      : '.roqia-feasibility/sources/tanzil-uthmani.txt',
    'utf8',
  );
  const openings = archive
    ? JSON.parse(
        fs.readFileSync(
          path.join(process.argv[2], kind + '-openings.json'),
          'utf8',
        ),
      )
    : {};
  const chapters = parseOriginalSource(t.pack.preparation, raw, openings);
  for (const c of chapters) {
    const bytes = Buffer.from(JSON.stringify(c) + '\n'),
      a = t.pack.derivedAssets.find(a => a.id === `chapter-${c.surah}`);
    assert.equal(bytes.length, a.bytes);
    assert.equal(
      crypto.createHash('sha256').update(bytes).digest('hex'),
      a.sha256,
    );
  }
  reports.push({
    edition: t.editionId,
    chapters: chapters.length,
    verses: chapters.reduce((n, c) => n + c.verses.length, 0),
    sourceOpenings: chapters.filter(c => c.opening).length,
    allDerivedHashesMatch: true,
  });
}
console.log(JSON.stringify({reports}, null, 2));
