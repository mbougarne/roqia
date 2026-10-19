import {NativeModules, Platform} from 'react-native';

const native = () =>
  Platform?.OS === 'android' ? NativeModules?.RoqiaAudio : undefined;

export const sleepSupported = () => !!native()?.setSleepTimer;

export async function sleepDeadline(): Promise<number | null> {
  const value = await native()?.sleepDeadline();
  return Number.isFinite(value) && value > 0 ? value : null;
}

export async function setSleepTimer(minutes: number) {
  if (![0, 15, 30, 60].includes(minutes)) throw Error('invalid_sleep_duration');
  if (!sleepSupported()) throw Error('sleep_unavailable');
  await native().setSleepTimer(minutes * 60000);
}

export async function clearSleepTimer() {
  if (sleepSupported()) await native().setSleepTimer(0);
}
