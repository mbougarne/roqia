import {Platform} from 'react-native';
import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  RepeatFrequency,
  TriggerType,
  type TimestampTrigger,
} from '@notifee/react-native';

type DailyReminder = {
  body: string;
  hour: number;
  id: string;
  minute: number;
  title: string;
};

const CHANNEL_ID = 'daily-adhkar-reminders';

const DAILY_REMINDERS: DailyReminder[] = [
  {
    id: 'adhkar-morning-0600',
    hour: 6,
    minute: 0,
    title: 'تذكير أذكار الصباح',
    body: 'حان وقت أذكار الصباح.',
  },
  {
    id: 'adhkar-night-1800',
    hour: 18,
    minute: 0,
    title: 'تذكير أذكار المساء',
    body: 'حان وقت أذكار المساء.',
  },
  {
    id: 'adhkar-before-sleep-2230',
    hour: 22,
    minute: 30,
    title: 'تذكير أذكار النوم',
    body: 'لا تنس أذكار النوم قبل النوم.',
  },
];

const getNextTriggerTimestamp = (hour: number, minute: number) => {
  const now = new Date();
  const next = new Date();

  next.setHours(hour, minute, 0, 0);

  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime();
};

const requestNotificationPermission = async () => {
  const settings = await notifee.requestPermission();

  return (
    settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
    settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
  );
};

const ensureAndroidChannel = async () => {
  if (Platform.OS !== 'android') {
    return;
  }

  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Daily Adhkar Reminders',
    importance: AndroidImportance.HIGH,
  });
};

const scheduleReminder = async (reminder: DailyReminder) => {
  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: getNextTriggerTimestamp(reminder.hour, reminder.minute),
    repeatFrequency: RepeatFrequency.DAILY,
  };

  await notifee.cancelTriggerNotification(reminder.id);

  await notifee.createTriggerNotification(
    {
      id: reminder.id,
      title: reminder.title,
      body: reminder.body,
      android: {
        channelId: CHANNEL_ID,
        pressAction: {
          id: 'default',
        },
      },
      ios: {
        sound: 'default',
      },
    },
    trigger,
  );
};

export const initializeDailyReminders = async () => {
  try {
    const isAuthorized = await requestNotificationPermission();

    if (!isAuthorized) {
      return;
    }

    await ensureAndroidChannel();
    await Promise.all(DAILY_REMINDERS.map(scheduleReminder));
  } catch {
    // Intentionally silent to avoid blocking app startup.
  }
};
