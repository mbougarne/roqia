require('./register.cjs');
const {test} = require('node:test'),
  assert = require('node:assert/strict');
const {
  DownloadCoordinator,
} = require('../../src/features/downloads/coordinator.ts');
const {validateCatalog} = require('../../src/features/downloads/types.ts');
const hash = 'a'.repeat(64);
const pack = (id = 'fixture', count = 1, version = '1') => ({
  id,
  version,
  title: id,
  manifestHash: hash,
  review: 'approved',
  capabilities: ['audio'],
  sourceMetadata: {source: 'synthetic-test-only'},
  assets: Array.from({length: count}, (_, i) => ({
    id: 'asset' + i,
    file: `asset${i}.mp3`,
    url: `https://example.invalid/${i}.mp3`,
    bytes: 100,
    sha256: hash,
    mime: 'audio/mpeg',
  })),
});
function fixture(catalog) {
  let disk = {jobs: [], installed: [], journals: []},
    files = new Map(),
    tasks = new Map(),
    free = 1e9,
    time = 10000,
    failCommit = false,
    released = [];
  const ports = {
    load: async () => structuredClone(disk),
    commit: async (jobs, installed, journals) => {
      if (failCommit && installed.some(p => p.state === 'ready')) {
        failCommit = false;
        throw Error('crash_before_activation');
      }
      disk = structuredClone({jobs, installed, journals});
    },
    existing: async () => [...tasks.values()],
    attach: (task, e) => {
      task.events = e;
    },
    start: (job, asset, events) => {
      const t = {
        id: job.nativeTaskId,
        state: 'PENDING',
        events,
        path: job.relativeTempPath,
        pause: async () => {
          t.state = 'PAUSED';
        },
        resume: async () => {
          t.state = 'DOWNLOADING';
        },
        stop: async () => {
          t.state = 'STOPPED';
          tasks.delete(t.id);
        },
      };
      tasks.set(t.id, t);
      return t;
    },
    exists: async p => files.has(p),
    size: async p => files.get(p)?.size ?? 0,
    verify: async p => {
      if (
        !files.has(p) ||
        files.get(p).hash !== hash ||
        files.get(p).size !== 100
      )
        throw Error('integrity_failed');
    },
    move: async (a, b) => {
      if (!files.has(a)) throw Error('missing');
      files.set(b, files.get(a));
      files.delete(a);
    },
    remove: async p => {
      files.delete(p);
    },
    free: async () => free,
    release: async (paths, remove) => {
      released.push(...paths);
      await remove();
    },
    now: () => time,
  };
  const coordinator = () => new DownloadCoordinator(catalog, ports);
  const done = async (c, t, valid = true) => {
    files.set(t.path, {size: 100, hash: valid ? hash : 'bad'});
    t.state = 'DONE';
    t.events.done();
    await c.usage();
  };
  return {
    coordinator,
    ports,
    files,
    tasks,
    done,
    get disk() {
      return disk;
    },
    set free(v) {
      free = v;
    },
    set time(v) {
      time = v;
    },
    set failCommit(v) {
      failCommit = v;
    },
    released,
  };
}
test('catalog rejects drafts, traversal, duplicate files and non-HTTPS URLs', () => {
  for (const change of [
    p => (p.review = 'draft'),
    p => (p.assets[0].file = '../evil'),
    p => (p.assets[0].url = 'http://evil/file'),
    p => (p.assets[0].sha256 = 'no'),
    p => p.assets.push({...p.assets[0]}),
  ]) {
    const p = pack();
    change(p);
    assert.throws(() => validateCatalog([p]));
  }
});
test('deduplicates jobs, bounds concurrency and activates an entire pack together', async () => {
  const p = pack('three', 3),
    f = fixture([p]),
    c = f.coordinator();
  await c.initialize();
  await c.enqueue(p.id, p.version);
  await c.enqueue(p.id, p.version);
  assert.equal(c.listJobs().length, 3);
  assert.equal(f.tasks.size, 2);
  await f.done(c, [...f.tasks.values()][0]);
  assert.equal(c.listInstalled().length, 0);
  assert.equal(f.tasks.size, 2);
  await f.done(c, [...f.tasks.values()][0]);
  await f.done(c, [...f.tasks.values()][0]);
  assert.equal(c.listInstalled()[0].state, 'ready');
  assert.ok(c.listJobs().every(j => j.state === 'ready'));
});
test('cancel race ignores stale progress and completion without publishing bytes', async () => {
  const p = pack(),
    f = fixture([p]),
    c = f.coordinator();
  await c.initialize();
  await c.enqueue(p.id, p.version);
  const task = [...f.tasks.values()][0];
  await c.cancel(c.listJobs()[0].jobId);
  task.events.progress(100);
  task.events.done();
  await c.usage();
  assert.equal(c.listJobs()[0].state, 'cancelled');
  assert.equal(c.listInstalled().length, 0);
});
test('user pause survives process recreation and never becomes network wait', async () => {
  const p = pack(),
    f = fixture([p]),
    c = f.coordinator();
  await c.initialize();
  await c.enqueue(p.id, p.version);
  await c.pause(c.listJobs()[0].jobId);
  const next = f.coordinator();
  await next.initialize();
  assert.equal(next.listJobs()[0].state, 'paused_user');
  assert.equal([...f.tasks.values()][0].state, 'PAUSED');
  await next.resume(next.listJobs()[0].jobId);
  assert.equal(next.listJobs()[0].state, 'waiting_network');
  assert.equal(next.listJobs()[0].consentNetworkPolicy, 'wifi');
  await next.cancel(next.listJobs()[0].jobId);
});
test('corrupt/HTML-equivalent bytes cannot activate despite transport success', async () => {
  const p = pack(),
    f = fixture([p]),
    c = f.coordinator();
  await c.initialize();
  await c.enqueue(p.id, p.version);
  await f.done(c, [...f.tasks.values()][0], false);
  assert.equal(c.listJobs()[0].state, 'failed');
  assert.equal(c.listInstalled().length, 0);
});
test('rename before activation commit recovers from the journal after process death', async () => {
  const p = pack(),
    f = fixture([p]),
    c = f.coordinator();
  await c.initialize();
  await c.enqueue(p.id, p.version);
  f.failCommit = true;
  await f.done(c, [...f.tasks.values()][0]);
  assert.equal(f.disk.installed.length, 0);
  const next = f.coordinator();
  await next.initialize();
  assert.equal(next.listInstalled()[0].state, 'ready');
  assert.equal(f.disk.journals.length, 0);
});
test('low-space rejection and missing-file reconciliation never report ready', async () => {
  const p = pack(),
    f = fixture([p]),
    c = f.coordinator();
  await c.initialize();
  f.free = 10;
  await c.enqueue(p.id, p.version);
  assert.equal(c.listJobs()[0].errorCode, 'insufficient_space');
  assert.equal(f.tasks.size, 0);
  f.free = 1e9;
  await c.resume(c.listJobs()[0].jobId);
  await f.done(c, [...f.tasks.values()][0]);
  f.files.clear();
  const next = f.coordinator();
  await next.initialize();
  assert.equal(next.listInstalled()[0].state, 'missing');
  assert.equal(next.listJobs()[0].state, 'failed');
});
test('selected deletion releases playback first and preserves unrelated pack bytes', async () => {
  const a = pack('a'),
    b = pack('b'),
    f = fixture([a, b]),
    c = f.coordinator();
  await c.initialize();
  await c.enqueue('a', '1');
  await c.enqueue('b', '1');
  for (const t of [...f.tasks.values()]) await f.done(c, t);
  assert.equal((await c.usage()).installed, 200);
  await c.deletePack('a', '1');
  assert.equal((await c.usage()).installed, 100);
  assert.equal(c.listInstalled()[0].packId, 'b');
  assert.deepEqual(f.released, ['content/a/1/asset0.mp3']);
});

