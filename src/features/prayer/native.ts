import {
  NativeModules,
  PermissionsAndroid,
  Platform,
  NativeEventEmitter,
} from 'react-native';
import {type Location} from './domain';
export const adapter = NativeModules.RoqiaPrayer;
export async function locate(): Promise<
  Pick<Location, 'latitude' | 'longitude' | 'accuracy' | 'acquiredAt'>
> {
  if (Platform.OS !== 'android' || !adapter)
    throw Error('location_unavailable');
  const result = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
  ]);
  if (!Object.values(result).includes(PermissionsAndroid.RESULTS.GRANTED))
    throw Error('location_denied');
  return adapter.locate();
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
