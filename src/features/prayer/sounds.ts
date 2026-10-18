import {NativeModules, Platform} from 'react-native';
import type {Pack, InstalledPack, DownloadJob} from '../downloads/types';
import {listRecords, readRecord, saveRecord} from '../../repositories/database';

import data from './sounds.data.json';
export type AdhanSound = {
  id: string;
  variant: 'normal' | 'fajr';
  title: string;
  notice: string;
  pack: Pack;
};
export const sounds = data as AdhanSound[];
export const adhanNative = () =>
  Platform.OS === 'android' ? NativeModules?.RoqiaPrayer : undefined;
export type SoundSelection = {normal: string | null; fajr: string | null};
export const selectedSounds = async (): Promise<SoundSelection> =>
  (await readRecord<SoundSelection>('prayer', 'sounds')) ?? {
    normal: null,
    fajr: null,
  };
export async function selectSound(sound: AdhanSound) {
  await saveRecord('prayer', 'sounds', {
    ...(await selectedSounds()),
    [sound.variant]: sound.id,
  });
}
export type LocalSound = {
  path: string;
  bytes: number;
  sha256: string;
  title: string;
};
export async function localSound(
  sound: AdhanSound,
): Promise<LocalSound | null> {
  const installed = await listRecords<InstalledPack>('installed');
  const pack = installed.find(
    p =>
      p.packId === sound.pack.id &&
      p.version === sound.pack.version &&
      p.state === 'ready' &&
      p.manifestHash === sound.pack.manifestHash,
  );
  if (!pack) return null;
  const asset = sound.pack.assets[0];
  const job = (await listRecords<DownloadJob>('downloads')).find(
    j =>
      j.packId === pack.packId &&
      j.version === pack.version &&
      j.assetId === asset.id &&
      j.state === 'ready',
  );
  return job
    ? {
        path: require('../../platform/files').privatePath(
          job.relativeFinalPath,
        ),
        bytes: asset.bytes,
        sha256: asset.sha256,
        title: sound.title,
      }
    : null;
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
    const sound = sounds.find(
      s => s.id === selected[variant] && s.variant === variant,
    );
    return sound ? localSound(sound) : null;
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
