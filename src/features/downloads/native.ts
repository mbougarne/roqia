import {type DownloadTask} from '@kesha-antonov/react-native-background-downloader';
import {AppState, NativeModules, Platform} from 'react-native';
import {FileSystem} from 'react-native-file-access';

import {catalog} from './catalog';
import {
  DownloadCoordinator,
  type DownloadPorts,
  type Events,
  type Task,
} from './coordinator';
import {
  type DownloadJob,
  type InstalledPack,
  type InstallJournal,
  type LocalAsset,
} from './types';
import {validateCatalog} from './types';
import {
  ensureDirectory,
  ensurePrivateRoot,
  privatePath,
  removeIfPresent,
} from '../../platform/files';
import {listRecords, putRecord, write} from '../../repositories/database';
import {playback} from '../audio/controller';
import {quranCatalog} from '../quran/catalog';
import {type Recording, validateQuranCatalog} from '../quran/domain';

// Lazy native import keeps an unavailable transport from disabling offline devotional content.
const transport = () =>
  require('@kesha-antonov/react-native-background-downloader') as typeof import('@kesha-antonov/react-native-background-downloader');

function attach(task: Task, events: Events) {
  (task as DownloadTask)
    .begin(e => events.begin(e.headers))
    .progress(e => events.progress(e.bytesDownloaded))
    .done(() => events.done())
    .error(e => events.error(String(e.errorCode)));
}

async function verify(relative: string, asset: LocalAsset) {
  const path = privatePath(relative),
    stat = await FileSystem.stat(path);
  if (
    stat.type !== 'file' ||
    stat.size !== asset.bytes ||
    (await FileSystem.hash(path, 'SHA-256')) !== asset.sha256
  )
    throw Error('integrity_failed');
  const header = await FileSystem.readFileChunk(
    path,
    0,
    Math.min(16, asset.bytes),
    'base64',
  );
  // Base64 signatures are sufficient here because exact reviewed SHA-256 and size must also match.
  if (asset.mime === 'audio/mpeg' && !/^(SUQz|\/\/|\/\+|\/w)/.test(header))
    throw Error('media_signature_failed');
  if (asset.mime === 'font/ttf' && !header.startsWith('AAEAAA'))
    throw Error('font_signature_failed');
  if (asset.mime === 'font/otf' && !header.startsWith('T1RUTw'))
    throw Error('font_signature_failed');
  if (asset.mime === 'application/zip' && !header.startsWith('UEsDB'))
    throw Error('zip_signature_failed');
  if (asset.mime === 'application/json') {
    if (asset.bytes > 32 * 1024 * 1024) throw Error('json_too_large');
    const value = JSON.parse(await FileSystem.readFile(path, 'utf8'));
    if (!value || typeof value !== 'object')
      throw Error('json_structure_failed');
  }
}

