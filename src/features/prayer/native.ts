import {
  NativeModules,
  PermissionsAndroid,
  Platform,
  NativeEventEmitter,
} from 'react-native';

import {type Location} from './domain';

export const adapter = NativeModules.RoqiaPrayer;

export async function locate(): Promise<
  Pick<Location, 'latitude' | 'longitude' | 'accuracy' | 'acquiredAt'> & {
    name?: string;
  }
> {
  if (Platform.OS !== 'android' || !adapter)
    throw Error('location_unavailable');
  const result = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
  ]);
  if (!Object.values(result).includes(PermissionsAndroid.RESULTS.GRANTED))
    throw Error('location_denied');
  const fix = await adapter.locate();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const name = await Promise.race([
      adapter.locationName?.(fix.latitude, fix.longitude) ??
        Promise.resolve(null),
      new Promise<null>(resolve => {
        timeout = setTimeout(() => resolve(null), 4000);
      }),
    ]);
    return {
      ...fix,
      ...(typeof name === 'string' && name.trim()
        ? {name: name.trim().slice(0, 100)}
        : {}),
    };
  } catch {
    return fix;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function onHeading(
  listener: (e: {heading: number; accuracy: number; at: number}) => void,
) {
  if (!adapter) return () => {};
  const sub = new NativeEventEmitter(adapter).addListener(
    'RoqiaHeading',
    listener,
  );
  return () => sub.remove();
}

export function onPrayerTimeChanged(listener: () => void) {
  if (!adapter) return () => {};
  const sub = new NativeEventEmitter(adapter).addListener(
    'RoqiaPrayerTimeChanged',
    listener,
  );
  return () => sub.remove();
}
