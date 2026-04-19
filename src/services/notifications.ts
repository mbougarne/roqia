import {Linking, Platform} from 'react-native';
import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  EventType,
  RepeatFrequency,
  TriggerType,
  type Event,
  type InitialNotification,
  type TimestampTrigger,
} from '@notifee/react-native';
import {CategoryEnum} from '../data';

type DailyReminder = {
  body: string;
  category: CategoryEnum;
  hour: number;
  id: string;
  minute: number;
  title: string;
};

const CHANNEL_ID = 'daily-adhkar-reminders';
const DEEP_LINK_SCHEME = 'roqia://';

const categoryPathByEnum: Record<CategoryEnum, string> = {
  [CategoryEnum.Morning]: 'adkar/morning',
  [CategoryEnum.Night]: 'adkar/night',
  [CategoryEnum.BeforeSleep]: 'adkar/before-sleep',
};

const getCategoryDeepLink = (category: CategoryEnum) =>
  `${DEEP_LINK_SCHEME}${categoryPathByEnum[category]}`;

const DAILY_REMINDERS: DailyReminder[] = [
  {
    id: 'adhkar-morning-0600',
    category: CategoryEnum.Morning,
    hour: 6,
    minute: 0,
    title: 'تذكير أذكار الصباح',
    body: 'حان وقت أذكار الصباح.',
  },
  {
    id: 'adhkar-night-1800',
    category: CategoryEnum.Night,
    hour: 18,
    minute: 0,
    title: 'تذكير أذكار المساء',
    body: 'حان وقت أذكار المساء.',
  },
  {
    id: 'adhkar-before-sleep-2230',
    category: CategoryEnum.BeforeSleep,
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
  const deepLink = getCategoryDeepLink(reminder.category);
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
      data: {
        deepLink,
      },
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

const extractDeepLinkFromNotification = (
  notification?: Event['detail']['notification'] | InitialNotification['notification'],
) => {
  const deepLink = notification?.data?.deepLink;

  if (!deepLink || typeof deepLink !== 'string') {
    return null;
  }

  return deepLink;
};

const openDeepLinkFromNotification = async (
  notification?: Event['detail']['notification'] | InitialNotification['notification'],
) => {
  const deepLink = extractDeepLinkFromNotification(notification);

  if (!deepLink) {
    return;
  }

  try {
    await Linking.openURL(deepLink);
  } catch {
    // Ignore deep-link failures to avoid crashing from malformed payloads.
  }
};

export const onBackgroundNotificationPress = async (event: Event) => {
  if (event.type !== EventType.PRESS) {
    return;
  }

  await openDeepLinkFromNotification(event.detail.notification);
};

export const getInitialNotificationDeepLink = async () => {
  try {
    const initial = await notifee.getInitialNotification();

    if (!initial) {
      return null;
    }

    return extractDeepLinkFromNotification(initial.notification);
  } catch {
    return null;
  }
};

export const subscribeToNotificationDeepLinks = (listener: (url: string) => void) => {
  const unsubscribe = notifee.onForegroundEvent(event => {
    if (event.type !== EventType.PRESS) {
      return;
    }

    const deepLink = extractDeepLinkFromNotification(event.detail.notification);

    if (!deepLink) {
      return;
    }

    listener(deepLink);
  });

  return unsubscribe;
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
