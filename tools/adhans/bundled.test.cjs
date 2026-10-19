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

test('the five numbered originals and separate 15-second clip match the packaged bytes', () => {
  const proof = require('./bundled-sources.json');
  assert.equal(rows.length, 6);
  assert.equal(new Set(rows.map(s => s.id)).size, rows.length);
  assert.deepEqual(
    rows.map(s => s.title),
    [
      'الأذان الأول',
      'الأذان الثاني',
      'الأذان الثالث',
      'الأذان الرابع',
      'الأذان الخامس',
      'أذان قصير',
    ],
  );
  const resources = fs
    .readdirSync(path.resolve(__dirname, '../../android/app/src/main/res/raw'))
    .filter(f => f.startsWith('roqia_adhan_'))
    .sort();
  assert.deepEqual(
    resources,
    rows.map(s => s.bundled.resource + '.mp3').sort(),
    'removed recordings must not remain in the APK',
  );
  for (let index = 0; index < rows.length; index++) {
    const sound = rows[index],
      b = sound.bundled,
      source = proof[index];
    const bytes = fs.readFileSync(
      path.resolve(__dirname, '../..', source.file),
    );
    const original = fs.readFileSync(
      path.resolve(__dirname, '../..', source.sourceFile),
    );
    assert.equal(bytes.length, b.bytes);
    assert.equal(
      crypto.createHash('sha256').update(bytes).digest('hex'),
      b.sha256,
    );
    assert.equal(
      crypto.createHash('sha256').update(original).digest('hex'),
      source.sourceSHA256,
    );
    assert.equal(original.length, source.sourceBytes);
    if (index < 5) {
      assert.deepEqual(bytes, original, 'full originals are unchanged');
      assert.equal(sound.kind, 'full');
      assert.equal(source.clip, null);
    } else {
      assert.equal(sound.kind, 'short');
      assert.equal(b.duration, 15);
      assert.equal(source.sourceFile, 'src/assets/audio/Adhan-05.mp3');
      assert.deepEqual(source.clip, {start: 0, end: 15});
    }
  }
});

test('bundled preview/selection needs no installed pack and preserves independent Fajr selection', async () => {
  const fajr = sounds[1];
  await selectSound(fajr, 'fajr');
  for (const sound of sounds) {
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
  await assert.rejects(selectSound(sounds[0]), /disk_full/);
  assert.deepEqual(await selectedSounds(), previous);
  const capability = await adhanCapability();
  assert.equal(capability.normal, null);
  assert.equal(capability.fajr, null);
});

test('removed selections fall back without silently substituting a different recording', async () => {
  failPreparation = false;
  records.set('prayer:sounds', {
    normal: 'adhan-doha-normal',
    fajr: 'adhan-doha-fajr',
  });
  const capability = await adhanCapability();
  assert.equal(capability.normal, null);
  assert.equal(capability.fajr, null);
  await selectSound(sounds[4], 'fajr');
  assert.deepEqual(await selectedSounds(), {
    normal: 'adhan-doha-normal',
    fajr: 'adhan-05',
  });
  assert.equal((await adhanCapability()).fajr.sha256, sounds[4].bundled.sha256);
});

test('the single list shares one verified recording across prayers and preserves choices on failure', async () => {
  records.set('prayer:sounds', {normal: sounds[0].id, fajr: sounds[1].id});
  await selectSound(sounds[4], 'all');
  assert.deepEqual(await selectedSounds(), {
    normal: sounds[4].id,
    fajr: sounds[4].id,
  });
  failPreparation = true;
  await assert.rejects(selectSound(sounds[3], 'all'), /disk_full/);
  assert.deepEqual(await selectedSounds(), {
    normal: sounds[4].id,
    fajr: sounds[4].id,
  });
});
