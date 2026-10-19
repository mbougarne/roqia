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

function bundled() {
  const f = fixture();
  f.ports.bundled = () => true;
  f.ports.copyBundled = async (p, a, target) => f.files.set(target, 100);
  return f;
}
test('bundles install without network, survive restart unchanged, and restore locally after removal', async () => {
  const f = bundled();
  let c = f.c();
  await c.initialize();
  assert.equal(f.starts, 0);
  assert.equal(c.listInstalled()[0].state, 'ready');
  const before = structuredClone(f.disk);
  c = f.c();
  await c.initialize();
  assert.deepEqual(f.disk, before);
  await c.deletePack(pack.id, pack.version);
  c = f.c();
  await c.initialize();
  assert.equal(c.listInstalled().length, 0);
  await c.installBundled(pack.id, pack.version);
  assert.equal(c.listInstalled()[0].state, 'ready');
  assert.equal(f.starts, 0);
});
test('bad bundled bytes cannot activate and next launch recovers from a valid copy', async () => {
  const f = bundled();
  f.ports.copyBundled = async (p, a, target) => f.files.set(target, 99);
  await assert.rejects(f.c().initialize());
  assert.ok(!f.disk.installed.some(p => p.active));
  f.ports.copyBundled = async (p, a, target) => f.files.set(target, 100);
  const c = f.c();
  await c.initialize();
  assert.equal(c.listInstalled()[0].state, 'ready');
  assert.equal(f.starts, 0);
});
test('interrupted bundled copy retries locally on restart', async () => {
  const f = bundled();
  f.ports.copyBundled = async () => {
    throw Error('interrupted');
  };
  await assert.rejects(f.c().initialize(), /interrupted/);
  f.ports.copyBundled = async (p, a, target) => f.files.set(target, 100);
  const c = f.c();
  await c.initialize();
  assert.equal(c.listInstalled()[0].state, 'ready');
  assert.equal(f.starts, 0);
});
test('disk sync failure never activates a bundled pack', async () => {
  const f = bundled();
  f.failSync = true;
  await assert.rejects(f.c().initialize(), /disk_full/);
  assert.ok(!f.disk.installed.some(p => p.active));
  f.failSync = false;
  const c = f.c();
  await c.initialize();
  assert.equal(c.listInstalled()[0].state, 'ready');
  assert.equal(f.starts, 0);
});
