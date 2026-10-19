require('../foundation/register.cjs');
const {test} = require('node:test'),
  assert = require('node:assert/strict');
const {
  timingIdentity,
  timingKey,
  matchingTimingRead,
  validateTiming,
} = require('../../src/features/quran/timing.ts');
const {quranCatalog} = require('../../src/features/quran/catalog.ts');

const warsh = timingIdentity(
  quranCatalog.recordings[0],
  108,
  'warsh-kfgqpc-v2.1-update6',
);
const rows = [1, 2, 3].map((ayah, i) => ({
  ayah,
  start_time: 1000 + i * 1000,
  end_time: 2000 + i * 1000,
}));
test('timings bind recording ID, edition numbering, source URL and exact downloaded bytes', () => {
  assert.equal(warsh.read, 120);
  assert.throws(
    () =>
      timingIdentity(quranCatalog.recordings[0], 1, 'hafs-tanzil-uthmani-1.1'),
    /mismatch/,
  );
  const reads = [
    {
      id: 120,
      rewaya: 'ورش عن نافع',
      folder_url: 'https://cdn.mp3quran.net/audio/mahmoud-husary/r3/',
    },
  ];
  assert.equal(matchingTimingRead(reads, warsh), true);
  for (const patch of [
    {read: 118},
    {riwaya: 'hafs'},
    {audioUrl: warsh.audioUrl.replace('/r3/', '/r1/')},
  ])
    assert.equal(matchingTimingRead(reads, {...warsh, ...patch}), false);
  for (const patch of [
    {audioSha256: 'b'.repeat(64)},
    {audioVersion: 'other'},
    {audioEtag: '"replacement"'},
    {numberingScheme: 'other'},
    {surah: 1},
    {read: 1},
  ])
    assert.notEqual(timingKey(warsh), timingKey({...warsh, ...patch}));
});
test('complete verse segments preserve milliseconds and separate optional basmala', () => {
  const expected = rows.map(r => ({
    verse: r.ayah,
    startMs: r.start_time,
    endMs: r.end_time,
  }));
  assert.deepEqual(validateTiming(rows, warsh, 4000), expected);
  assert.deepEqual(
    validateTiming(
      [{ayah: 0, start_time: 0, end_time: 1000}, ...rows],
      warsh,
      4000,
    ),
    expected,
  );
  assert.equal(
    validateTiming(rows, warsh, 3970)[2].endMs,
    3970,
    'only MP3 EOF frame rounding may be bounded to the real file',
  );
});
test('missing, duplicate, out of order, overlapping, zero/reversed and out-of-recording timings are quarantined', () => {
  const bad = [
    rows.slice(1),
    [...rows, rows[2]],
    [rows[1], rows[0], rows[2]],
    rows.map((r, i) => (i === 1 ? {...r, start_time: 1999} : r)),
    rows.map((r, i) => (i === 1 ? {...r, end_time: r.start_time} : r)),
    rows.map((r, i) => (i === 1 ? {...r, end_time: r.start_time - 1} : r)),
    rows.map((r, i) => (i === 1 ? {...r, start_time: NaN} : r)),
    rows.map((r, i) => (i === 1 ? {...r, ayah: 99} : r)),
  ];
  for (const value of bad)
    assert.throws(() => validateTiming(value, warsh, 4000), /invalid_timing/);
  assert.throws(() => validateTiming(rows, warsh, 3800), /invalid_timing/);
  const baqarah = timingIdentity(
    quranCatalog.recordings[0],
    2,
    'warsh-kfgqpc-v2.1-update6',
  );
  const hafsNumbered = Array.from({length: 286}, (_, i) => ({
    ayah: i + 1,
    start_time: i * 1000,
    end_time: (i + 1) * 1000,
  }));
  assert.throws(
    () => validateTiming(hafsNumbered, baqarah, 300000),
    /invalid_timing/,
  );
});
