require('../foundation/register.cjs');
const {test} = require('node:test'),
  assert = require('node:assert/strict');
const {
  DownloadCoordinator,
} = require('../../src/features/downloads/coordinator.ts');

const pack = {
  id: 'phase10',
  version: '1',
  review: 'approved',
  title: 'fixture',
  manifestHash: 'a'.repeat(64),
  sourceMetadata: {source: 'test'},
  capabilities: [],
  assets: [
    {
      id: 'a',
      file: 'a.json',
      url: 'https://example.invalid/a',
      bytes: 100,
      sha256: 'a'.repeat(64),
      mime: 'application/json',
    },
  ],
};

function fixture() {
  let disk = {jobs: [], installed: [], journals: []},
    files = new Map(),
    tasks = new Map(),
    starts = 0,
    syncs = 0,
    failSync = false;
  const ports = {
    resumable: true,
    load: async () => structuredClone(disk),
    commit: async (jobs, installed, journals) => {
      disk = structuredClone({jobs, installed, journals});
    },
    existing: async () => [...tasks.values()],
    attach: (t, e) => {
      t.events = e;
    },
    start: (j, a, e) => {
      starts++;
      const t = {
        id: j.nativeTaskId,
        state: 'DOWNLOADING',
        events: e,
        pause: async () => {
          t.state = 'PAUSED';
        },
        resume: async () => {
          t.state = 'DOWNLOADING';
        },
        stop: async () => {
          tasks.delete(t.id);
        },
      };
      tasks.set(t.id, t);
      return t;
    },
    size: async p => files.get(p) ?? 0,
    exists: async p => files.has(p),
    verify: async p => {
      assert.equal(files.get(p), 100);
    },
    move: async (a, b) => {
      files.set(b, files.get(a));
      files.delete(a);
    },
    remove: async p => {
      files.delete(p);
    },
    sync: async paths => {
      syncs++;
      assert.ok(paths.every(p => files.has(p)));
      if (failSync) throw Error('disk_full');
    },
    free: async () => 1e9,
    release: async (p, f) => f(),
    now: Date.now,
  };
  return {
    ports,
    files,
    tasks,
    c: () => new DownloadCoordinator([pack], ports),
    get disk() {
      return disk;
    },
    get starts() {
      return starts;
    },
    get syncs() {
      return syncs;
    },
    set failSync(v) {
      failSync = v;
    },
    done: async c => {
      const t = [...tasks.values()][0];
      files.set(c.listJobs()[0].relativeTempPath, 100);
      t.events.done();
      await c.usage();
    },
  };
}

