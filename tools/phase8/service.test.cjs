require('../foundation/register.cjs');
const {test} = require('node:test'),
  assert = require('node:assert/strict'),
  Module = require('node:module');
const records = new Map(),
  scheduled = new Map([['unrelated', {id: 'unrelated'}]]);
let authorized = true,
  blocked = false,
  failOnce = false,
  permissionRequests = 0,
  creates = 0;
const notifee = {
  getNotificationSettings: async () => ({
    authorizationStatus: authorized ? 1 : 0,
  }),
  getChannel: async () => ({blocked, importance: 4}),
  getTriggerNotificationIds: async () => [...scheduled.keys()],
  cancelTriggerNotifications: async ids =>
    ids.forEach(id => scheduled.delete(id)),
  createChannel: async () => {},
  createTriggerNotification: async (n, t) => {
    if (failOnce) {
      failOnce = false;
      throw Error('native_failure');
    }
    creates++;
    scheduled.set(n.id, {n, t});
  },
  requestPermission: async () => {
    permissionRequests++;
  },
  displayNotification: async () => {},
};
const db = {
  listRecords: async collection =>
    [...records.entries()]
      .filter(([k]) => k.startsWith(collection + ':'))
      .map(([, v]) => structuredClone(v)),
  readRecord: async (c, id) => records.get(`${c}:${id}`) ?? null,
  saveRecord: async (c, id, v) => records.set(`${c}:${id}`, structuredClone(v)),
  putRecord: async (_, c, id, v) =>
    records.set(`${c}:${id}`, structuredClone(v)),
  write: async fn => fn({}),
};
let osEvents = [];
let exact = true,
  fullNotifications = true,
  nativeEvents = [],
  failNative = false;
const native = {
  adhanStatus: async () => ({
    exact,
    notifications: fullNotifications,
    events: JSON.stringify(nativeEvents),
  }),
  scheduleAdhan: async json => {
    const e = JSON.parse(json);
    if (failNative && e.length) throw Error('file_missing');
    nativeEvents = [
      ...e,
      ...nativeEvents.filter(e => e.id === 'roqia-prayer:test'),
    ];
    osEvents = [...nativeEvents];
  },
};
const original = Module._load;
Module._load = function (name, parent, isMain) {
  if (name === '@notifee/react-native')
    return {
      __esModule: true,
      default: notifee,
      AndroidImportance: {HIGH: 4, NONE: 0},
      AuthorizationStatus: {AUTHORIZED: 1},
      RepeatFrequency: {WEEKLY: 2},
      TriggerType: {TIMESTAMP: 0},
    };
  if (name === 'react-native')
    return {Platform: {OS: 'android'}, NativeModules: {RoqiaPrayer: native}};
  if (name === 'react-native-file-access')
    return {Dirs: {DocumentDir: '/private'}};
  if (name.endsWith('repositories/database')) return db;
  return original.call(this, name, parent, isMain);
};
const service = require('../../src/features/prayer/service.ts');
const {defaults, prayers} = require('../../src/features/prayer/domain.ts');
const cities = require('../../src/features/prayer/cities.json');
const sounds = require('../../src/features/prayer/sounds.data.json');
Date.now = () => Date.parse('2026-10-18T10:00:00Z');
function install(sound) {
  const p = sound.pack,
    a = p.assets[0];
  records.set(`installed:${p.id}`, {
    packId: p.id,
    version: p.version,
    state: 'ready',
    manifestHash: p.manifestHash,
  });
  records.set(`downloads:${p.id}`, {
    packId: p.id,
    version: p.version,
    assetId: a.id,
    state: 'ready',
    relativeFinalPath: `packs/${p.id}/audio.mp3`,
  });
}
test('full adhan routes only installed selected variants to native alarms, with exclusive fallback and recovery', async () => {
  for (const sound of sounds) install(sound);
  records.set('prayer:sounds', {
    normal: sounds.find(s => s.variant === 'normal').id,
    fajr: sounds.find(s => s.variant === 'fajr').id,
  });
  await service.savePreferences({
    ...defaults(),
    location: cities[0],
    modes: Object.fromEntries(prayers.map(n => [n, 'full'])),
    preMinutes: 5,
  });
  let result = await service.reconcilePrayer();
  assert.ok(result.fullAdhan > 10);
  assert.equal(result.fullFallback, 0);
  for (const event of nativeEvents) {
    assert.equal(event.pre, false);
    assert.equal(
      event.sha256,
      sounds.find(
        s => s.variant === (event.name === 'fajr' ? 'fajr' : 'normal'),
      ).pack.assets[0].sha256,
    );
    assert.ok(!scheduled.has(event.id));
  }
  assert.ok(
    [...scheduled.values()]
      .filter(e => e.n)
      .every(e => e.n.title.startsWith('اقترب')),
  );
  osEvents = []; // Force-stop clears OS alarms, not the persisted desired IDs.
  await service.reconcilePrayer();
  assert.ok(osEvents.length > 10, 'reopen must restore native alarms');
  let count = creates;
  nativeEvents.push({id: 'roqia-prayer:test'});
  await service.reconcilePrayer();
  assert.equal(creates, count);
  assert.ok(
    nativeEvents.some(e => e.id === 'roqia-prayer:test'),
    'routine refresh must not cancel a test alarm',
  );
  nativeEvents = nativeEvents.filter(e => e.id !== 'roqia-prayer:test');
  exact = false;
  result = await service.reconcilePrayer();
  assert.equal(nativeEvents.length, 0);
  assert.equal(result.fullAdhan, 0);
  assert.ok(result.fullFallback > 10);
  exact = true;
  fullNotifications = false;
  result = await service.reconcilePrayer();
  assert.equal(result.fullAdhan, 0);
  assert.ok(result.fullFallback > 10);
  fullNotifications = true;
  failNative = true;
  result = await service.reconcilePrayer();
  assert.equal(result.fullAdhan, 0);
  assert.equal(nativeEvents.length, 0);
  assert.ok(result.fullFallback > 10);
  failNative = false;
  result = await service.reconcilePrayer();
  assert.ok(result.fullAdhan > 10);
  const fajr = sounds.find(s => s.variant === 'fajr');
  records.delete(`installed:${fajr.id}`);
  result = await service.reconcilePrayer();
  assert.ok(result.fullFallback > 0);
  assert.ok(nativeEvents.every(e => e.name !== 'fajr'));
  authorized = false;
  await service.reconcilePrayer();
  assert.equal(nativeEvents.length, 0);
  assert.deepEqual([...scheduled.keys()], ['unrelated']);
});
