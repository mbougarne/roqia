import {sleepDeadline, setSleepTimer, clearSleepTimer} from './sleep';
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
import {NativeModules, Platform} from 'react-native';

export const segmentPlaybackSupported = () =>
  Platform.OS === 'android' &&
  NativeModules.RoqiaAudio?.segmentPlayback === true;
export type DownloadedAudioEntry = {
  packId: string;
  version: string;
  assetId: string;
  title: string;
  segment?: {verse: number; startMs: number; endMs: number};
};

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
      await TrackPlayer.setupPlayer({autoHandleInterruptions: false});
    } catch (e) {
      if ((e as {code?: string}).code !== 'player_already_initialized') throw e;
    }
    await TrackPlayer.updateOptions({
      android: {
        alwaysPauseOnInterruption: true,
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
    const value = await fn();
    await persistSnapshot();
    return value;
  });
  tail = result.catch(() => report('تعذر تشغيل الصوت. حاول مرة أخرى.'));
  return result.catch(() => undefined);
}
async function toggle() {
  const {state} = await TrackPlayer.getPlaybackState();
  if ([State.Playing, State.Buffering, State.Loading].includes(state))
    await TrackPlayer.pause();
  else {
    if (state === State.Ended) await TrackPlayer.seekTo(0);
    await TrackPlayer.play();
  }
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
      // Keep the require() handle: RNTP resolves packaged Android raw resources.
      // RNTP alpha declares AddTrack as an intersection with Track's string URL;
      // its add() implementation explicitly accepts numeric imported assets.
      url: asset as unknown as AddTrack['url'],
      artist: 'الرقية الشرعية',
      scope,
      assetVersion: 'bundled-v1',
    };
  });
export const playback = {
  downloaded: (
    entries: DownloadedAudioEntry[],
    options: {
      paused?: boolean;
      position?: number;
      index?: number;
      isCurrent?: () => boolean;
    } = {},
  ) =>
    command(async () => {
      const queue: AddTrack[] = [];
      for (const entry of entries) {
        const segment = entry.segment;
        if (
          segment &&
          (!segmentPlaybackSupported() ||
            ![segment.verse, segment.startMs, segment.endMs].every(
              Number.isSafeInteger,
            ) ||
            segment.verse < 1 ||
            segment.startMs < 0 ||
            segment.endMs <= segment.startMs)
        )
          throw Error('invalid_audio_segment');
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
          id: job.jobId + (segment ? `:verse:${segment.verse}` : ''),
          url: `file://${path}`,
          title: entry.title + (segment ? ` · الآية ${segment.verse}` : ''),
          ...(segment
            ? {roqiaClipStartMs: segment.startMs, roqiaClipEndMs: segment.endMs}
            : {}),
          assetVersion: entry.version,
          scope: entry.packId,
          queueMode: 'all',
          downloadEntry: entry,
        });
      }
      // Reader requests may be dismissed or superseded while the local file is
      // being verified. Leave existing playback intact when that intent expires.
      if (!queue.length || options.isCurrent?.() === false) return;
      await TrackPlayer.reset();
      await TrackPlayer.setRepeatMode(RepeatMode.Off);
      await TrackPlayer.add(queue);
      if (options.index !== undefined) await TrackPlayer.skip(options.index);
      if (options.position !== undefined) {
        const segment = entries[options.index ?? 0]?.segment;
        await TrackPlayer.seekTo(
          Math.max(
            0,
            Math.min(
              options.position,
              segment ? (segment.endMs - segment.startMs) / 1000 : Infinity,
            ),
          ),
        );
      }
      if (options.isCurrent?.() === false) return;
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
    }),
  repeat: (value: RepeatMode) =>
    command(async () => {
      if (![RepeatMode.Off, RepeatMode.Track, RepeatMode.Queue].includes(value))
        throw Error('invalid_repeat');
      await TrackPlayer.setRepeatMode(value);
    }),
  sleep: (minutes: number) =>
    command(async () => {
      if (minutes && !(await TrackPlayer.getActiveTrack()))
        throw Error('no_active_track');
      await setSleepTimer(minutes);
    }),
  toggle: () => command(toggle),
  play: () =>
    command(async () => {
      if ((await TrackPlayer.getPlaybackState()).state === State.Ended)
        await TrackPlayer.seekTo(0);
      await TrackPlayer.play();
    }),
  pause: () =>
    command(async () => {
      await TrackPlayer.pause();
    }),
  stop: () =>
    command(async () => {
      await TrackPlayer.reset();
      await clearSleepTimer();
      await saveRecord('playback', 'session', null);
    }),
  next: () => command(() => TrackPlayer.skipToNext()),
  previous: () => command(() => TrackPlayer.skipToPrevious()),
  seek: (seconds: number) =>
    command(async () => {
      if (Number.isFinite(seconds) && seconds >= 0) {
        await TrackPlayer.seekTo(seconds);
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
        ) {
          await TrackPlayer.reset();
          await clearSleepTimer();
          await saveRecord('playback', 'session', null);
        }
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
async function persistSnapshot() {
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
    sleepDeadlineUtc: await sleepDeadline(),
    updatedAt: Date.now(),
  });
}
export function persistPlayback() {
  const result = tail.then(persistSnapshot);
  tail = result.catch(() => undefined);
  return result;
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
