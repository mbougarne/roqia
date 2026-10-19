/* Opt-in debug harness; production ports/coordinator, isolated records and fixture-only files. */
import {NativeModules} from 'react-native';
import {FileSystem} from 'react-native-file-access';
import {DownloadCoordinator} from '../../src/features/downloads/coordinator';
import {nativeDownloadPorts} from '../../src/features/downloads/native';
import {
  type Pack,
  type DownloadJob,
  type InstalledPack,
  type InstallJournal,
} from '../../src/features/downloads/types';
import {listRecords, putRecord, write} from '../../src/repositories/database';
import {privatePath} from '../../src/platform/files';
const log = (event: string, detail: object) =>
  NativeModules.RoqiaProbe.record(event, JSON.stringify(detail));
const wait = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));
const hold = () => new Promise<void>(() => {});
async function until(test: () => boolean) {
  for (let i = 0; i < 180; i++) {
    if (test()) return;
    await wait(500);
  }
  throw Error('phase10_timeout');
}
export async function phase10Probe(scenario: string) {
  const recovering = scenario.startsWith('phase10-recover-');
  const mode = scenario.replace(/^phase10-(recover-)?/, '');
  if (mode === 'cleanup') {
    for (const task of await nativeDownloadPorts.existing())
      if (task.id.startsWith('roqia.phase10-')) await task.stop();
    const {privateRoot} = require('../../src/platform/files');
    for (const directory of ['staging', 'content']) {
      const parent = `${privateRoot}/${directory}`;
      for (const name of await FileSystem.ls(parent))
        if (name.startsWith('phase10-'))
          await FileSystem.unlink(`${parent}/${name}`);
    }
    await write(async tx => {
      await tx.execute("DELETE FROM records WHERE collection LIKE 'phase10-%'");
    });
    log('phase10-cleaned', {});
    return;
  }
  const manifest = await (await fetch('http://127.0.0.1:8084/manifest')).json();
  const pack: Pack = {
    id: 'phase10-' + mode,
    version: '1',
    title: 'Controlled transport fixture',
    review: 'approved',
    manifestHash: manifest.sha256,
    capabilities: ['fixture'],
    sourceMetadata: {source: 'local-controlled-fixture'},
    assets: [
      {
        id: 'data',
        file: 'data.json',
        url: 'http://127.0.0.1:8084/' + mode,
        bytes: manifest.bytes,
        sha256: manifest.sha256,
        mime: 'application/json',
      },
    ],
  };
  const prefix = pack.id;
  const ports = {
    ...nativeDownloadPorts,
    load: async () => ({
      jobs: await listRecords<DownloadJob>(prefix + '-jobs'),
      installed: await listRecords<InstalledPack>(prefix + '-installed'),
      journals: await listRecords<InstallJournal>(prefix + '-journals'),
    }),
    commit: async (
      jobs: DownloadJob[],
      installed: InstalledPack[],
      journals: InstallJournal[],
    ) => {
      if (
        !recovering &&
        mode === 'commit' &&
        installed.some(p => p.state === 'ready')
      ) {
        log('phase10-crash-window', {mode, jobs, installed, journals});
        await hold();
      }
      await write(async tx => {
        for (const [name, rows] of [
          [prefix + '-jobs', jobs],
          [prefix + '-installed', installed],
          [prefix + '-journals', journals],
        ] as [string, unknown[]][]) {
          await tx.execute('DELETE FROM records WHERE collection=?', [name]);
          for (let i = 0; i < rows.length; i++)
            await putRecord(tx, name, String(i), rows[i]);
        }
      });
    },
    existing: async () =>
      (await nativeDownloadPorts.existing()).filter(t =>
        t.id.startsWith('roqia.' + pack.id + '.'),
      ),
    move: async (from: string, to: string) => {
      if (!recovering && mode === 'before-rename') {
        log('phase10-crash-window', {mode, from, to});
        await hold();
      }
      await nativeDownloadPorts.move(from, to);
      if (!recovering && mode === 'after-rename') {
        log('phase10-crash-window', {mode, from, to});
        await hold();
      }
    },
    free: mode === 'no-space' ? async () => 0 : nativeDownloadPorts.free,
  };
  const c = new DownloadCoordinator([pack], ports, true);
  const NetInfo = require('@react-native-community/netinfo')
    .default as typeof import('@react-native-community/netinfo').default;
  const update = (s: import('@react-native-community/netinfo').NetInfoState) =>
    c.networkChanged({
      connected:
        ['native-wifi', 'any-network'].includes(mode) || s.isConnected === true,
      wifi: ['native-wifi', 'any-network'].includes(mode) || s.type === 'wifi',
    });
  await update(await NetInfo.fetch());
  NetInfo.addEventListener(s => {
    void update(s);
  });
  await c.initialize();
  if (!recovering) {
    await c.enqueue(pack.id, pack.version, mode !== 'any-network');
    if (mode === 'native-wifi')
      log('phase10-native-wifi-window', {jobs: c.listJobs()});
  }
  if (mode === 'user-pause' && recovering) {
    if (c.listJobs()[0].state !== 'paused_user') throw Error('user_pause_lost');
    log('phase10-user-pause-retained', {job: c.listJobs()[0]});
    await c.resume(c.listJobs()[0].jobId);
  }
  if (
    !recovering &&
    [
      'complete416',
      'last-modified',
      'no-validator',
      'stable',
      'range200',
      'changed',
      'wrong206',
      'range416',
      'user-pause',
      'cancel',
      'active-loss',
      'background',
      'network',
    ].includes(mode)
  ) {
    await until(() => c.listJobs()[0]?.bytesReceived > 262144);
    if (mode === 'active-loss') {
      log('phase10-active-loss', {job: c.listJobs()[0]});
      await hold();
    }
    if (mode === 'background') {
      log('phase10-background-window', {job: c.listJobs()[0]});
    } else if (mode === 'network') {
      log('phase10-network-window', {job: c.listJobs()[0]});
      await wait(12000);
    } else {
      await c.pause(c.listJobs()[0].jobId);
      log('phase10-paused', {
        mode,
        job: c.listJobs()[0],
        size: await ports.size(c.listJobs()[0].relativeTempPath),
      });
      if (mode === 'user-pause') {
        await hold();
      }
      if (mode === 'cancel') {
        await c.cancel(c.listJobs()[0].jobId);
        await wait(1000);
        if (await ports.exists(c.listJobs()[0].relativeTempPath))
          throw Error('cancel_left_bytes');
        log('phase10-cancelled', {jobs: c.listJobs()});
        return;
      }
      if (mode === 'complete416') {
        const result = await FileSystem.fetch('http://127.0.0.1:8084/full', {
          path: privatePath(c.listJobs()[0].relativeTempPath),
        });
        if (!result.ok) throw Error('fixture_full_fetch_failed');
        // Exercise native complete-file 416 directly; coordinator can otherwise install
        // a complete paused partial without issuing another HTTP request.
        const task = (await ports.existing())[0];
        await new Promise<void>((resolve, reject) => {
          ports.attach(task, {
            begin: () => {},
            progress: () => {},
            done: resolve,
            error: code => reject(Error(code)),
          });
          void task.resume().catch(reject);
        });
      }
      await wait(400);
      await c.resume(c.listJobs()[0].jobId);
    }
  }
  await until(
    () =>
      c.listInstalled().some(p => p.state === 'ready') ||
      c.listJobs().some(j => j.state === 'failed'),
  );
  const installed = c.listInstalled()[0],
    jobs = c.listJobs();
  if (['forbidden', 'corrupt', 'no-space'].includes(mode)) {
    if (installed?.state === 'ready' || jobs[0].state !== 'failed')
      throw Error('false_ready');
    log('phase10-rejected', {mode, jobs});
    await c.cancel(jobs[0].jobId);
    return;
  }
  if (installed?.state !== 'ready') throw Error(JSON.stringify(jobs));
  await nativeDownloadPorts.verify(installed.files[0], pack.assets[0]);
  log('phase10-verified', {
    mode,
    jobs,
    installed,
    sha256: await FileSystem.hash(privatePath(installed.files[0]), 'SHA-256'),
  });
  await c.deletePack(pack.id, pack.version);
}