test('download validators retain URLSession header names regardless of capitalization', async () => {
  const f = fixture(),
    c = f.c();
  await c.initialize();
  await c.networkChanged({connected: true, wifi: true});
  await c.enqueue(pack.id, pack.version, 'wifi');
  const task = [...f.tasks.values()][0];
  await task.events.begin({
    Etag: '"exact-recording"',
    'Last-Modified': 'Wed, 21 Oct 2026 00:00:00 GMT',
  });
  assert.equal(c.listJobs()[0].etag, '"exact-recording"');
  assert.equal(c.listJobs()[0].lastModified, 'Wed, 21 Oct 2026 00:00:00 GMT');
});
test('Wi-Fi policy rejects unmetered cellular/ethernet; explicit any-network consent is independent', async () => {
  const f = fixture(),
    c = f.c();
  await c.initialize();
  await c.networkChanged({connected: true, wifi: false});
  await c.enqueue(pack.id, pack.version);
  assert.equal(f.starts, 0);
  assert.equal(c.listJobs()[0].state, 'waiting_network');
  await c.cancel(c.listJobs()[0].jobId);
  await c.enqueue(pack.id, pack.version, false);
  assert.equal(f.starts, 1);
  assert.equal(c.listJobs()[0].consentNetworkPolicy, 'any');
  await c.cancel(c.listJobs()[0].jobId);
});
test('pause and network wait reuse native task and actual partial length; stale callbacks stay ignored', async () => {
  const f = fixture(),
    c = f.c();
  await c.initialize();
  await c.enqueue(pack.id, pack.version);
  const t = [...f.tasks.values()][0],
    stale = t.events,
    j = c.listJobs()[0];
  f.files.set(j.relativeTempPath, 40);
  await c.pause(j.jobId);
  await c.networkChanged({connected: true, wifi: true});
  assert.equal(c.listJobs()[0].state, 'paused_user');
  stale.done();
  await c.usage();
  assert.equal(f.disk.installed.length, 0);
  await c.resume(j.jobId);
  assert.equal(f.starts, 1);
  assert.equal(c.listJobs()[0].bytesReceived, 40);
  await c.networkChanged({connected: false, wifi: false});
  assert.equal(t.state, 'PAUSED');
  await c.networkChanged({connected: true, wifi: true});
  assert.equal(f.starts, 1);
  assert.equal(t.state, 'DOWNLOADING');
  await f.done(c);
  assert.equal(c.listInstalled()[0].state, 'ready');
  assert.equal(f.syncs, 1);
});
test('startup offline does not resume a recovered network-paused task', async () => {
  const f = fixture();
  let c = f.c();
  await c.initialize();
  await c.enqueue(pack.id, pack.version);
  await c.networkChanged({connected: false, wifi: false});
  c = f.c();
  await c.networkChanged({connected: false, wifi: false});
  await c.initialize();
  assert.equal([...f.tasks.values()][0].state, 'PAUSED');
  assert.equal(c.listJobs()[0].state, 'waiting_network');
  await c.networkChanged({connected: true, wifi: true});
  assert.equal(f.starts, 1);
  await c.cancel(c.listJobs()[0].jobId);
});
test('sync/disk-full failure never commits ready; journal can recover the verified final file', async () => {
  const f = fixture(),
    c = f.c();
  await c.initialize();
  await c.enqueue(pack.id, pack.version);
  f.failSync = true;
  await f.done(c);
  assert.equal(c.listInstalled()[0].state, 'installing');
  assert.equal(c.listInstalled()[0].active, false);
  assert.equal(c.listJobs()[0].state, 'failed');
  assert.equal(f.disk.journals.length, 1);
  f.failSync = false;
  await c.resume(c.listJobs()[0].jobId);
  await f.done(c);
  assert.equal(c.listInstalled()[0].state, 'ready');
});
test('complete private file survives native completion/JS delivery process-loss gap', async () => {
  const f = fixture();
  let c = f.c();
  await c.initialize();
  await c.enqueue(pack.id, pack.version);
  f.files.set(c.listJobs()[0].relativeTempPath, 100);
  f.tasks.clear();
  c = f.c();
  await c.initialize();
  assert.equal(c.listInstalled()[0].state, 'ready');
  assert.equal(f.starts, 1);
});
test('transient failures exhaust three attempts; forbidden content has no automatic retry', async () => {
  const f = fixture();
  let now = 10000;
  f.ports.now = () => now;
  const c = f.c();
  await c.initialize();
  await c.enqueue(pack.id, pack.version);
  for (let i = 1; i <= 3; i++) {
    const t = [...f.tasks.values()][0];
    t.events.error('503');
    await c.usage();
    assert.equal(c.listJobs()[0].attempt, i);
    if (i < 3) {
      assert.equal(c.listJobs()[0].state, 'queued');
      now += 100000;
      await c.networkChanged({connected: true, wifi: true});
    }
  }
  assert.equal(c.listJobs()[0].state, 'failed');
  assert.equal(f.starts, 3);
  await c.resume(c.listJobs()[0].jobId);
  [...f.tasks.values()][0].events.error('403');
  await c.usage();
  assert.equal(c.listJobs()[0].state, 'failed');
  assert.equal(f.starts, 4);
  await c.cancel(c.listJobs()[0].jobId);
});
test('a full partial paused after native completion installs without resuming a vanished native task', async () => {
  const f = fixture(),
    c = f.c();
  await c.initialize();
  await c.enqueue(pack.id, pack.version);
  const t = [...f.tasks.values()][0];
  await c.pause(c.listJobs()[0].jobId);
  f.files.set(c.listJobs()[0].relativeTempPath, 100);
  t.resume = async () => {
    throw Error('native_task_gone');
  };
  await c.resume(c.listJobs()[0].jobId);
  assert.equal(c.listInstalled()[0].state, 'ready');
  assert.equal(f.starts, 1);
});
test('per-file any-network consent replaces only the waiting task and is durable', async () => {
  const f = fixture(),
    c = f.c();
  await c.initialize();
  await c.enqueue(pack.id, pack.version);
  const id = c.listJobs()[0].jobId;
  await c.networkChanged({connected: true, wifi: false});
  f.files.set(c.listJobs()[0].relativeTempPath, 40);
  await c.allowAnyNetwork(id);
  assert.equal(f.starts, 2);
  assert.equal(c.listJobs()[0].consentNetworkPolicy, 'any');
  assert.equal(f.disk.jobs[0].consentNetworkPolicy, 'any');
  assert.equal(c.listJobs()[0].bytesReceived, 0);
  await c.pause(id);
  await c.networkChanged({connected: true, wifi: true});
  assert.equal(c.listJobs()[0].state, 'paused_user');
  await c.cancel(id);
});

test('startup checks every installed file before exposing ready content and marks missing packs unavailable', async () => {
  const f = fixture(),
    c = f.c();
  await c.initialize();
  await c.enqueue(pack.id, pack.version);
  await f.done(c);
  const installed = f.disk.installed[0];
  installed.files.push('content/phase10/1/second.json');
  const checks = [];
  f.ports.exists = path => new Promise(resolve => checks.push({path, resolve}));
  const restarted = f.c(),
    initializing = restarted.initialize();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(
    checks.map(c => c.path),
    installed.files,
    'file checks start together',
  );
  checks[0].resolve(true);
  assert.equal(restarted.listInstalled()[0].state, 'ready');
  checks[1].resolve(false);
  await initializing;
  assert.equal(restarted.listInstalled()[0].state, 'missing');
  assert.ok(
    restarted.listJobs().every(j => j.errorCode === 'installed_file_missing'),
  );
  assert.equal(f.starts, 1, 'startup must not start a network replacement');
});