test('network return resumes only network-waiting jobs and preserves user pause', async () => {
  const a = pack('network'),
    b = pack('manual'),
    f = fixture([a, b]),
    c = f.coordinator();
  await c.initialize();
  await c.networkChanged({connected: false, wifi: false});
  await c.enqueue('network', '1');
  await c.enqueue('manual', '1');
  assert.equal(f.tasks.size, 0);
  assert.ok(c.listJobs().every(j => j.state === 'waiting_network'));
  await c.pause(c.listJobs().find(j => j.packId === 'manual').jobId);
  await c.networkChanged({connected: true, wifi: true});
  assert.equal(
    c.listJobs().find(j => j.packId === 'manual').state,
    'paused_user',
  );
  assert.equal(f.tasks.size, 1);
  await f.done(c, [...f.tasks.values()][0]);
  assert.equal(c.listInstalled()[0].packId, 'network');
});

test('interrupted deletion finishes idempotently after restart', async () => {
  const p = pack('delete-recovery', 2),
    f = fixture([p]),
    c = f.coordinator();
  await c.initialize();
  await c.enqueue(p.id, p.version);
  for (const t of [...f.tasks.values()]) await f.done(c, t);
  const remove = f.ports.remove;
  let fail = true;
  f.ports.remove = async file => {
    if (fail && file.endsWith('asset1.mp3')) {
      fail = false;
      throw Error('interrupted_delete');
    }
    await remove(file);
  };
  await assert.rejects(c.deletePack(p.id, p.version));
  assert.equal(f.disk.installed[0].state, 'deleting');
  const next = f.coordinator();
  await next.initialize();
  assert.equal(next.listInstalled().length, 0);
  assert.equal(f.files.size, 0);
  assert.equal(f.disk.journals.length, 0);
});

