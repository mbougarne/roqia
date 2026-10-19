require('../foundation/register.cjs');
const {test} = require('node:test'),
  assert = require('node:assert/strict'),
  Module = require('node:module');

let db = new Map(),
  requests = [];
const load = Module._load;
Module._load = function (name, parent, main) {
  if (name.endsWith('repositories/database'))
    return {
      readRecord: async (c, id) => db.get(c + id) ?? null,
      saveRecord: async (c, id, v) => {
        db.set(c + id, structuredClone(v));
      },
    };
  return load.call(this, name, parent, main);
};
const {
  cachedTiming,
  prepareTiming,
  prepareTimingSource,
  bindCachedTiming,
} = require('../../src/features/quran/timingCache.ts');

const identity = {
  read: 120,
  riwaya: 'warsh',
  numberingScheme: 'kfgqpc-warsh-v2.1',
  surah: 108,
  audioSha256: 'a'.repeat(64),
  audioEtag: '"recording-v1"',
  audioVersion: 'v1',
  audioUrl: 'https://cdn.mp3quran.net/audio/mahmoud-husary/r3/108.mp3',
};
let invalid = false;
global.fetch = async url => {
  requests.push(url);
  return {
    ok: true,
    headers: {get: name => (name === 'etag' ? '"recording-v1"' : null)},
    text: async () =>
      JSON.stringify(
        url.endsWith('/reads')
          ? [
              {
                id: 120,
                rewaya: 'ورش عن نافع',
                folder_url: 'https://cdn.mp3quran.net/audio/mahmoud-husary/r3/',
              },
            ]
          : url.includes('/soar?')
            ? [{id: 108}]
            : [1, 2, 3].map((ayah, i) => ({
                ayah,
                start_time: i * 1000,
                end_time: invalid ? 0 : (i + 1) * 1000,
              })),
      ),
  };
};
test('timing preparation deduplicates requests; local verse reads and repeated preparation never fetch', async () => {
  const [a, b] = await Promise.all([
    prepareTiming(identity, 4000),
    prepareTiming(identity, 4000),
  ]);
  assert.deepEqual(a, b);
  assert.equal(a.status, 'ready');
  assert.equal(requests.length, 4);
  for (let i = 0; i < 10; i++)
    assert.equal((await cachedTiming(identity)).segments.length, 3);
  await prepareTiming(identity, 4000);
  assert.equal(requests.length, 4);
  assert.equal(
    await cachedTiming({...identity, audioSha256: 'b'.repeat(64)}),
    null,
  );
});
test('unavailable reads and bad timings stay explicit; retries are user initiated', async () => {
  const missingSurah = await prepareTiming(
    {
      ...identity,
      surah: 107,
      audioUrl: identity.audioUrl.replace('108.mp3', '107.mp3'),
    },
    4000,
  );
  assert.equal(missingSurah.status, 'unavailable');
  assert.ok(
    !requests.some(url => url.includes('surah=107')),
    'coverage prevents a request for an unlisted surah',
  );
  const absent = await prepareTiming({...identity, read: 999}, 4000);
  assert.equal(absent.status, 'unavailable');
  const count = requests.length;
  await prepareTiming({...identity, read: 999}, 4000);
  assert.equal(requests.length, count);
  invalid = true;
  const bad = await prepareTiming(identity, 4000, true);
  assert.equal(bad.status, 'invalid');
  assert.deepEqual(bad.segments, []);
  const after = requests.length;
  await cachedTiming(identity);
  await prepareTiming(identity, 4000);
  assert.equal(requests.length, after);
});
test('damaged local timing data is rejected without a verse tap fetching repairs', async () => {
  invalid = false;
  const fresh = {...identity, audioSha256: 'c'.repeat(64)};
  await prepareTiming(fresh, 4000, true);
  const row = [...db.values()].find(
    v => v.identity?.audioSha256 === fresh.audioSha256,
  );
  row.segments[0].endMs = 0;
  const before = requests.length;
  assert.equal(await cachedTiming(fresh), null);
  assert.equal(requests.length, before);
});
test('a persisted source sidecar binds to a completed download after restart without network access', async () => {
  invalid = false;
  const completed = {
    ...identity,
    audioVersion: 'offline-download-v2',
    audioSha256: 'd'.repeat(64),
  };
  const {audioSha256: _audioSha256, ...source} = completed;
  await prepareTimingSource(source);
  assert.equal(
    await cachedTiming(completed),
    null,
    'raw data cannot be played before binding',
  );
  const online = global.fetch,
    count = requests.length;
  global.fetch = async () => {
    throw Error('offline');
  };
  try {
    const bound = await bindCachedTiming(completed, 4000);
    assert.equal(bound.status, 'ready');
    assert.equal(bound.identity.audioSha256, completed.audioSha256);
    assert.equal(bound.segments.length, 3);
    assert.equal(requests.length, count);
    assert.equal(await bindCachedTiming({...completed, surah: 1}, 4000), null);
    const replaced = await bindCachedTiming(
      {...completed, audioEtag: '"different-recording-version"'},
      4000,
    );
    assert.equal(
      replaced.status,
      'invalid',
      'current provider timings cannot attach to a different downloaded entity',
    );
  } finally {
    global.fetch = online;
  }
});
