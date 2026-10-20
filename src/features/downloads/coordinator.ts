import {
  type Asset,
  type LocalAsset,
  type Pack,
  type DownloadJob,
  type InstalledPack,
  type InstallJournal,
  jobKey,
  validateCatalog,
  publisherAudioIntake,
} from './types';

export type Task = {
  id: string;
  state: string;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
};

export type Events = {
  begin: (headers: Record<string, string | null>) => void;
  progress: (received: number) => void;
  done: () => void | Promise<void>;
  error: (code: string) => void | Promise<void>;
};

export type DownloadPorts = {
  // Only a transport that validates entity/range responses before append may retain partials.
  resumable?: boolean;
  bundled?: (pack: Pack) => boolean;
  copyBundled?: (pack: Pack, asset: Asset, target: string) => Promise<void>;
  sync?: (paths: string[]) => Promise<void>;
  load: () => Promise<{
    jobs: DownloadJob[];
    installed: InstalledPack[];
    journals: InstallJournal[];
  }>;
  commit: (
    jobs: DownloadJob[],
    installed: InstalledPack[],
    journals: InstallJournal[],
  ) => Promise<void>;
  existing: () => Promise<Task[]>;
  attach: (task: Task, events: Events) => void;
  start: (job: DownloadJob, asset: Asset, events: Events) => Task;
  exists: (path: string) => Promise<boolean>;
  size: (path: string) => Promise<number>;
  verify: (path: string, asset: LocalAsset) => Promise<void>;
  sha256?: (path: string) => Promise<string>;
  prepare?: (pack: Pack, directory: string) => Promise<void>;
  move: (from: string, to: string) => Promise<void>;
  remove: (path: string) => Promise<void>;
  free: () => Promise<number>;
  release: (paths: string[], remove: () => Promise<void>) => Promise<void>;
  now: () => number;
};
const activeStates = new Set(['waiting_network', 'downloading']);

