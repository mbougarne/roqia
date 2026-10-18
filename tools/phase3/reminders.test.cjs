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
const service = require('../../src/features/settings/reminders/service.ts');
const {
  reminderDefaults,
} = require('../../src/features/settings/reminders/plan.ts');
test('native reconciliation is idempotent, serialized, owned-only and recovers partial failure', async () => {
  await service.reconcileReminders();
  assert.equal(scheduled.size, 1);
  assert.equal(permissionRequests, 0);
  scheduled.set('adhkar-morning-0600', {});
  const enabled = reminderDefaults.map(r => ({
    ...r,
    enabled: true,
    weekdays: [1, 5],
  }));
  await service.saveReminders(enabled);
  assert.equal(scheduled.size, 7);
  assert.ok(!scheduled.has('adhkar-morning-0600'));
  const count = creates;
  await service.reconcileReminders();
  assert.equal(creates, count);
  failOnce = true;
  await assert.rejects(
    service.saveReminders(enabled.map(r => ({...r, localTimeHHmm: '09:15'}))),
    /native_failure/,
  );
  await service.reconcileReminders();
  assert.equal(scheduled.size, 7);
  await Promise.all([
    service.saveReminders(enabled),
    service.saveReminders(reminderDefaults),
  ]);
  assert.deepEqual([...scheduled.keys()], ['unrelated']);
  await service.saveReminders(enabled);
  authorized = false;
  await service.reconcileReminders();
  assert.equal(scheduled.size, 1);
  authorized = true;
  blocked = true;
  await service.reconcileReminders();
  assert.equal(scheduled.size, 1);
  blocked = false;
  await service.reconcileReminders();
  assert.equal(scheduled.size, 7);
  assert.equal(permissionRequests, 0); // Only an explicit UI action may prompt.
});
