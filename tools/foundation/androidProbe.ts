/* Debug-only validation against the same production coordinator/native ports.
 * Uses isolated SQLite collections and unique fixture file IDs; never resets user data.
 */
import {NativeModules} from 'react-native';
import {open} from '@op-engineering/op-sqlite';
import {FileSystem} from 'react-native-file-access';
import {DownloadCoordinator} from '../../src/features/downloads/coordinator';
import {nativeDownloadPorts} from '../../src/features/downloads/native';
import {
  type Pack,
  type DownloadJob,
  type InstalledPack,
  type InstallJournal,
} from '../../src/features/downloads/types';
import {
  listRecords,
  putRecord,
  write,
  readRecord,
} from '../../src/repositories/database';
import {
  getSettings,
  loadPersistedAppState,
} from '../../src/services/persistence';
import {privatePath} from '../../src/platform/files';
import TrackPlayer from 'react-native-track-player';
import {ensurePlayer} from '../../src/features/audio/controller';
const log = (event: string, detail: object) =>
  NativeModules.RoqiaProbe.record(event, JSON.stringify(detail));
const wait = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));
async function until(check: () => boolean) {
  for (let i = 0; i < 90; i++) {
    if (check()) return;
    await wait(500);
  }
  throw Error('probe_timeout');
}
export async function foundationProbe(scenario: string) {
  const bookmarksBefore = JSON.stringify(await listRecords('bookmarks'));
  const state = await loadPersistedAppState(),
    settings = await getSettings();
  log('foundation-migration', {
    counters: Object.keys(state.repeatCounts).length,
    theme: state.mode,
    onboarding: settings.onboardingVersion,
    guidance: settings.guidanceSeen,
    receipt: await readRecord('migrations', 'legacy-v2'),
  });
  const db = open({name: 'foundation-probe.sqlite'});
  await db.execute(
    'CREATE TABLE IF NOT EXISTS test(id INTEGER PRIMARY KEY,value TEXT)',
  );
  await db.execute('INSERT OR REPLACE INTO test VALUES(1,?)', ['before']);
  try {
    await db.transaction(async tx => {
      await tx.execute('UPDATE test SET value=? WHERE id=1', ['incorrect']);
      throw Error('intentional');
    });
  } catch {}
  const rollback = (await db.execute('SELECT value FROM test WHERE id=1'))
    .rows[0].value;
  await db.closeAsync();
  const reopened = open({name: 'foundation-probe.sqlite'});
  const reopen = (await reopened.execute('SELECT value FROM test WHERE id=1'))
    .rows[0].value;
  await reopened.closeAsync();
  if (rollback !== 'before' || reopen !== 'before')
    throw Error('native_sqlite_transaction_failed');
  log('foundation-sqlite', {rollback, reopen});
  const manifest = await (await fetch('http://127.0.0.1:8083/manifest')).json();
  const pack: Pack = {
    id: 'foundation-probe',
    version: '1',
    title: 'Synthetic fixture',
    manifestHash: manifest.sha256,
    review: 'approved',
    capabilities: ['fixture'],
    sourceMetadata: {source: 'local-debug-fixture'},
    assets: [
      {
        id: 'data',
        file: 'data.json',
        url: 'http://127.0.0.1:8083/file',
        bytes: manifest.bytes,
        sha256: manifest.sha256,
        mime: 'application/json',
      },
      {
        id: 'audio',
        file: 'audio.mp3',
        url: 'http://127.0.0.1:8083/audio',
        bytes: manifest.audioBytes,
        sha256: manifest.audioHash,
        mime: 'audio/mpeg',
      },
    ],
  };
  const ports = {
    ...nativeDownloadPorts,
    load: async () => ({
      jobs: await listRecords<DownloadJob>('probe-downloads'),
      installed: await listRecords<InstalledPack>('probe-installed'),
      journals: await listRecords<InstallJournal>('probe-journals'),
    }),
    commit: async (
      jobs: DownloadJob[],
      installed: InstalledPack[],
      journals: InstallJournal[],
    ) =>
      write(async tx => {
        for (const c of [
          'probe-downloads',
          'probe-installed',
          'probe-journals',
        ])
          await tx.execute('DELETE FROM records WHERE collection=?', [c]);
        for (const j of jobs)
          await putRecord(tx, 'probe-downloads', j.jobId, j);
        for (const p of installed)
          await putRecord(tx, 'probe-installed', p.packId, p);
        for (const j of journals)
          await putRecord(tx, 'probe-journals', j.packId, j);
      }),
    existing: async () =>
      (await nativeDownloadPorts.existing()).filter(t =>
        t.id.startsWith('roqia.foundation-probe.'),
      ),
  };
  const coordinator = new DownloadCoordinator([pack], ports, true);
  await coordinator.initialize();
  if (scenario === 'foundation-pause') {
    await coordinator.enqueue(pack.id, pack.version);
    for (const job of coordinator.listJobs())
      if (['removed', 'failed', 'cancelled', 'paused_user'].includes(job.state))
        await coordinator.resume(job.jobId);
    await until(() =>
      coordinator
        .listJobs()
        .some(j => j.assetId === 'data' && j.bytesReceived > 0),
    );
    const job = coordinator.listJobs().find(j => j.assetId === 'data')!;
    await coordinator.pause(job.jobId);
    log('foundation-paused', {jobs: coordinator.listJobs()});
    return;
  }
  if (scenario === 'foundation-resume') {
    const paused = coordinator.listJobs().find(j => j.assetId === 'data');
    if (paused?.state !== 'paused_user') throw Error('lost_user_pause');
    log('foundation-recovered-pause', {state: paused.state});
    await coordinator.resume(paused.jobId);
  } else {
    await coordinator.enqueue(pack.id, pack.version);
    for (const job of coordinator.listJobs())
      if (['removed', 'failed', 'cancelled'].includes(job.state))
        await coordinator.resume(job.jobId);
  }
  await until(
    () =>
      coordinator.listInstalled().some(p => p.state === 'ready') ||
      coordinator.listJobs().some(j => j.state === 'failed'),
  );
  const installed = coordinator.listInstalled()[0];
  if (!installed || installed.state !== 'ready')
    throw Error(JSON.stringify(coordinator.listJobs()));
  log('foundation-installed', {
    jobs: coordinator.listJobs(),
    installed,
    usage: await coordinator.usage(),
  });
  await ensurePlayer();
  await TrackPlayer.reset();
  await TrackPlayer.add({
    id: 'probe-file',
    url: `file://${privatePath('content/foundation-probe/1/audio.mp3')}`,
    title: 'Fixture playback',
  });
  await TrackPlayer.play();
  await wait(1500);
  await TrackPlayer.pause();
  log('foundation-before-delete', {
    state: await TrackPlayer.getPlaybackState(),
    progress: await TrackPlayer.getProgress(),
  });
  await coordinator.deletePack(pack.id, pack.version);
  const queue = await TrackPlayer.getQueue();
  if (
    queue.length ||
    (await FileSystem.exists(
      privatePath('content/foundation-probe/1/audio.mp3'),
    ))
  )
    throw Error('active_delete_failed');
  log('foundation-deleted', {
    queueLength: queue.length,
    usage: await coordinator.usage(),
    bookmarksRetained:
      bookmarksBefore === JSON.stringify(await listRecords('bookmarks')),
  });
}
