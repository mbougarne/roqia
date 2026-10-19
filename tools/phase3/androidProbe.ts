/* Explicit debug entry points only. Reminder scheduling restores saved user choices. */
import {NativeModules} from 'react-native';
import notifee from '@notifee/react-native';
import {
  loadPersistedAppState,
  getSettings,
  updateSettings,
} from '../../src/services/persistence';
import {listRecords} from '../../src/repositories/database';
import {
  loadReminders,
  reconcileReminders,
  saveReminders,
  testReminder,
  reminderPermission,
} from '../../src/features/settings/reminders/service';
import {isOwnedReminder} from '../../src/features/settings/reminders/plan';
const log = (event: string, detail: object) =>
  NativeModules.RoqiaProbe.record(event, JSON.stringify(detail));
export async function phase3Probe(scenario: string) {
  const state = await loadPersistedAppState();
  if (scenario === 'phase3-inspect') {
    log('phase3-state', {
      state,
      settings: await getSettings(),
      bookmarks: await listRecords('bookmarks'),
      reminders: await loadReminders(),
      permission: await reminderPermission(),
      triggers: await notifee.getTriggerNotifications(),
    });
  } else if (scenario === 'phase3-first-run') {
    await updateSettings({onboardingVersion: 0, guidanceSeen: false});
    log('phase3-first-run-ready', {});
  } else if (scenario === 'phase3-test-notification') {
    await testReminder();
    log('phase3-test-notification-sent', {});
  } else if (scenario === 'phase3-reminders') {
    const before = await loadReminders();
    const owned = async () =>
      (await notifee.getTriggerNotificationIds()).filter(isOwnedReminder);
    try {
      const selected = before.map(r => ({
        ...r,
        enabled: true,
        localTimeHHmm: '09:15',
        weekdays: [1, 5],
      }));
      await saveReminders(selected);
      const first = await owned();
      if (first.length !== 6)
        throw Error(`expected_six_triggers:${first.length}`);
      const triggers = await notifee.getTriggerNotifications();
      await reconcileReminders();
      if (JSON.stringify(await owned()) !== JSON.stringify(first))
        throw Error('duplicate_or_changed_ids');
      await saveReminders(
        selected.map(r => ({...r, localTimeHHmm: '10:30', weekdays: [2]})),
      );
      if (
        (await owned()).length !== 3 ||
        (await owned()).some(id => !id.endsWith(':2'))
      )
        throw Error('stale_schedule');
      await saveReminders(selected.map(r => ({...r, enabled: false})));
      if ((await owned()).length) throw Error('disable_failed');
      log('phase3-native-reminders', {
        sixWeekdayTriggers: triggers,
        changedToThree: true,
        disabledToZero: true,
        permission: await reminderPermission(),
      });
    } finally {
      await saveReminders(before);
      log('phase3-reminders-restored', {reminders: await loadReminders()});
    }
  }
}
