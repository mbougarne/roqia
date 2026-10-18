import {FileSystem} from 'react-native-file-access';
import {type DownloadTask} from '@kesha-antonov/react-native-background-downloader';
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
  type Asset,
} from './types';
import {
  ensureDirectory,
  ensurePrivateRoot,
  privatePath,
  removeIfPresent,
} from '../../platform/files';
import {listRecords, putRecord, write} from '../../repositories/database';
import {playback} from '../audio/controller';
import {catalog} from './catalog';

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
async function verify(relative: string, asset: Asset) {
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
  if (asset.mime === 'application/json') {
    if (asset.bytes > 32 * 1024 * 1024) throw Error('json_too_large');
    const value = JSON.parse(await FileSystem.readFile(path, 'utf8'));
    if (!value || typeof value !== 'object')
      throw Error('json_structure_failed');
  }
}
export const nativeDownloadPorts: DownloadPorts = {
  load: async () => ({
    jobs: await listRecords<DownloadJob>('downloads'),
    installed: await listRecords<InstalledPack>('installed'),
    journals: await listRecords<InstallJournal>('install-journals'),
  }),
  commit: async (jobs, installed, journals) =>
    write(async tx => {
      for (const collection of ['downloads', 'installed', 'install-journals'])
        await tx.execute('DELETE FROM records WHERE collection=?', [
          collection,
        ]);
      for (const job of jobs) await putRecord(tx, 'downloads', job.jobId, job);
      for (const pack of installed)
        await putRecord(
          tx,
          'installed',
          `${pack.packId}@${pack.version}`,
          pack,
        );
      for (const journal of journals)
        await putRecord(
          tx,
          'install-journals',
          `${journal.packId}@${journal.version}:${journal.phase}`,
          journal,
        );
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
  move: async (from, to) => {
    await ensureDirectory(privatePath(to.slice(0, to.lastIndexOf('/'))));
    await FileSystem.mv(privatePath(from), privatePath(to));
  },
  remove: path => removeIfPresent(privatePath(path)),
  free: async () => (await FileSystem.df()).internal_free,
  release: (paths, remove) =>
    playback.releaseFiles(paths.map(privatePath), remove),
  now: Date.now,
};
export const downloads = new DownloadCoordinator(catalog, nativeDownloadPorts);

let networkStarted = false;
export async function startDownloadServices() {
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
        unmetered: state.details?.isConnectionExpensive === false,
      });
    await update(await NetInfo.fetch());
    NetInfo.addEventListener(state => {
      void update(state).catch(() => undefined);
    });
    networkStarted = true;
  }
  await downloads.initialize();
}
