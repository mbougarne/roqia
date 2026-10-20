require('../foundation/register.cjs');
const {test} = require('node:test'),
  assert = require('node:assert/strict'),
  Module = require('node:module'),
  {DatabaseSync} = require('node:sqlite');

const db = new DatabaseSync(':memory:');
let writes = 0,
  failAt = 0;
const execute = async (q, a = []) => {
  if (/^(INSERT|DELETE)/.test(q)) {
    writes++;
    if (failAt === writes) throw Error('disk_full');
  }
  return {rows: db.prepare(q).all(...a)};
};
const adapter = {
  execute,
  transaction: async fn => {
    db.exec('BEGIN');
    try {
      await fn({execute});
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  },
};
const load = Module._load;
const platform = {OS: 'android'},
  completedSessions = [],
  configs = [],
  requests = [],
  started = [];
const transport = {
  completeHandler: async id => completedSessions.push(id),
  setConfig: value => configs.push(value),
  createDownloadTask: request => {
    requests.push(request);
    const task = {id: request.id, start: () => started.push(request.id)};
    for (const event of ['begin', 'progress', 'done', 'error'])
      task[event] = () => task;
    return task;
  },
};
Module._load = function (name, parent, isMain) {
  if (name === 'react-native') return {NativeModules: {}, Platform: platform};
  if (name === '@kesha-antonov/react-native-background-downloader')
    return transport;
  if (name === '@op-engineering/op-sqlite') return {open: () => adapter};
  if (name === 'react-native-file-access')
    return {Dirs: {DocumentDir: '/test'}, FileSystem: {}};
  if (name.endsWith('audio/controller')) return {playback: {}};
  return load.call(this, name, parent, isMain);
};
const {nativeDownloadPorts} = require('../../src/features/downloads/native.ts');

test('full Quran registry commits only changed rows and rolls back an interrupted multi-collection snapshot', async () => {
  const jobs = Array.from({length: 460}, (_, i) => ({
    jobId: `job${i}`,
    state: 'queued',
    bytesReceived: 0,
  }));
  await nativeDownloadPorts.commit(jobs, [], []);
  assert.equal(writes, 460);
  writes = 0;
  await nativeDownloadPorts.commit(jobs, [], []);
  assert.equal(writes, 0);
  jobs[2].bytesReceived = 100;
  await nativeDownloadPorts.commit(jobs, [], []);
  assert.equal(writes, 1);
  const before = JSON.stringify(await nativeDownloadPorts.load());
  writes = 0;
  failAt = 2;
  jobs[2].bytesReceived = 200;
  await assert.rejects(
    nativeDownloadPorts.commit(
      jobs,
      [{packId: 'pack', version: '1', state: 'ready'}],
      [],
    ),
    /disk_full/,
  );
  assert.equal(JSON.stringify(await nativeDownloadPorts.load()), before);
  failAt = 0;
  writes = 0;
  await nativeDownloadPorts.commit(jobs.slice(1), [], []);
  assert.equal(writes, 2);
  assert.equal((await nativeDownloadPorts.load()).jobs.length, 459);
});

test('iOS background completion waits for the download journal and Android does not use it', async () => {
  const callbacks = {};
  const task = {id: 'ios-download'};
  for (const event of ['begin', 'progress', 'done', 'error'])
    task[event] = fn => {
      callbacks[event] = fn;
      return task;
    };
  let finish;
  const committed = new Promise(resolve => {
    finish = resolve;
  });
  nativeDownloadPorts.attach(task, {
    begin() {},
    progress() {},
    done: () => committed,
    error: () => committed,
  });
  platform.OS = 'ios';
  callbacks.done();
  await new Promise(setImmediate);
  assert.deepEqual(completedSessions, []);
  finish();
  await new Promise(setImmediate);
  assert.deepEqual(completedSessions, ['ios-download']);
  callbacks.error({errorCode: 404});
  await new Promise(setImmediate);
  assert.deepEqual(completedSessions, ['ios-download', 'ios-download']);
  platform.OS = 'android';
  callbacks.done();
  await new Promise(setImmediate);
  assert.equal(completedSessions.length, 2);
});

test('mixed iOS download policies do not reset the background session and Android retains its configuration', () => {
  const events = {begin() {}, progress() {}, done() {}, error() {}};
  for (const os of ['ios', 'android']) {
    platform.OS = os;
    for (const policy of ['wifi', 'any']) {
      const id = `${os}-${policy}`;
      nativeDownloadPorts.start(
        {
          nativeTaskId: id,
          consentNetworkPolicy: policy,
          relativeTempPath: `staging/${id}.part`,
          jobId: id,
          generation: 1,
        },
        {url: 'https://example.invalid/source', bytes: 100},
        events,
      );
      const config = configs.at(-1),
        request = requests.at(-1);
      assert.equal(request.isAllowedOverMetered, policy === 'any');
      assert.equal(started.at(-1), id);
      if (os === 'ios') {
        assert.equal('maxParallelDownloads' in config, false);
        assert.equal('allowsCellularAccess' in config, false);
      } else {
        assert.equal(config.maxParallelDownloads, 2);
        assert.equal(config.allowsCellularAccess, policy === 'any');
      }
    }
  }
});
