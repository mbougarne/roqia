import notifee, {
  EventType,
  type Event,
  type InitialNotification,
} from '@notifee/react-native';
import {Linking} from 'react-native';

const extractDeepLinkFromNotification = (
  notification?:
    | Event['detail']['notification']
    | InitialNotification['notification'],
) => {
  const deepLink = notification?.data?.deepLink;

  if (!deepLink || typeof deepLink !== 'string') {
    return null;
  }

  return deepLink;
};

const openDeepLinkFromNotification = async (
  notification?:
    | Event['detail']['notification']
    | InitialNotification['notification'],
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

export const subscribeToNotificationDeepLinks = (
  listener: (url: string) => void,
) => {
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
