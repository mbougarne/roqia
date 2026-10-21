import {NativeModules, Platform} from 'react-native';

import data from './sounds.data.json';
import {readRecord, saveRecord} from '../../repositories/database';

type BundledSound = {
  resource: string;
  bytes: number;
  sha256: string;
  duration: number;
};

export type AdhanSound = {
  id: string;
  title: string;
  kind: 'full' | 'short';
  bundled: BundledSound;
};

export const sounds = data as AdhanSound[];

export const adhanNative = () =>
  ['android', 'ios'].includes(Platform.OS)
    ? NativeModules?.RoqiaPrayer
    : undefined;

export const bundledSoundAvailable = (sound: AdhanSound) =>
  !!sound.bundled && !!adhanNative()?.prepareBundledAdhan;

export type SoundSelection = {normal: string | null; fajr: string | null};

export const selectedSounds = async (): Promise<SoundSelection> =>
  (await readRecord<SoundSelection>('prayer', 'sounds')) ?? {
    normal: null,
    fajr: null,
  };

export async function selectSound(
  sound: AdhanSound,
  variant: keyof SoundSelection | 'all' = 'normal',
) {
  if (!(await localSound(sound))) throw Error('bundled_adhan_unavailable');
  await saveRecord(
    'prayer',
    'sounds',
    variant === 'all'
      ? {normal: sound.id, fajr: sound.id}
      : {...(await selectedSounds()), [variant]: sound.id},
  );
}

export type LocalSound = {
  path: string;
  bytes: number;
  sha256: string;
  title: string;
  kind: 'full' | 'short';
};

export async function localSound(
  sound: AdhanSound,
): Promise<LocalSound | null> {
  if (sound.bundled && bundledSoundAvailable(sound)) {
    const {resource, bytes, sha256} = sound.bundled;
    const path = await adhanNative().prepareBundledAdhan(
      resource,
      bytes,
      sha256,
    );
    return {
      path,
      bytes,
      sha256,
      title: sound.title,
      kind: sound.kind ?? 'full',
    };
  }
  return null;
}

export async function adhanCapability() {
  const native = adhanNative();
  if (!native?.adhanStatus)
    return {
      exact: false,
      notifications: false,
      normal: null,
      fajr: null,
      events: [] as {id: string}[],
    };
  const [status, selected] = await Promise.all([
    native.adhanStatus(),
    selectedSounds(),
  ]);
  const resolve = async (variant: 'normal' | 'fajr') => {
    const sound = sounds.find(s => s.id === selected[variant]);
    return sound ? localSound(sound).catch(() => null) : null;
  };
  return {
    ...status,
    events: (JSON.parse(status.events) as {id: string}[]).filter(
      e => e.id !== 'roqia-prayer:test',
    ),
    normal: await resolve('normal'),
    fajr: await resolve('fajr'),
  } as {
    exact: boolean;
    notifications: boolean;
    events: {id: string}[];
    normal: LocalSound | null;
    fajr: LocalSound | null;
  };
}