export class DownloadCoordinator {
  private jobs: DownloadJob[] = [];
  private installed: InstalledPack[] = [];
  private journals: InstallJournal[] = [];
  private tasks = new Map<string, Task>();
  private tail: Promise<unknown> = Promise.resolve();
  private listeners = new Set<() => void>();
  private revision = 0;
  private ready = false;
  private failure: string | null = null;
  private network = {connected: true, wifi: true};
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  constructor(
    private catalog: Pack[],
    private ports: DownloadPorts,
    allowFixtures = false,
  ) {
    validateCatalog(catalog, allowFixtures);
  }
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  snapshot = () => this.revision;
  getError = () => this.failure;
  listJobs = () => this.jobs.map(j => ({...j}));
  listInstalled = () => this.installed.map(p => ({...p}));
  register = (pack: Pack) =>
    this.run(async () => {
      validateCatalog([pack]);
      const previous = this.catalog.find(
        p => p.id === pack.id && p.version === pack.version,
      );
      if (previous && previous.manifestHash !== pack.manifestHash)
        throw Error('catalog_version_conflict');
      if (!previous) {
        this.catalog.push(pack);
        this.notify();
      }
    });
  private notify() {
    this.revision++;
    this.listeners.forEach(fn => fn());
  }
  private run<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.tail.then(fn);
    this.tail = next.catch(() => undefined);
    return next;
  }
  private async save() {
    try {
      await this.ports.commit(this.jobs, this.installed, this.journals);
    } catch (error) {
      this.failure = 'storage_unavailable';
      this.ready = false;
      const saved = await this.ports.load();
      this.jobs = saved.jobs;
      this.installed = saved.installed;
      this.journals = saved.journals;
      this.notify();
      throw error;
    }
    this.notify();
  }
  private pack(job: DownloadJob) {
    const pack = this.catalog.find(
      p => p.id === job.packId && p.version === job.version,
    );
    if (!pack) throw Error('catalog_entry_unavailable');
    return pack;
  }
  private asset(job: DownloadJob) {
    const asset = this.pack(job).assets.find(a => a.id === job.assetId);
    if (!asset) throw Error('asset_unavailable');
    return asset.pinAfterDownload && /^[a-f0-9]{64}$/.test(job.expectedHash)
      ? {...asset, sha256: job.expectedHash}
      : asset;
  }
  private async stopTask(job: DownloadJob) {
    const task = job.nativeTaskId
      ? this.tasks.get(job.nativeTaskId)
      : undefined;
    if (task) {
      await task.stop();
      this.tasks.delete(task.id);
    }
    job.nativeTaskId = null;
  }
  private events(job: DownloadJob): Events {
    const generation = job.generation,
      id = job.jobId;
    const event = (fn: (current: DownloadJob) => Promise<void>) => {
      return this.run(async () => {
        const current = this.jobs.find(j => j.jobId === id);
        if (
          !current ||
          current.generation !== generation ||
          !activeStates.has(current.state)
        )
          return;
        await fn(current);
      }).catch(() => {
        this.failure ??= 'download_recovery_required';
        this.ready = false;
        this.notify();
      });
    };
    return {
      begin: headers =>
        event(async current => {
          current.state = 'downloading';
          current.pauseReason = null;
          current.etag = headers.etag ?? headers.ETag ?? null;
          current.lastModified = headers['last-modified'] ?? null;
          current.errorCode =
            headers['x-roqia-restart-reason'] ?? current.errorCode;
          await this.save();
        }),
      progress: received =>
        event(async current => {
          if (!Number.isFinite(received) || received < 0) return;
          current.bytesReceived = received;
          current.state = 'downloading';
          current.pauseReason = null;
          current.updatedAt = this.ports.now();
          await this.save();
        }),
      done: () =>
        event(async current => {
          current.state = 'verifying';
          await this.save();
          try {
            await this.finishAsset(current);
          } catch (e) {
            await this.fail(
              current,
              e instanceof Error ? e.message : 'verification_failed',
              false,
            );
          }
          await this.pump();
        }),
      error: code =>
        event(async current => {
          if (this.jobs.includes(current))
            await this.fail(
              current,
              code,
              !/403|404|401|integrity|signature/.test(code),
            );
          await this.pump();
        }),
    };
  }
  private async fail(job: DownloadJob, code: string, retry: boolean) {
    await this.stopTask(job);
    job.generation++;
    job.errorCode = code;
    job.updatedAt = this.ports.now();
    job.state = retry && job.attempt < 3 ? 'queued' : 'failed';
    job.retryAt =
      job.state === 'queued'
        ? this.ports.now() +
          1000 * 2 ** job.attempt +
          Math.floor(Math.random() * 500)
        : 0;
    await this.save();
  }
  private async finishAsset(job: DownloadJob) {
    const source = (await this.ports.exists(job.relativeTempPath))
      ? job.relativeTempPath
      : job.relativeFinalPath;
    let asset = this.asset(job);
    if (!job.expectedHash && publisherAudioIntake(this.pack(job), asset)) {
      const hash = await this.ports.sha256?.(source);
      if (!hash || !/^[a-f0-9]{64}$/.test(hash))
        throw Error('audio_hash_unavailable');
      asset = {...asset, sha256: hash};
      await this.ports.verify(source, asset);
      job.expectedHash = hash;
    } else await this.ports.verify(source, asset);
    job.state = 'installing';
    job.bytesReceived = job.expectedBytes;
    const pack = this.pack(job);
    if (
      !this.journals.some(
        j =>
          j.packId === pack.id &&
          j.version === pack.version &&
          j.phase === 'install',
      )
    )
      this.journals.push({
        packId: pack.id,
        version: pack.version,
        phase: 'install',
      });
    await this.save(); // Durable intent before rename; recovery verifies final bytes again.
    if (source !== job.relativeFinalPath)
      await this.ports.move(source, job.relativeFinalPath);
    await this.stopTask(job);
    await this.activate(pack);
  }
  private async activate(pack: Pack) {
    const members = pack.assets.map(asset =>
      this.jobs.find(j => j.jobId === jobKey(pack, asset)),
    );
    if (members.some(j => !j || !['installing', 'ready'].includes(j.state))) {
      await this.save();
      return;
    }
    for (const job of members as DownloadJob[])
      await this.ports.verify(job.relativeFinalPath, this.asset(job));
    const record: InstalledPack = {
      active: false,
      packId: pack.id,
      version: pack.version,
      relativeDirectory: `content/${pack.id}/${pack.version}`,
      manifestHash: pack.manifestHash,
      capabilities: pack.capabilities,
      state: 'installing',
      activatedAt: this.ports.now(),
      sourceMetadata: pack.sourceMetadata,
      files: [
        ...(members as DownloadJob[]).map(j => j.relativeFinalPath),
        ...(pack.derivedAssets ?? []).map(
          a => `content/${pack.id}/${pack.version}/${a.file}`,
        ),
      ],
    };
    // Older versions remain intact; readers can finish using them. Exactly one version is active/ready.
    this.installed = this.installed.filter(
      p => !(p.packId === pack.id && p.version === pack.version),
    );
    this.installed.push(record);
    if (pack.preparation) {
      // Track all expected local outputs before preparing them, so deletion/recovery owns them.
      await this.save();
      if (!this.ports.prepare) throw Error('preparation_unavailable');
      await this.ports.prepare(pack, record.relativeDirectory);
      for (const asset of pack.derivedAssets ?? [])
        await this.ports.verify(
          `${record.relativeDirectory}/${asset.file}`,
          asset,
        );
    }
    await this.ports.sync?.(record.files);
    record.state = 'ready';
    record.active = true;
    this.installed = this.installed.map(p =>
      p.packId === pack.id && p !== record ? {...p, active: false} : p,
    );
    for (const job of members as DownloadJob[]) job.state = 'ready';
    this.journals = this.journals.filter(
      j =>
        !(
          j.packId === pack.id &&
          j.version === pack.version &&
          j.phase === 'install'
        ),
    );
    await this.save();
  }
  private async importBundled(pack: Pack) {
    if (!this.ports.bundled?.(pack) || !this.ports.copyBundled) return false;
    if (
      this.installed.some(
        p =>
          p.packId === pack.id &&
          p.version === pack.version &&
          p.state === 'ready' &&
          p.manifestHash === pack.manifestHash,
      )
    )
      return true;
    for (const asset of pack.assets) {
      const key = jobKey(pack, asset);
      let job = this.jobs.find(j => j.jobId === key);
      if (job) await this.stopTask(job);
      const previousGeneration = job?.generation ?? 0;
      const fresh: DownloadJob = {
        jobId: key,
        assetId: asset.id,
        packId: pack.id,
        version: pack.version,
        nativeTaskId: null,
        generation: previousGeneration + 1,
        state: 'installing',
        pauseReason: null,
        relativeTempPath: `staging/${key}.part`,
        relativeFinalPath: `content/${pack.id}/${pack.version}/${asset.file}`,
        bytesReceived: 0,
        expectedBytes: asset.bytes,
        expectedHash: asset.sha256,
        etag: null,
        lastModified: null,
        attempt: 0,
        errorCode: null,
        consentNetworkPolicy: 'wifi',
        updatedAt: this.ports.now(),
        retryAt: 0,
      };
      if (job) Object.assign(job, fresh);
      else {
        job = fresh;
        this.jobs.push(job);
      }
      await this.save();
      await this.ports.copyBundled(pack, asset, job.relativeTempPath);
      await this.finishAsset(job);
    }
    return true;
  }
  installBundled = (id: string, version: string) =>
    this.run(async () => {
      if (!this.ready) throw Error('downloads_not_initialized');
      const pack = this.catalog.find(p => p.id === id && p.version === version);
      return pack ? this.importBundled(pack) : false;
    });
  networkChanged = (network: {connected: boolean; wifi: boolean}) =>
    this.run(() => this.updateNetwork(network));
  private async updateNetwork(network: {connected: boolean; wifi: boolean}) {
    this.network = network;
    if (!this.ready) return;
    for (const job of this.jobs) {
      const allowed =
        network.connected &&
        (job.consentNetworkPolicy === 'any' || network.wifi);
      if (!allowed && activeStates.has(job.state)) {
        job.state = 'waiting_network';
        job.pauseReason = 'network';
        job.generation++;
        await this.save();
        const task = job.nativeTaskId
          ? this.tasks.get(job.nativeTaskId)
          : undefined;
        if (task && this.ports.resumable) await task.pause();
        else await this.stopTask(job);
        await this.save();
      } else if (
        allowed &&
        job.state === 'waiting_network' &&
        (!job.nativeTaskId ||
          this.tasks.get(job.nativeTaskId)?.state === 'PAUSED')
      ) {
        job.state = 'queued';
        job.pauseReason = null;
        job.attempt = Math.max(0, job.attempt - 1);
      }
    }
    await this.save();
    await this.pump();
  }
  private async pump() {
    if (!this.ready) return;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    for (const job of this.jobs) {
      if (
        this.jobs.filter(j => activeStates.has(j.state) && j.nativeTaskId)
          .length >= 2
      )
        break;
      if (job.state !== 'queued' || job.retryAt > this.ports.now()) continue;
      if (
        !this.network.connected ||
        (job.consentNetworkPolicy === 'wifi' && !this.network.wifi)
      ) {
        job.state = 'waiting_network';
        job.pauseReason = 'network';
        await this.save();
        continue;
      }
      try {
        // Native completion can race an explicit pause before its JS callback arrives.
        // A complete private file needs verification/install, not a resume of a vanished task.
        if (
          this.ports.resumable &&
          (await this.ports.size(job.relativeTempPath)) === job.expectedBytes
        ) {
          await this.finishAsset(job);
          continue;
        }
        const needed =
          Math.max(
            0,
            job.expectedBytes -
              (this.ports.resumable
                ? await this.ports.size(job.relativeTempPath)
                : 0),
          ) +
          (this.pack(job).derivedAssets ?? []).reduce(
            (n, a) => n + a.bytes,
            0,
          ) +
          Math.max(job.expectedBytes * 0.1, 20 * 1024 * 1024);
        if ((await this.ports.free()) < needed)
          throw Error('insufficient_space');
        if (!this.ports.resumable)
          await this.ports.remove(job.relativeTempPath);
        job.generation++;
        job.attempt++;
        job.bytesReceived = await this.ports.size(job.relativeTempPath);
        job.errorCode = null;
        const paused =
          this.ports.resumable && job.nativeTaskId
            ? this.tasks.get(job.nativeTaskId)
            : undefined;
        if (paused?.state === 'PAUSED') {
          job.state = 'waiting_network';
          job.pauseReason = 'network';
          await this.save();
          this.ports.attach(paused, this.events(job));
          await paused.resume();
          continue;
        }
        job.nativeTaskId = `roqia.${job.jobId}.${job.generation}`;
        job.state = 'waiting_network';
        job.pauseReason = 'network';
        await this.save();
        const task = this.ports.start(job, this.asset(job), this.events(job));
        this.tasks.set(task.id, task);
      } catch (e) {
        await this.fail(
          job,
          e instanceof Error ? e.message : 'download_failed',
          false,
        );
      }
    }
    const next = this.jobs
      .filter(j => j.state === 'queued' && j.retryAt > this.ports.now())
      .map(j => j.retryAt);
    if (next.length)
      this.retryTimer = setTimeout(
        () => {
          void this.run(() => this.pump());
        },
        Math.max(1, Math.min(...next) - this.ports.now()),
      );
  }
  initialize = () =>
    this.run(async () => {
      if (this.ready) return;
      this.failure = null;
      const saved = await this.ports.load();
      this.jobs = saved.jobs;
      this.installed = saved.installed;
      this.journals = saved.journals;
      if (this.jobs.length || this.catalog.length)
        for (const task of await this.ports.existing())
          this.tasks.set(task.id, task);
      for (const job of this.jobs) {
        const task = job.nativeTaskId
          ? this.tasks.get(job.nativeTaskId)
          : undefined;
        if (
          !this.catalog.some(
            p => p.id === job.packId && p.version === job.version,
          ) &&
          !['removed', 'cancelled'].includes(job.state) &&
          !(
            job.state === 'ready' &&
            this.installed.some(
              p =>
                p.packId === job.packId &&
                p.version === job.version &&
                p.state === 'ready' &&
                p.files.includes(job.relativeFinalPath),
            )
          )
        ) {
          if (task) await this.stopTask(job);
          job.state = 'failed';
          job.errorCode = 'catalog_entry_unavailable';
          continue;
        }
        if (job.state === 'paused_user') {
          if (task) await task.pause();
          continue;
        }
        if (['cancelled', 'removed', 'failed'].includes(job.state)) {
          if (task) await this.stopTask(job);
          if (job.state !== 'failed')
            await this.ports.remove(job.relativeTempPath);
          continue;
        }
        if (
          ['verifying', 'installing'].includes(job.state) ||
          task?.state === 'DONE'
        ) {
          try {
            await this.finishAsset(job);
          } catch (e) {
            await this.fail(job, 'integrity_recovery_failed', false);
          }
          continue;
        }
        if (activeStates.has(job.state)) {
          if (
            !task &&
            ((await this.ports.size(job.relativeTempPath)) ===
              job.expectedBytes ||
              (await this.ports.size(job.relativeFinalPath)) ===
                job.expectedBytes)
          ) {
            try {
              await this.finishAsset(job);
            } catch {
              await this.fail(job, 'integrity_recovery_failed', false);
            }
            continue;
          }
          if (
            task &&
            ['PENDING', 'DOWNLOADING', 'PAUSED'].includes(task.state)
          ) {
            this.ports.attach(task, this.events(job));
            if (task.state === 'PAUSED') {
              if (!this.ports.resumable) await this.stopTask(job);
              job.state = 'queued';
            }
          } else {
            job.state = 'queued';
            job.generation++;
            job.nativeTaskId = null;
          }
        }
      }
      for (const task of this.tasks.values())
        if (
          !this.jobs.some(j => j.nativeTaskId === task.id) &&
          task.id.startsWith('roqia.')
        )
          await task.stop();
      for (const pack of [...this.installed]) {
        if (pack.state === 'deleting') {
          await this.deleteFiles(pack);
          continue;
        }
        // Installed Quran packs contain hundreds of files. Check each file
        // without serializing a native round trip for every chapter.
        if (
          pack.state === 'ready' &&
          !(
            await Promise.all(pack.files.map(file => this.ports.exists(file)))
          ).every(Boolean)
        ) {
          pack.state = 'missing';
          for (const job of this.jobs.filter(
            j => j.packId === pack.packId && j.version === pack.version,
          )) {
            job.state = 'failed';
            job.errorCode = 'installed_file_missing';
          }
        }
      }
      // Seed only absent/interrupted built-ins. Explicit storage removal stays removed
      // until the user chooses the pack again; existing installations stay untouched.
      for (const pack of this.catalog) {
        if (!this.ports.bundled?.(pack)) continue;
        const jobs = this.jobs.filter(
          j => j.packId === pack.id && j.version === pack.version,
        );
        if (
          jobs.some(j =>
            ['removed', 'cancelled', 'paused_user'].includes(j.state),
          )
        )
          continue;
        await this.importBundled(pack);
      }
      this.ready = true;
      await this.save();
      await this.updateNetwork(this.network);
    });
  enqueue = (id: string, version: string, wifiOnly = true) =>
    this.run(async () => {
      if (!this.ready) throw Error('downloads_not_initialized');
      const pack = this.catalog.find(p => p.id === id && p.version === version);
      if (!pack) throw Error('pack_unavailable');
      for (const asset of pack.assets) {
        const key = jobKey(pack, asset);
        const existing = this.jobs.find(j => j.jobId === key);
        if (existing) {
          if (['failed', 'removed', 'cancelled'].includes(existing.state)) {
            await this.stopTask(existing);
            existing.generation++;
            existing.state = 'queued';
            existing.errorCode = null;
            existing.attempt = 0;
            existing.retryAt = 0;
            existing.consentNetworkPolicy = wifiOnly ? 'wifi' : 'any';
          }
          continue;
        }
        this.jobs.push({
          jobId: key,
          assetId: asset.id,
          packId: id,
          version,
          nativeTaskId: null,
          generation: 0,
          state: 'queued',
          pauseReason: null,
          relativeTempPath: `staging/${key}.part`,
          relativeFinalPath: `content/${id}/${version}/${asset.file}`,
          bytesReceived: 0,
          expectedBytes: asset.bytes,
          expectedHash: asset.sha256,
          etag: null,
          lastModified: null,
          attempt: 0,
          errorCode: null,
          consentNetworkPolicy: wifiOnly ? 'wifi' : 'any',
          updatedAt: this.ports.now(),
          retryAt: 0,
        });
      }
      await this.save();
      await this.pump();
    });
  pause = (id: string) =>
    this.run(async () => {
      const job = this.jobs.find(j => j.jobId === id);
      if (
        !job ||
        !['queued', 'downloading', 'waiting_network'].includes(job.state)
      )
        return;
      job.state = 'paused_user';
      job.pauseReason = 'user';
      job.generation++;
      await this.save();
      const task = job.nativeTaskId
        ? this.tasks.get(job.nativeTaskId)
        : undefined;
      if (task) await task.pause();
      await this.pump();
    });
  resume = (id: string) =>
    this.run(async () => {
      const job = this.jobs.find(j => j.jobId === id);
      if (
        !job ||
        !['paused_user', 'failed', 'cancelled', 'removed'].includes(job.state)
      )
        return;
      const paused = job.state === 'paused_user';
      if (!this.ports.resumable || !paused) await this.stopTask(job);
      job.state = 'queued';
      job.pauseReason = null;
      job.retryAt = 0;
      job.attempt = 0;
      job.errorCode = null;
      job.generation++;
      await this.save();
      await this.pump();
    });
  allowAnyNetwork = (id: string) =>
    this.run(async () => {
      const job = this.jobs.find(j => j.jobId === id);
      if (
        !job ||
        job.state !== 'waiting_network' ||
        job.consentNetworkPolicy !== 'wifi'
      )
        return;
      // Native network constraints belong to the task. Explicit consent replaces that task;
      // this file restarts, while other jobs retain their original Wi-Fi consent.
      await this.stopTask(job);
      await this.ports.remove(job.relativeTempPath);
      job.generation++;
      job.consentNetworkPolicy = 'any';
      job.state = 'queued';
      job.pauseReason = null;
      job.bytesReceived = 0;
      job.attempt = 0;
      job.retryAt = 0;
      job.errorCode = null;
      await this.save();
      await this.pump();
    });
  cancel = (id: string) =>
    this.run(async () => {
      const job = this.jobs.find(j => j.jobId === id);
      if (!job || ['ready', 'deleting', 'removed'].includes(job.state)) return;
      job.generation++;
      job.state = 'cancelled';
      await this.save();
      const preparing = this.installed.find(
        p =>
          p.packId === job.packId &&
          p.version === job.version &&
          p.state === 'installing',
      );
      if (preparing) {
        preparing.state = 'deleting';
        this.journals.push({
          packId: job.packId,
          version: job.version,
          phase: 'delete',
        });
        await this.save();
        await this.deleteFiles(preparing);
        return;
      }
      await this.stopTask(job);
      await this.ports.remove(job.relativeTempPath);
      await this.ports.remove(job.relativeFinalPath);
      await this.save();
      await this.pump();
    });
  private async deleteFiles(pack: InstalledPack) {
    await this.ports.release(pack.files, async () => {
      for (const file of pack.files) {
        await this.ports.remove(file);
        await this.ports.remove(file + '.import');
      }
    });
    for (const job of this.jobs.filter(
      j => j.packId === pack.packId && j.version === pack.version,
    )) {
      await this.stopTask(job);
      await this.ports.remove(job.relativeTempPath);
      job.state = 'removed';
      job.generation++;
    }
    this.installed = this.installed.filter(p => p !== pack);
    this.journals = this.journals.filter(
      j => !(j.packId === pack.packId && j.version === pack.version),
    );
    await this.save();
  }
  deletePack = (id: string, version: string) =>
    this.run(async () => {
      const pack = this.installed.find(
        p => p.packId === id && p.version === version,
      );
      if (!pack) return;
      pack.state = 'deleting';
      this.journals.push({packId: id, version, phase: 'delete'});
      await this.save();
      await this.deleteFiles(pack);
    });
  usage = () =>
    this.run(async () => {
      const files = new Set<string>();
      let installed = 0,
        partial = 0;
      for (const pack of this.installed)
        for (const file of pack.files)
          if (!files.has(file)) {
            files.add(file);
            installed += await this.ports.size(file);
            partial += await this.ports.size(file + '.import');
          }
      for (const job of this.jobs) {
        partial += await this.ports.size(job.relativeTempPath);
        if (!files.has(job.relativeFinalPath))
          partial += await this.ports.size(job.relativeFinalPath);
      }
      return {installed, partial, free: await this.ports.free()};
    });
}
