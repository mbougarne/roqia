import {NativeModules, Platform} from 'react-native';
import type {Pack, InstalledPack, DownloadJob} from '../downloads/types';
import {listRecords, readRecord, saveRecord} from '../../repositories/database';

import data from './sounds.data.json';
type BundledSound = {
  resource: string;
  bytes: number;
  sha256: string;
  duration: number;
  sourceMetadata: Record<string, string>;
};
export type AdhanSound = {
  id: string;
  variant: 'normal' | 'fajr';
  title: string;
  notice: string;
  kind?: 'full' | 'short';
} & (
  | {pack: Pack; bundled?: BundledSound}
  | {pack?: undefined; bundled: BundledSound}
);
export const sounds = data as AdhanSound[];
export const adhanNative = () =>
  Platform.OS === 'android' ? NativeModules?.RoqiaPrayer : undefined;
export const bundledSoundAvailable = (sound: AdhanSound) =>
  !!sound.bundled && !!adhanNative()?.prepareBundledAdhan;
export const soundSource = (sound: AdhanSound) =>
  sound.bundled?.sourceMetadata ?? sound.pack!.sourceMetadata;
export type SoundSelection = {normal: string | null; fajr: string | null};
export const selectedSounds = async (): Promise<SoundSelection> =>
  (await readRecord<SoundSelection>('prayer', 'sounds')) ?? {
    normal: null,
    fajr: null,
  };
export async function selectSound(sound: AdhanSound) {
  if (sound.bundled && !(await localSound(sound)))
    throw Error('bundled_adhan_unavailable');
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
  const descriptor = sound.pack;
  if (!descriptor) return null;
  const installed = await listRecords<InstalledPack>('installed');
  const pack = installed.find(
    p =>
      p.packId === descriptor.id &&
      p.version === descriptor.version &&
      p.state === 'ready' &&
      p.manifestHash === descriptor.manifestHash,
  );
  if (!pack) return null;
  const asset = descriptor.assets[0];
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
        kind: sound.kind ?? 'full',
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
