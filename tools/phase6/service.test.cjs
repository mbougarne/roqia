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
  if (name === 'react-native') return {Platform: {OS: 'android'}};
  if (name.endsWith('repositories/database')) return db;
  return original.call(this, name, parent, isMain);
};
const service = require('../../src/features/prayer/service.ts');
const {defaults, prayers} = require('../../src/features/prayer/domain.ts');
const cities = require('../../src/features/prayer/cities.json');
Date.now = () => Date.parse('2026-10-18T10:00:00Z');
const enabled = () => ({
  ...defaults(),
  location: cities[0],
  modes: Object.fromEntries(prayers.map(n => [n, 'notification'])),
});
test('prayer reconciliation is owned-only, idempotent, serialized, permission-aware and recovers failed scheduling', async () => {
  await service.reconcilePrayer();
  assert.equal(scheduled.size, 1);
  assert.equal(permissionRequests, 0);
  await service.savePreferences(enabled());
  assert.ok(scheduled.size > 10);
  const count = creates;
  await service.reconcilePrayer();
  assert.equal(creates, count);
  failOnce = true;
  await assert.rejects(
    service.savePreferences({...enabled(), preMinutes: 10}),
    /native_failure/,
  );
  await service.reconcilePrayer();
  assert.equal(scheduled.size, 28);
  assert.ok(scheduled.has('unrelated'));
  await Promise.all([
    service.savePreferences(enabled()),
    service.savePreferences(defaults()),
  ]);
  assert.deepEqual([...scheduled.keys()], ['unrelated']);
  await service.savePreferences(enabled());
  authorized = false;
  await service.reconcilePrayer();
  assert.equal(scheduled.size, 1);
  authorized = true;
  blocked = true;
  await service.reconcilePrayer();
  assert.equal(scheduled.size, 1);
  blocked = false;
  await service.reconcilePrayer();
  assert.ok(scheduled.size > 10);
  assert.equal(permissionRequests, 0);
  const before = [...scheduled.keys()];
  scheduled.delete(before.find(service.owned));
  await service.reconcilePrayer();
  assert.deepEqual([...scheduled.keys()], before);
});
test('source and malformed-response failures retain last-good timetable and preferences', async () => {
  const before = JSON.stringify([...records]);
  for (const response of [
    {ok: false},
    {ok: true, text: async () => '<html>unavailable</html>'},
  ]) {
    global.fetch = async () => response;
    await assert.rejects(service.refreshTable('58'));
    assert.equal(JSON.stringify([...records]), before);
  }
  await assert.rejects(service.refreshTable('999'), /unknown_city/);
});
