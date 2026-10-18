import {Image} from 'react-native';
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  State,
  RepeatMode,
  type AddTrack,
} from 'react-native-track-player';
import {audioAssets} from '../../assets/audio';
import {type DataProps} from '../../data';
import {devotionalQueue} from './queue';
import {saveRecord, readRecord} from '../../repositories/database';
import {type InstalledPack, type DownloadJob} from '../downloads/types';
import {privatePath} from '../../platform/files';
import {FileSystem} from 'react-native-file-access';

let setup: Promise<void> | undefined,
  tail: Promise<unknown> = Promise.resolve();
let error: string | null = null;
const listeners = new Set<() => void>();
export const audioErrors = {
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => error,
};
const report = (value: string | null) => {
  error = value;
  listeners.forEach(fn => fn());
};
export function ensurePlayer() {
  return (setup ??= (async () => {
    try {
      await TrackPlayer.setupPlayer();
    } catch (e) {
      if ((e as {code?: string}).code !== 'player_already_initialized') throw e;
    }
    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
      },
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.Stop,
        Capability.SeekTo,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
      ],
      progressUpdateEventInterval: 5,
    });
  })().catch(e => {
    setup = undefined;
    throw e;
  }));
}
function command<T>(fn: () => Promise<T>): Promise<T | undefined> {
  const result = tail.then(async () => {
    await ensurePlayer();
    report(null);
    return fn();
  });
  tail = result.catch(() => report('تعذر تشغيل الصوت. حاول مرة أخرى.'));
  return result.catch(() => undefined);
}
async function toggle() {
  const {state} = await TrackPlayer.getPlaybackState();
  if ([State.Playing, State.Buffering, State.Loading].includes(state))
    await TrackPlayer.pause();
  else await TrackPlayer.play();
  await persistPlayback();
}
const tracksFor = (
  items: DataProps[],
  scope: string,
  repeat = true,
): AddTrack[] =>
  devotionalQueue(items, repeat).map(entry => {
    const asset = audioAssets[entry.audioFile];
    if (!asset) throw new Error('missing_bundled_audio');
    return {
      ...entry,
      url: Image.resolveAssetSource(asset).uri,
      artist: 'الرقية الشرعية',
      scope,
      assetVersion: 'bundled-v1',
    };
  });