test('catalog changes retain verified installed versions and removed job history', async () => {
  const p = pack('old-version'),
    f = fixture([p]),
    c = f.coordinator();
  await c.initialize();
  await c.enqueue(p.id, p.version);
  await f.done(c, [...f.tasks.values()][0]);
  const next = new DownloadCoordinator([], f.ports);
  await next.initialize();
  assert.equal(next.listJobs()[0].state, 'ready');
  assert.equal(next.listInstalled()[0].state, 'ready');
  await next.deletePack(p.id, p.version);
  const reopened = new DownloadCoordinator([], f.ports);
  await reopened.initialize();
  assert.equal(reopened.listJobs()[0].state, 'removed');
  assert.equal(reopened.listInstalled().length, 0);
});

test('source import activates only after derived files verify; removal and explicit re-download cover every file', async () => {
  const p=pack('source');p.preparation={kind:'quran-source-v1',sourceAssetId:'asset0'};
  p.derivedAssets=[{id:'chapter',file:'001.json',bytes:100,sha256:hash,mime:'application/json'}];
  const f=fixture([p]);let prepared=0;
  f.ports.prepare=async (_p,dir)=>{prepared++;assert.equal(f.disk.installed[0].state,'installing');f.files.set(`${dir}/001.json`,{size:100,hash});};
  const c=f.coordinator();await c.initialize();await c.enqueue(p.id,p.version);await f.done(c,[...f.tasks.values()][0]);
  assert.equal(prepared,1);assert.equal(c.listInstalled()[0].state,'ready');assert.equal(c.listInstalled()[0].files.length,2);
  await c.deletePack(p.id,p.version);assert.equal(f.files.size,0);
  await c.enqueue(p.id,p.version);assert.equal(f.tasks.size,1);await f.done(c,[...f.tasks.values()][0]);assert.equal(prepared,2);assert.equal(c.listInstalled()[0].state,'ready');
});
test('failed source import is not readable; restart and retry rebuild derived files', async () => {
  const p=pack('source-failed');p.preparation={kind:'quran-source-v1',sourceAssetId:'asset0'};
  p.derivedAssets=[{id:'chapter',file:'001.json',bytes:100,sha256:hash,mime:'application/json'}];
  const f=fixture([p]);f.ports.prepare=async(_p,dir)=>{f.files.set(`${dir}/001.json`,{size:100,hash:'bad'});};
  let c=f.coordinator();await c.initialize();await c.enqueue(p.id,p.version);await f.done(c,[...f.tasks.values()][0]);
  assert.equal(c.listJobs()[0].state,'failed');assert.equal(c.listInstalled()[0].state,'installing');
  c=f.coordinator();await c.initialize();f.ports.prepare=async(_p,dir)=>{f.files.set(`${dir}/001.json`,{size:100,hash});};
  await c.enqueue(p.id,p.version);await f.done(c,[...f.tasks.values()][0]);assert.equal(c.listInstalled()[0].state,'ready');
});
test('a failed source update preserves the active old version and cancellation removes partial outputs', async () => {
 const old=pack('source-update',1,'1'),next=pack('source-update',1,'2');
 next.preparation={kind:'quran-source-v1',sourceAssetId:'asset0'};next.derivedAssets=[{id:'chapter',file:'001.json',bytes:100,sha256:hash,mime:'application/json'}];
 const f=fixture([old,next]);const c=f.coordinator();await c.initialize();await c.enqueue(old.id,old.version);await f.done(c,[...f.tasks.values()][0]);
 f.ports.prepare=async(_p,dir)=>{f.files.set(`${dir}/001.json.import`,{size:100,hash});throw Error('interrupted_import');};
 await c.enqueue(next.id,next.version);await f.done(c,[...f.tasks.values()][0]);
 assert.equal(c.listInstalled().find(p=>p.version==='1').active,true);assert.equal(c.listInstalled().find(p=>p.version==='2').state,'installing');
 await c.cancel(c.listJobs().find(j=>j.version==='2').jobId);assert.equal(c.listInstalled().length,1);assert.ok([...f.files.keys()].every(p=>!p.includes('/2/')));
});
