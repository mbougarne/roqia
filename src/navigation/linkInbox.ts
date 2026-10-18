import {Linking} from 'react-native';
import {
  getInitialNotificationDeepLink,
  subscribeToNotificationDeepLinks,
} from '../services/notifications';
let liveLinkReceived = false;
let started = false,
  consumer: ((url: string) => boolean) | undefined;
const pending: string[] = [];
let lastUrl = '',
  lastAt = 0;
function receive(url: string) {
  const now = Date.now();
  if (url === lastUrl && now - lastAt < 1000) return;
  lastUrl = url;
  lastAt = now;
  if (consumer?.(url)) return;
  if (!pending.includes(url)) pending.push(url);
}
export function startLinkCapture() {
  if (started) return;
  started = true;
  Linking.addEventListener('url', ({url}) => {
    liveLinkReceived = true;
    receive(url);
  });
  subscribeToNotificationDeepLinks(url => {
    liveLinkReceived = true;
    receive(url);
  });
  void Promise.all([Linking.getInitialURL(), getInitialNotificationDeepLink()])
    .then(([url, notification]) => {
      if (!liveLinkReceived && (url || notification))
        receive((url || notification)!);
    })
    .catch(() => undefined);
}
export function consumeLinks(callback: (url: string) => boolean) {
  consumer = callback;
  for (const url of pending.splice(0)) {
    if (!callback(url)) pending.push(url);
  }
  return () => {
    if (consumer === callback) consumer = undefined;
  };
}
