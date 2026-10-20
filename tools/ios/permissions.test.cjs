require('../foundation/register.cjs');
const {test} = require('node:test'),
  assert = require('node:assert/strict'),
  Module = require('node:module');

const platform = {OS: 'ios'},
  calls = [],
  load = Module._load;
Module._load = function (name, parent, isMain) {
  if (name === 'react-native')
    return {
      Platform: platform,
      NativeModules: {},
      Linking: {openSettings: async () => calls.push('ios-app-settings')},
    };
  if (name === '@notifee/react-native')
    return {
      __esModule: true,
      default: {openNotificationSettings: async id => calls.push(id)},
    };
  if (name.endsWith('repositories/database')) return {};
  return load.call(this, name, parent, isMain);
};
const reminders = require('../../src/features/settings/reminders/service.ts'),
  prayer = require('../../src/features/prayer/service.ts');

test('both notification settings buttons open iOS app settings and preserve Android channel links', async () => {
  await reminders.openReminderSettings();
  await prayer.openPrayerSettings();
  assert.deepEqual(calls, ['ios-app-settings', 'ios-app-settings']);
  platform.OS = 'android';
  await reminders.openReminderSettings();
  await prayer.openPrayerSettings();
  assert.deepEqual(calls.slice(2), [
    reminders.REMINDER_CHANNEL,
    prayer.CHANNEL,
  ]);
});
