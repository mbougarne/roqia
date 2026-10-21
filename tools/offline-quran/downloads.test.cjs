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

function fixture(catalog = [pack]) {
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
    c: () => new DownloadCoordinator(catalog, ports),
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

function bundled(catalog) {
  const f = fixture(catalog);
  f.ports.bundled = () => true;
  f.ports.copyBundled = async (p, a, target) => f.files.set(target, 100);
  return f;
}
test('both included mushafs install offline, recover old removal/missing files, and cannot be deleted', async () => {
  const texts = ['warsh', 'hafs'].map(id => ({
    ...pack,
    id,
    capabilities: ['quran-text'],
  }));
  const f = bundled(texts);
  f.ports.start = () => {
    throw Error('network_must_not_start');
  };
  let c = f.c();
  await c.initialize();
  assert.equal(
    c.listInstalled().filter(p => p.active && p.state === 'ready').length,
    2,
  );
  for (const p of texts) {
    assert.equal(c.isBundledPack(p.id, p.version), true);
    await assert.rejects(
      c.deletePack(p.id, p.version),
      /protected_pack_required/,
    );
  }
  const state = f.disk;
  state.installed = [];
  state.jobs.forEach(j => {
    j.state = 'removed';
  });
  c = f.c();
  await c.initialize();
  assert.equal(c.listInstalled().length, 2);
  f.files.clear();
  c = f.c();
  await c.initialize();
  assert.ok(c.listInstalled().every(p => p.active && p.state === 'ready'));
  assert.equal(f.starts, 0);
});
test('bundled translations cannot be deleted and recover old removed, cancelled or paused states offline', async () => {
  const translations = [
    'translation-fr.hamidullah',
    'translation-en.pickthall',
  ].map(id => ({
    ...pack,
    id,
    capabilities: ['translation'],
  }));
  const f = bundled(translations);
  f.ports.start = () => {
    throw Error('network_must_not_start');
  };
  let c = f.c();
  await c.initialize();
  const before = structuredClone(f.disk);
  for (const p of translations) {
    await assert.rejects(
      c.deletePack(p.id, p.version),
      /protected_pack_required/,
    );
  }
  assert.deepEqual(f.disk, before);
  c = f.c();
  await c.initialize();
  assert.deepEqual(f.disk, before);
  for (const state of ['removed', 'cancelled', 'paused_user']) {
    f.disk.installed = [];
    f.disk.jobs.forEach(j => {
      j.state = state;
    });
    f.files.clear();
    c = f.c();
    await c.initialize();
    assert.equal(c.listInstalled().length, 2);
    assert.ok(c.listInstalled().every(p => p.active && p.state === 'ready'));
  }
  assert.equal(f.starts, 0);
});
test('user-downloaded audio can still be removed and is not restored on restart', async () => {
  const audio = {...pack, capabilities: ['audio']};
  const f = fixture([audio]);
  let c = f.c();
  await c.initialize();
  await c.networkChanged({connected: true, wifi: true});
  await c.enqueue(audio.id, audio.version);
  await f.done(c);
  assert.equal(c.listInstalled().length, 1);
  await c.deletePack(audio.id, audio.version);
  c = f.c();
  await c.initialize();
  assert.equal(c.listInstalled().length, 0);
  assert.equal(f.files.size, 0);
});
test('older installed mushafs and translations remain protected even outside the current catalog', async () => {
  for (const capability of ['quran-text', 'translation']) {
    const old = {...pack, capabilities: [capability]};
    const f = fixture([old]);
    let c = f.c();
    await c.initialize();
    await c.networkChanged({connected: true, wifi: true});
    await c.enqueue(old.id, old.version);
    await f.done(c);
    c = new DownloadCoordinator([], f.ports);
    await c.initialize();
    assert.equal(c.isProtectedPack(old.id, old.version), true);
    await assert.rejects(
      c.deletePack(old.id, old.version),
      /protected_pack_required/,
    );
    assert.equal(c.listInstalled().length, 1);
  }
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