export const playback = {
  downloaded: (
    entries: {
      packId: string;
      version: string;
      assetId: string;
      title: string;
    }[],
    options: {paused?: boolean; position?: number; index?: number} = {},
  ) =>
    command(async () => {
      const queue: AddTrack[] = [];
      for (const entry of entries) {
        const pack = await readRecord<InstalledPack>(
          'installed',
          `${entry.packId}@${entry.version}`,
        );
        const job = await readRecord<DownloadJob>(
          'downloads',
          `${entry.packId}.${entry.assetId}@${entry.version}`,
        );
        if (
          !pack ||
          pack.state !== 'ready' ||
          !pack.capabilities.includes('audio') ||
          !job ||
          job.state !== 'ready' ||
          !pack.files.includes(job.relativeFinalPath)
        )
          throw Error('audio_not_installed');
        const path = privatePath(job.relativeFinalPath);
        if (
          !(await FileSystem.exists(path)) ||
          (await FileSystem.stat(path)).size !== job.expectedBytes ||
          (await FileSystem.hash(path, 'SHA-256')) !== job.expectedHash
        )
          throw Error('audio_integrity_failed');
        queue.push({
          id: job.jobId,
          url: `file://${path}`,
          title: entry.title,
          assetVersion: entry.version,
          scope: entry.packId,
          queueMode: 'all',
          downloadEntry: entry,
        });
      }
      if (!queue.length) return;
      await TrackPlayer.reset();
      await TrackPlayer.add(queue);
      if (options.index !== undefined) await TrackPlayer.skip(options.index);
      if (options.position !== undefined)
        await TrackPlayer.seekTo(Math.max(0, options.position));
      if (options.paused) await TrackPlayer.pause();
      else await TrackPlayer.play();
      return true;
    }),
  single: (items: DataProps[], scope: string, file: string) =>
    command(async () => {
      const entries = tracksFor(items, scope, false),
        selected = entries.find(t => t.audioFile === file);
      if (!selected) throw new Error('unknown_audio');
      const active = await TrackPlayer.getActiveTrack();
      if (active?.audioFile === file && active?.scope === scope)
        return toggle();
      await TrackPlayer.reset();
      await TrackPlayer.add({...selected, queueMode: 'single'});
      await TrackPlayer.play();
    }),
  all: (items: DataProps[], scope: string) =>
    command(async () => {
      const active = await TrackPlayer.getActiveTrack();
      if (active?.scope === scope && active?.queueMode === 'all')
        return toggle();
      const queue = tracksFor(items, scope).map(t => ({
        ...t,
        queueMode: 'all',
      }));
      if (!queue.length) return;
      await TrackPlayer.reset();
      await TrackPlayer.add(queue);
      await TrackPlayer.play();
    }),
  rate: (value: number) =>
    command(async () => {
      if (![0.75, 1, 1.25, 1.5].includes(value)) throw Error('invalid_rate');
      await TrackPlayer.setRate(value);
      await persistPlayback();
    }),
  repeat: (value: RepeatMode) =>
    command(async () => {
      if (![RepeatMode.Off, RepeatMode.Track, RepeatMode.Queue].includes(value))
        throw Error('invalid_repeat');
      await TrackPlayer.setRepeatMode(value);
      await persistPlayback();
    }),
  toggle: () => command(toggle),
  play: () => command(() => TrackPlayer.play()),
  pause: () =>
    command(async () => {
      await TrackPlayer.pause();
      await persistPlayback();
    }),
  stop: () =>
    command(async () => {
      await TrackPlayer.reset();
      await saveRecord('playback', 'session', null);
    }),
  next: () => command(() => TrackPlayer.skipToNext()),
  previous: () => command(() => TrackPlayer.skipToPrevious()),
  seek: (seconds: number) =>
    command(async () => {
      if (Number.isFinite(seconds) && seconds >= 0) {
        await TrackPlayer.seekTo(seconds);
        await persistPlayback();
      }
    }),
  // Deletion and queue changes use the same lock. Paused tracks and queued tracks count as users of a file.
  releaseFiles: async (paths: string[], remove: () => Promise<void>) => {
    const result = tail.then(async () => {
      try {
        const queue = await TrackPlayer.getQueue();
        if (
          queue.some(track =>
            paths.some(
              path => String(track.url).replace('file://', '') === path,
            ),
          )
        )
          await TrackPlayer.reset();
      } catch (error) {
        if ((error as {code?: string}).code !== 'player_not_initialized')
          throw error;
      }
      await remove();
    });
    tail = result.catch(() => undefined);
    return result;
  },
};
export async function persistPlayback() {
  const track = await TrackPlayer.getActiveTrack();
  if (!track) return;
  const queue = await TrackPlayer.getQueue(),
    progress = await TrackPlayer.getProgress();
  await saveRecord('playback', 'session', {
    trackKey: track.id,
    assetVersion: track.assetVersion,
    queueTrackKeys: queue.map(t => t.id),
    downloadEntries: queue.every(t => t.downloadEntry)
      ? queue.map(t => t.downloadEntry)
      : null,
    activeIndex: queue.findIndex(t => t.id === track.id),
    positionMs: Math.round(progress.position * 1000),
    repeatMode: await TrackPlayer.getRepeatMode(),
    speed: await TrackPlayer.getRate(),
    sleepDeadlineUtc: null,
    updatedAt: Date.now(),
  });
}
export function playbackFailed() {
  report('تعذر تشغيل الصوت. أعد المحاولة أو اختر مقطعاً آخر.');
}

export async function restoreDownloadedSession() {
  const saved = await readRecord<{
    downloadEntries: Parameters<typeof playback.downloaded>[0] | null;
    activeIndex: number;
    positionMs: number;
    speed: number;
    repeatMode: RepeatMode;
  }>('playback', 'session');
  if (
    !saved?.downloadEntries?.length ||
    !Number.isInteger(saved.activeIndex) ||
    saved.activeIndex < 0 ||
    saved.activeIndex >= saved.downloadEntries.length ||
    !Number.isFinite(saved.positionMs)
  )
    throw Error('no_download_session');
  const restored = await playback.downloaded(saved.downloadEntries, {
    paused: true,
    index: saved.activeIndex,
    position: saved.positionMs / 1000,
  });
  // A failed integrity check must not change settings or overwrite the saved session.
  if (!restored) throw Error('audio_restore_failed');
  await playback.rate(
    [0.75, 1, 1.25, 1.5].includes(saved.speed) ? saved.speed : 1,
  );
  await playback.repeat(
    [RepeatMode.Off, RepeatMode.Track, RepeatMode.Queue].includes(
      saved.repeatMode,
    )
      ? saved.repeatMode
      : RepeatMode.Off,
  );
}
