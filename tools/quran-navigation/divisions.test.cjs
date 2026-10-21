require('../foundation/register.cjs');
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {
  editions,
  chapters,
  validateLocator,
} = require('../../src/features/quran/domain.ts');
const {
  sectionStarts,
  sectionRange,
  sectionChapter,
  sectionTarget,
  sectionAt,
  containsCoordinate,
} = require('../../src/features/quran/divisions.ts');

for (const edition of editions) {
  for (const [kind, total] of [
    ['surah', 114],
    ['juz', 30],
    ['hizb', 60],
  ]) {
    test(`${edition.riwaya}: all ${total} ${kind} ranges cover every original ayah once`, () => {
      const visited = new Set();
      const starts = sectionStarts(edition.id, kind);
      assert.equal(starts.length, total);
      for (let number = 1; number <= total; number++) {
        const section = {kind, number},
          range = sectionRange(edition.id, section);
        assert.deepEqual(
          sectionTarget(edition.id, 'test', section).section,
          section,
        );
        for (let surah = range.start.surah; surah <= range.end.surah; surah++) {
          const bounds = sectionChapter(edition.id, section, surah);
          for (let verse = bounds.first; verse <= bounds.last; verse++) {
            const key = `${surah}:${verse}`;
            assert.equal(visited.has(key), false, `overlap at ${key}`);
            visited.add(key);
            assert.deepEqual(
              sectionAt(edition.id, kind, {surah, verse}),
              section,
            );
            validateLocator(
              sectionTarget(edition.id, 'test', section, {surah, verse}),
            );
          }
        }
      }
      assert.equal(visited.size, edition.riwaya === 'warsh' ? 6214 : 6236);
      for (const c of chapters)
        for (
          let v = 1;
          v <= (edition.riwaya === 'warsh' ? c.warshVerses : c.hafsVerses);
          v++
        )
          assert.ok(visited.has(`${c.number}:${v}`));
    });
  }
}
test('Hafs and Warsh boundaries retain independent numbering and division traditions', () => {
  const [warsh, hafs] = editions;
  assert.deepEqual(sectionRange(hafs.id, {kind: 'juz', number: 2}).start, {
    surah: 2,
    verse: 142,
  });
  assert.deepEqual(sectionRange(warsh.id, {kind: 'juz', number: 2}).start, {
    surah: 2,
    verse: 141,
  });
  assert.deepEqual(sectionRange(hafs.id, {kind: 'juz', number: 4}).start, {
    surah: 3,
    verse: 93,
  });
  assert.deepEqual(sectionRange(warsh.id, {kind: 'juz', number: 4}).start, {
    surah: 3,
    verse: 91,
  });
  assert.deepEqual(sectionRange(hafs.id, {kind: 'hizb', number: 10}).start, {
    surah: 4,
    verse: 88,
  });
  assert.deepEqual(sectionRange(warsh.id, {kind: 'hizb', number: 10}).start, {
    surah: 4,
    verse: 86,
  });
});
test('invalid sections and coordinates outside the selected unit cannot open the reader', () => {
  const id = editions[1].id;
  for (const section of [
    {kind: 'hizb', number: 0},
    {kind: 'juz', number: 31},
    {kind: 'juz', number: 1.5},
    {kind: 'other', number: 1},
  ])
    assert.throws(() => sectionRange(id, section));
  assert.throws(() =>
    sectionTarget(id, 'test', {kind: 'juz', number: 2}, {surah: 2, verse: 141}),
  );
  assert.throws(() => sectionChapter(id, {kind: 'juz', number: 2}, 3));
  assert.equal(
    containsCoordinate(sectionRange(id, {kind: 'juz', number: 30}), {
      surah: 114,
      verse: 7,
    }),
    false,
  );
});
