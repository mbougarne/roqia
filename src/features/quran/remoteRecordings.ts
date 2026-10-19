import {FileSystem} from 'react-native-file-access';

import {chapters, type Recording} from './domain';
import data from './remote-recordings.data.json';
import {
  ensureDirectory,
  privatePath,
  removeIfPresent,
} from '../../platform/files';
import {type Pack, isPublisherAudioUrl} from '../downloads/types';

export type RemoteRecording = {
  id: string;
  read: number;
  reciterId: number;
  title: string;
  label: string;
  riwaya: 'warsh' | 'hafs';
  folder: string;
  surahs: number[];
  sourceUrl: string;
  timingAvailable: boolean;
};

export const remoteRecordings: RemoteRecording[] = data.recordings.map(r => ({
  ...r,
  riwaya: r.riwaya as RemoteRecording['riwaya'],
  surahs: r.surahs.split(',').map(Number),
}));
const pending = new Map<string, Promise<Recording>>();

export function remoteAudioUrl(recording: RemoteRecording, surah: number) {
  if (
    !recording.surahs.includes(surah) ||
    !Number.isInteger(surah) ||
    !chapters[surah - 1] ||
    !isPublisherAudioUrl(
      recording.folder + String(surah).padStart(3, '0') + '.mp3',
    )
  )
    throw Error('unavailable_audio');
  return recording.folder + String(surah).padStart(3, '0') + '.mp3';
}

// Intake is lazy: the catalog never downloads a recording merely to list a reciter.
// The first complete publisher download pins its own hash in the durable job.
export function prepareRemoteRecording(
  source: RemoteRecording,
  surah: number,
  existing?: Recording,
): Promise<Recording> {
  const key = source.id + ':' + surah;
  if (existing?.chapters.some(c => c.surah === surah))
    return Promise.resolve(existing);
  if (pending.has(key)) return pending.get(key)!;
  const promise = (async () => {
    const url = remoteAudioUrl(source, surah);
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 15000);
    let response: Response;
    try {
      response = await fetch(url, {method: 'HEAD', signal: controller.signal});
    } finally {
      clearTimeout(timer);
    }
    const bytes = Number(response.headers.get('content-length'));
    if (
      !response.ok ||
      !Number.isSafeInteger(bytes) ||
      bytes < 128 ||
      bytes > 2 * 1024 ** 3 ||
      (response.url && !isPublisherAudioUrl(response.url))
    )
      throw Error('audio_metadata_unavailable');
    const description = JSON.stringify({
      read: source.read,
      surah,
      url,
      bytes,
      etag: response.headers.get('etag'),
      modified: response.headers.get('last-modified'),
    });
    await ensureDirectory(privatePath('staging'));
    const path = privatePath(`staging/metadata-${source.read}-${surah}.json`);
    let hash: string;
    try {
      await FileSystem.writeFile(path, description, 'utf8');
      hash = await FileSystem.hash(path, 'SHA-256');
    } finally {
      await removeIfPresent(path);
    }
    const pack: Pack = {
      id: source.id + '-' + String(surah).padStart(3, '0'),
      version: 'publisher-' + hash.slice(0, 16),
      title: source.title + ' · ' + chapters[surah - 1].name,
      review: 'approved',
      manifestHash: hash,
      capabilities: ['audio'],
      sourceMetadata: {
        publisher: 'MP3Quran',
        sourceUrl: source.sourceUrl,
        reciterId: String(source.reciterId),
        recordingId: String(source.read),
        riwaya: source.riwaya,
        rightsUrl: 'https://www.mp3quran.net/ar/privacy',
        checksumPolicy: 'pin-after-https-download',
      },
      assets: [
        {
          id: 'audio',
          file: 'audio.mp3',
          url,
          bytes,
          sha256: '',
          pinAfterDownload: true,
          mime: 'audio/mpeg',
        },
      ],
    };
    return {
      id: source.id,
      title: source.title,
      riwaya: source.riwaya,
      tariq: null,
      quality: source.label,
      notice:
        'المصدر: MP3Quran · التسجيل الأصلي دون تعديل. https://www.mp3quran.net/ar/privacy',
      chapters: [
        ...(existing?.chapters ?? []),
        {surah, pack, assetId: 'audio'},
      ],
    };
  })().finally(() => pending.delete(key));
  pending.set(key, promise);
  return promise;
}
