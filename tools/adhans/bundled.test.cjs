require('../foundation/register.cjs');
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Module = require('node:module');
const rows = require('../../src/features/prayer/sounds.data.json');
const records = new Map();
let failPreparation = false;
const preparations = [];
const native = {
  prepareBundledAdhan: async (resource, bytes, sha256) => {
    preparations.push({resource, bytes, sha256});
    if (failPreparation) throw Error('disk_full');
    return '/private/roqia/bundled-adhan/' + resource + '.mp3';
  },
  adhanStatus: async () => ({
    exact: true,
    notifications: true,
    events: '[{"id":"roqia-prayer:test"}]',
  }),
};
const load = Module._load;
Module._load = function (name, parent, isMain) {
  if (name === 'react-native')
    return {Platform: {OS: 'android'}, NativeModules: {RoqiaPrayer: native}};
  if (name.endsWith('repositories/database'))
    return {
      listRecords: async () => {
        throw Error(
          'Bundled audio must not depend on a download/install record',
        );
      },
      readRecord: async (c, id) => records.get(c + ':' + id) ?? null,
      saveRecord: async (c, id, value) =>
        records.set(c + ':' + id, structuredClone(value)),
    };
  return load.call(this, name, parent, isMain);
};
const {
  sounds,
  localSound,
  selectedSounds,
  selectSound,
  adhanCapability,
} = require('../../src/features/prayer/sounds.ts');
Module._load = load;

test('every advertised offline choice is packaged with pinned bytes, provenance and an explicit license', () => {
  assert.equal(new Set(rows.map(s => s.id)).size, rows.length);
  assert.ok(
    rows.filter(s => s.kind === 'full' && !s.id.startsWith('adhan-doha'))
      .length >= 2,
  );
  assert.ok(rows.some(s => s.kind === 'short' && s.bundled.duration < 30));
  assert.ok(rows.some(s => s.variant === 'fajr'));
  for (const sound of rows) {
    const b = sound.bundled;
    const bytes = fs.readFileSync(
      path.resolve(
        __dirname,
        '../../android/app/src/main/res/raw',
        b.resource + '.mp3',
      ),
    );
    assert.equal(bytes.length, b.bytes);
    assert.equal(
      crypto.createHash('sha256').update(bytes).digest('hex'),
      b.sha256,
    );
    for (const key of [
      'publisher',
      'sourceUrl',
      'rightsUrl',
      'rights',
      'verifiedAt',
      'sourceSHA256',
    ])
      assert.ok(b.sourceMetadata[key], sound.id + ': ' + key);
    assert.match(
      b.sourceMetadata.sourceUrl,
      /^https:\/\/(archive.org|commons.wikimedia.org)\//,
    );
    assert.match(
      b.sourceMetadata.rightsUrl,
      /^https:\/\/creativecommons.org\//,
    );
    if (sound.pack) {
      assert.equal(
        b.sha256,
        sound.pack.assets[0].sha256,
        'original Doha bytes must stay unchanged',
      );
      assert.equal(b.bytes, sound.pack.assets[0].bytes);
    }
  }
});

test('bundled preview/selection needs no installed pack and preserves independent Fajr selection', async () => {
  const fajr = sounds.find(s => s.variant === 'fajr');
  await selectSound(fajr);
  for (const sound of sounds.filter(s => s.variant === 'normal')) {
    const local = await localSound(sound);
    assert.equal(local.sha256, sound.bundled.sha256);
    assert.equal(local.bytes, sound.bundled.bytes);
    assert.equal(local.kind, sound.kind);
    await selectSound(sound);
    assert.deepEqual(await selectedSounds(), {normal: sound.id, fajr: fajr.id});
  }
  assert.ok(preparations.length >= rows.length);
  const capability = await adhanCapability();
  assert.equal(capability.normal.kind, 'short');
  assert.equal(capability.fajr.kind, 'full');
  assert.deepEqual(
    capability.events,
    [],
    'the test alarm must not count as a prayer alarm',
  );
});

test('failed bundled preparation leaves the saved choice unchanged and exposes notification fallback', async () => {
  const previous = structuredClone(await selectedSounds());
  failPreparation = true;
  await assert.rejects(
    selectSound(sounds.find(s => s.id === 'adhan-makkah')),
    /disk_full/,
  );
  assert.deepEqual(await selectedSounds(), previous);
  const capability = await adhanCapability();
  assert.equal(capability.normal, null);
  assert.equal(capability.fajr, null);
});
