require('../foundation/register.cjs');
const {test} = require('node:test'),
  assert = require('node:assert/strict');
const {validateCatalog} = require('../../src/features/downloads/types.ts');
const {quranCatalog} = require('../../src/features/quran/catalog.ts');
const {
  validateQuranCatalog,
  selectedAudio,
} = require('../../src/features/quran/domain.ts');
const sounds = require('./legacy-sounds.fixture.json');
const proof = require('../../docs/implementation/phase-8/audio-verification.json');
test('complete Warsh/Hafs catalog and historical normal/Fajr audit match source bytes without mixing riwayas', () => {
  validateQuranCatalog(quranCatalog);
  assert.deepEqual(quranCatalog.recordings.map(r => r.riwaya).sort(), [
    'hafs',
    'warsh',
  ]);
  for (const recording of quranCatalog.recordings) {
    assert.deepEqual(
      recording.chapters.map(c => c.surah),
      Array.from({length: 114}, (_, i) => i + 1),
    );
    const selected = selectedAudio(recording, [1, 112, 114]);
    assert.equal(selected.rows.length, 3);
    for (const c of recording.chapters) {
      assert.equal(c.pack.sourceMetadata.riwaya, recording.riwaya);
      assert.equal(
        c.pack.sourceMetadata.rightsUrl,
        'https://www.mp3quran.net/ar/privacy',
      );
    }
  }
  const legacySounds = sounds.filter(s => s.pack);
  assert.deepEqual(legacySounds.map(s => s.variant).sort(), ['fajr', 'normal']);
  const packs = [
    ...quranCatalog.recordings.flatMap(r => r.chapters.map(c => c.pack)),
    ...legacySounds.map(s => s.pack),
  ];
  validateCatalog(packs);
  assert.equal(packs.length, 230);
  assert.equal(proof.length, 230);
  for (const p of packs) {
    const a = p.assets[0],
      e = proof.find(e => e.id === p.id);
    assert.ok(e);
    for (const key of ['url', 'bytes', 'sha256', 'mime'])
      assert.equal(a[key], e[key]);
    assert.ok(Number(e.duration) > 5);
  }
});
