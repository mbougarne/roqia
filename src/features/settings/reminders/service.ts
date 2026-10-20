import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  RepeatFrequency,
  TriggerType,
} from '@notifee/react-native';
import {Linking, Platform} from 'react-native';

import {
  isOwnedReminder,
  reminderDefaults,
  reminderLabels,
  reminderLinks,
  reminderPlan,
  reminderSignature,
  validateReminders,
} from './plan';
import {
  listRecords,
  putRecord,
  readRecord,
  saveRecord,
  write,
} from '../../../repositories/database';
import {type Reminder} from '../../../repositories/models';

export const REMINDER_CHANNEL = 'daily-adhkar-reminders';

export async function loadReminders() {
  const stored = await listRecords<Reminder>('reminders');
  const rows = reminderDefaults.map(
    d => stored.find(r => r.reminderId === d.reminderId) ?? d,
  );
  validateReminders(rows);
  return rows;
}

export async function reminderPermission() {
  const settings = await notifee.getNotificationSettings();
  const channel =
    Platform.OS === 'android'
      ? await notifee.getChannel(REMINDER_CHANNEL)
      : undefined;
  return {
    authorized: settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED,
    channelBlocked:
      !!channel?.blocked || channel?.importance === AndroidImportance.NONE,
  };
}
let tail: Promise<unknown> = Promise.resolve();

function serialize<T>(fn: () => Promise<T>) {
  const next = tail.then(fn);
  tail = next.catch(() => undefined);
  return next;
}

async function reconcile() {
  const rows = await loadReminders(),
    permission = await reminderPermission();
  const plan =
    permission.authorized && !permission.channelBlocked
      ? reminderPlan(rows)
      : [];
  const current = (await notifee.getTriggerNotificationIds()).filter(
    isOwnedReminder,
  );
  const signature = reminderSignature(rows) + JSON.stringify(permission);
  const previous = await readRecord<string>('reminder-runtime', 'signature');
  if (
    previous === signature &&
    current.length === plan.length &&
    plan.every(p => current.includes(p.id))
  )
    return permission;
  // Persist desired settings first, then reconcile owned native IDs. A crash or native
  // failure leaves the signature stale so the next open retries the whole plan.
  if (current.length) await notifee.cancelTriggerNotifications(current);
  if (plan.length && Platform.OS === 'android')
    await notifee.createChannel({
      id: REMINDER_CHANNEL,
      name: 'تذكيرات الأذكار',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });
  for (const entry of plan)
    await notifee.createTriggerNotification(
      {
        id: entry.id,
        title: reminderLabels[entry.category],
        body: 'حان وقت وردك اليومي.',
        data: {deepLink: reminderLinks[entry.category]},
        android: {channelId: REMINDER_CHANNEL, pressAction: {id: 'default'}},
        ios: {sound: 'default'},
      },
      {
        type: TriggerType.TIMESTAMP,
        timestamp: entry.timestamp,
        repeatFrequency: RepeatFrequency.WEEKLY,
      },
    );
  await saveRecord('reminder-runtime', 'signature', signature);
  return permission;
}

export const reconcileReminders = () => serialize(reconcile);

export const saveReminders = (rows: Reminder[]) =>
  serialize(async () => {
    validateReminders(rows);
    await write(async tx => {
      for (const r of rows)
        await putRecord(tx, 'reminders', r.reminderId, {
          ...r,
          updatedAt: Date.now(),
        });
    });
    return reconcile();
  });

// Called only from the explicit save/test action in the reminders screen.
export const requestReminderPermission = () => notifee.requestPermission();

export async function testReminder(category = 'Morning') {
  if (!reminderLinks[category]) throw new Error('invalid_category');
  const permission = await reminderPermission();
  if (!permission.authorized || permission.channelBlocked)
    throw new Error('permission_denied');
  if (Platform.OS === 'android')
    await notifee.createChannel({
      id: REMINDER_CHANNEL,
      name: 'تذكيرات الأذكار',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });
  await notifee.displayNotification({
    id: 'roqia-reminder-test',
    title: 'تجربة التذكير',
    body: reminderLabels[category],
    data: {deepLink: reminderLinks[category]},
    android: {channelId: REMINDER_CHANNEL, pressAction: {id: 'default'}},
    ios: {sound: 'default'},
  });
}

export const openReminderSettings = () =>
  Platform.OS === 'ios'
    ? Linking.openSettings()
    : notifee.openNotificationSettings(REMINDER_CHANNEL);
