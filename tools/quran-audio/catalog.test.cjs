require('../foundation/register.cjs');
const {test} = require('node:test'),
  assert = require('node:assert/strict'),
  Module = require('node:module');
const load = Module._load;
Module._load = function (name, parent, main) {
  if (name === 'react-native-file-access')
    return {Dirs: {DocumentDir: '/private'}, FileSystem: {}};
  return load.call(this, name, parent, main);
};
const {
  remoteRecordings,
  remoteAudioUrl,
} = require('../../src/features/quran/remoteRecordings.ts');
test('all publisher Warsh/Hafs reads retain distinct recording identities, real coverage and timing availability', () => {
  assert.equal(remoteRecordings.length, 234);
  assert.equal(remoteRecordings.filter(r => r.riwaya === 'warsh').length, 13);
  assert.equal(remoteRecordings.filter(r => r.riwaya === 'hafs').length, 221);
  assert.equal(
    remoteRecordings.filter(r => r.riwaya === 'warsh' && r.timingAvailable)
      .length,
    5,
  );
  assert.equal(new Set(remoteRecordings.map(r => r.id)).size, 234);
  for (const r of remoteRecordings) {
    assert.ok(r.title && r.label && r.read > 0 && r.reciterId > 0);
    assert.equal(new Set(r.surahs).size, r.surahs.length);
    for (const s of r.surahs)
      assert.match(
        remoteAudioUrl(r, s),
        /^https:\/(?:\/cdn|\/server\d+)\.mp3quran\.net\//,
      );
  }
  const partial = remoteRecordings.find(r => r.surahs.length < 114);
  const missing = Array.from({length: 114}, (_, i) => i + 1).find(
    s => !partial.surahs.includes(s),
  );
  assert.throws(() => remoteAudioUrl(partial, missing), /unavailable/);
  assert.throws(
    () =>
      remoteAudioUrl(
        {...partial, folder: 'https://other.invalid/audio/'},
        partial.surahs[0],
      ),
    /unavailable/,
  );
});