export const nativeDownloadPorts: DownloadPorts = {
  sha256: relative => FileSystem.hash(privatePath(relative), 'SHA-256'),
  resumable: Platform.OS === 'android',
  bundled: pack =>
    pack.version === 'source-1' &&
    (pack.id !== 'quran-warsh' || !!NativeModules.RoqiaReader?.extractSource) &&
    [
      'quran-warsh',
      'translation-fr.hamidullah',
      'translation-en.pickthall',
    ].includes(pack.id),
  copyBundled: async (pack, asset, target) => {
    await ensurePrivateRoot();
    await ensureDirectory(privatePath('staging'));
    await removeIfPresent(privatePath(target));
    await FileSystem.cpAsset(
      `roqia-offline/${pack.id}/${pack.version}/${asset.file}`,
      privatePath(target),
    );
  },
  sync:
    Platform.OS === 'android'
      ? paths =>
          NativeModules.RoqiaDownloadFiles.syncFiles(paths.map(privatePath))
      : undefined,
  load: async () => ({
    jobs: await listRecords<DownloadJob>('downloads'),
    installed: await listRecords<InstalledPack>('installed'),
    journals: await listRecords<InstallJournal>('install-journals'),
  }),
  commit: async (jobs, installed, journals) =>
    write(async tx => {
      // A Quran pack has hundreds of assets. Keep each snapshot atomic while
      // writing only changed rows, rather than rewriting every job on progress.
      const collections: [string, [string, unknown][]][] = [
        ['downloads', jobs.map(j => [j.jobId, j])],
        ['installed', installed.map(p => [`${p.packId}@${p.version}`, p])],
        [
          'install-journals',
          journals.map(j => [`${j.packId}@${j.version}:${j.phase}`, j]),
        ],
      ];
      for (const [collection, records] of collections) {
        const existing = new Map(
          (
            await tx.execute(
              'SELECT id,value FROM records WHERE collection=?',
              [collection],
            )
          ).rows.map(row => [row.id as string, row.value as string]),
        );
        for (const [id, value] of records) {
          if (existing.get(id) !== JSON.stringify(value))
            await putRecord(tx, collection, id, value);
          existing.delete(id);
        }
        for (const id of existing.keys())
          await tx.execute('DELETE FROM records WHERE collection=? AND id=?', [
            collection,
            id,
          ]);
      }
    }),
  existing: async () => {
    await ensurePrivateRoot();
    await ensureDirectory(privatePath('staging'));
    return transport().getExistingDownloadTasks();
  },
  attach,
  start: (job, asset, events) => {
    const api = transport();
    api.setConfig({
      maxParallelDownloads: 2,
      progressInterval: 1000,
      showNotificationsEnabled: false,
      allowsCellularAccess: job.consentNetworkPolicy === 'any',
    });
    const task = api.createDownloadTask({
      id: job.nativeTaskId!,
      url: asset.url,
      destination: privatePath(job.relativeTempPath),
      headers:
        Platform.OS === 'android'
          ? {'X-Roqia-Expected-Bytes': String(asset.bytes)}
          : undefined,
      isAllowedOverMetered: job.consentNetworkPolicy === 'any',
      isAllowedOverRoaming: false,
      metadata: {jobId: job.jobId, generation: job.generation},
    });
    attach(task, events);
    task.start();
    return task;
  },
  exists: path => FileSystem.exists(privatePath(path)),
  size: async path =>
    (await FileSystem.exists(privatePath(path)))
      ? (await FileSystem.stat(privatePath(path))).size
      : 0,
  verify,
  prepare: (pack, directory) =>
    require('../quran/importSource').prepareSource(pack, directory),
  move: async (from, to) => {
    await ensureDirectory(privatePath(to.slice(0, to.lastIndexOf('/'))));
    if (Platform.OS === 'android')
      await NativeModules.RoqiaDownloadFiles.move(
        privatePath(from),
        privatePath(to),
      );
    else await FileSystem.mv(privatePath(from), privatePath(to));
    await removeIfPresent(privatePath(from + '.resume'));
    await removeIfPresent(privatePath(from + '.resume.tmp'));
  },
  remove: async path => {
    await removeIfPresent(privatePath(path));
    await removeIfPresent(privatePath(path + '.resume'));
    await removeIfPresent(privatePath(path + '.resume.tmp'));
  },
  free: async () => (await FileSystem.df()).internal_free,
  release: async (paths, remove) => {
    if (NativeModules?.RoqiaPrayer?.releaseAdhan)
      await NativeModules.RoqiaPrayer.releaseAdhan(
        JSON.stringify(paths.map(privatePath)),
      );
    await playback.releaseFiles(paths.map(privatePath), remove);
  },
  now: Date.now,
};

export const downloads = new DownloadCoordinator(catalog, nativeDownloadPorts);

let networkStarted = false;
let restoringAudio: Promise<void> | undefined;

export async function startDownloadServices() {
  await (restoringAudio ??= (async () => {
    for (const recording of await listRecords<Recording>(
      'quran-audio-recordings',
    )) {
      validateQuranCatalog({
        texts: [],
        translations: [],
        recordings: [recording],
      });
      validateCatalog(recording.chapters.map(c => c.pack));
      const known = quranCatalog.recordings.find(r => r.id === recording.id);
      if (!known) quranCatalog.recordings.push(recording);
      else
        for (const chapter of recording.chapters)
          if (!known.chapters.some(c => c.surah === chapter.surah))
            known.chapters.push(chapter);
      for (const chapter of recording.chapters)
        await downloads.register(chapter.pack);
    }
  })().catch(e => {
    restoringAudio = undefined;
    throw e;
  }));
  if (!networkStarted) {
    const NetInfo = require('@react-native-community/netinfo')
      .default as typeof import('@react-native-community/netinfo').default;
    NetInfo.configure({
      reachabilityShouldRun: () => false,
      shouldFetchWiFiSSID: false,
    });
    const update = (
      state: import('@react-native-community/netinfo').NetInfoState,
    ) =>
      downloads.networkChanged({
        connected: state.isConnected === true,
        wifi: state.type === 'wifi',
      });
    await update(await NetInfo.fetch());
    NetInfo.addEventListener(state => {
      void update(state).catch(() => undefined);
    });
    AppState.addEventListener('change', state => {
      if (state === 'active')
        void NetInfo.fetch()
          .then(update)
          .catch(() => undefined);
    });
    networkStarted = true;
  }
  await downloads.initialize();
}
