require('../foundation/register.cjs');
const {test} = require('node:test'),
  assert = require('node:assert/strict'),
  Module = require('node:module');
let deadline = 0,
  calls = [];
const native = {
  sleepDeadline: async () => deadline,
  setSleepTimer: async ms => {
    calls.push(ms);
    deadline = ms ? Date.now() + ms : 0;
  },
};
const rn = {Platform: {OS: 'android'}, NativeModules: {RoqiaAudio: native}};
const load = Module._load;
Module._load = function (name, parent, isMain) {
  if (name === 'react-native') return rn;
  return load.call(this, name, parent, isMain);
};
const sleep = require('../../src/features/audio/sleep.ts');
test('sleep controls persist a native duration, clear explicitly and reject invalid or unsupported requests', async () => {
  assert.equal(sleep.sleepSupported(), true);
  await sleep.setSleepTimer(15);
  assert.equal(calls[0], 900000);
  assert.ok(await sleep.sleepDeadline());
  for (const bad of [-1, NaN, Infinity, 16])
    await assert.rejects(sleep.setSleepTimer(bad), /invalid/);
  assert.equal(calls.length, 1);
  await sleep.clearSleepTimer();
  assert.equal(await sleep.sleepDeadline(), null);
  rn.Platform.OS = 'ios';
  assert.equal(sleep.sleepSupported(), false);
  await assert.rejects(sleep.setSleepTimer(15), /unavailable/);
  assert.equal(await sleep.sleepDeadline(), null);
  assert.equal(calls.length, 2);
});
