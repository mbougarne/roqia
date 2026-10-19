require('../foundation/register.cjs');
const {test} = require('node:test'),
  assert = require('node:assert/strict'),
  Module = require('node:module');

let deadline = 0;
let queue = [],
  state = 'none',
  position = 0,
  index = 0,
  rate = 1,
  repeat = 0,
  plays = 0,
  corrupt = false,
  session = null,
  sessionReadGate;
const player = {
  setupPlayer: async () => {},
  updateOptions: async () => {},
  reset: async () => {
    queue = [];
    state = 'none';
  },
  add: async tracks => {
    queue = tracks;
  },
  skip: async i => {
    index = i;
  },
  seekTo: async n => {
    position = n;
  },
  pause: async () => {
    state = 'paused';
  },
  play: async () => {
    state = 'playing';
    plays++;
  },
  getActiveTrack: async () => queue[index],
  getQueue: async () => queue,
  getProgress: async () => ({position}),
  getPlaybackState: async () => ({state}),
  getRepeatMode: async () => repeat,
  getRate: async () => rate,
  setRepeatMode: async n => {
    repeat = n;
  },
  setRate: async n => {
    rate = n;
  },
};
const load = Module._load;
Module._load = function (name, parent, isMain) {
  if (name === 'react-native')
    return {
      Image: {},
      Platform: {OS: 'android'},
      NativeModules: {
        RoqiaAudio: {
          segmentPlayback: true,
          sleepDeadline: async () => deadline,
          setSleepTimer: async ms => {
            deadline = ms ? Date.now() + ms : 0;
          },
        },
      },
    };
  if (name === 'react-native-track-player')
    return {
      __esModule: true,
      default: player,
      Capability: {},
      AppKilledPlaybackBehavior: {},
      State: {Ended: 'ended'},
      RepeatMode: {Off: 0, Track: 1, Queue: 2},
    };
  if (name === 'react-native-file-access')
    return {
      Dirs: {DocumentDir: '/private'},
      FileSystem: {
        exists: async () => true,
        stat: async () => ({size: 10}),
        hash: async () => (corrupt ? 'bad' : 'hash'),
      },
    };
  if (name.endsWith('repositories/database'))
    return {
      saveRecord: async (_c, _i, s) => {
        session = s;
      },
      readRecord: async (c, id) => {
        if (c === 'playback') {
          const saved = session;
          await sessionReadGate;
          return saved;
        }
        return c === 'installed'
          ? {
              state: 'ready',
              capabilities: ['audio'],
              files: ['packs/a.mp3', 'packs/b.mp3'],
            }
          : {
              state: 'ready',
              relativeFinalPath: id.includes('.a@')
                ? 'packs/a.mp3'
                : 'packs/b.mp3',
              expectedBytes: 10,
              expectedHash: 'hash',
              jobId: id,
            };
      },
    };
  if (name.endsWith('assets/audio')) return {audioAssets: {'test.mp3': 701}};
  return load.call(this, name, parent, isMain);
};
const {
  playback,
  persistPlayback,
  restoreDownloadedSession,
  audioErrors,
} = require('../../src/features/audio/controller.ts');

test('queue changes save a recoverable session immediately and preserve native sleep across unrelated deletion', async () => {
  const entries = ['a', 'b'].map(assetId => ({
    packId: 'pack',
    version: 'v1',
    assetId,
    title: assetId,
  }));
  await playback.downloaded(entries);
  assert.deepEqual(session.downloadEntries, entries);
  await playback.sleep(15);
  assert.equal(session.sleepDeadlineUtc, deadline);
  assert.ok(deadline > Date.now());
  const previous = queue;
  let deleted = false;
  await playback.releaseFiles(['/private/roqia/packs/other.mp3'], async () => {
    deleted = true;
  });
  assert.equal(deleted, true);
  assert.equal(queue, previous);
  assert.ok(deadline > 0);
});
test('deleting a queued file clears native playback, sleep deadline and saved restore entry atomically with playback commands', async () => {
  let deleted = false;
  const pending = persistPlayback();
  await playback.releaseFiles(['/private/roqia/packs/b.mp3'], async () => {
    deleted = true;
  });
  await pending;
  assert.equal(deleted, true);
  assert.equal(queue.length, 0);
  assert.equal(deadline, 0);
  assert.equal(session, null);
  await persistPlayback();
  assert.equal(session, null, 'late progress cannot recreate deleted session');
});

test('bundled playback preserves require handles for native raw resource resolution', async () => {
  const item = {
    id: 'bundled-test',
    caption: 'Bundled',
    audioFile: 'test.mp3',
    repeat: 2,
  };
  await playback.all([item], 'bundled-test');
  assert.equal(queue.length, 2);
  assert.equal(queue[0].url, 701);
  assert.equal(queue[1].url, 701);
  assert.equal(state, 'playing');
});
test('verse playback clips the same local file and session restoration retains boundaries with segment-relative seek', async () => {
  const segment = {verse: 2, startMs: 13240, endMs: 18720};
  const entry = {
    packId: 'pack',
    version: 'v1',
    assetId: 'a',
    title: 'Reciter · Surah',
    segment,
  };
  const {
    restoreDownloadedSession,
  } = require('../../src/features/audio/controller.ts');
  await playback.downloaded([entry]);
  assert.equal(queue[0].url, 'file:///private/roqia/packs/a.mp3');
  assert.equal(queue[0].roqiaClipStartMs, 13240);
  assert.equal(queue[0].roqiaClipEndMs, 18720);
  assert.deepEqual(session.downloadEntries, [entry]);
  session.positionMs = 2000;
  await restoreDownloadedSession();
  assert.equal(position, 2);
  assert.equal(state, 'paused');
  const playsBefore = plays;
  await playback.downloaded([{...entry, segment: {...segment, endMs: 0}}]);
  assert.equal(plays, playsBefore);
  await playback.downloaded([{...entry, segment: undefined}]);
  assert.equal(queue[0].roqiaClipStartMs, undefined);
  assert.equal(repeat, 0);
});
test('remote play restarts an ended local segment at its relative zero', async () => {
  await playback.downloaded([
    {
      packId: 'pack',
      version: 'v1',
      assetId: 'a',
      title: 'Reciter · Surah',
      segment: {verse: 1, startMs: 7200, endMs: 10460},
    },
  ]);
  state = 'ended';
  position = 3.26;
  await playback.play();
  assert.equal(position, 0);
  assert.equal(state, 'playing');
  assert.equal(queue[0].roqiaClipStartMs, 7200);
});

test('a dismissed or superseded reader request cannot replace playback after file verification', async () => {
  const previous = queue,
    playsBefore = plays;
  await playback.downloaded(
    [
      {
        packId: 'pack',
        version: 'v1',
        assetId: 'b',
        title: 'Old reader request',
      },
    ],
    {isCurrent: () => false},
  );
  assert.equal(queue, previous);
  assert.equal(plays, playsBefore);
  assert.equal(audioErrors.getSnapshot(), null);
  let checks = 0;
  await playback.downloaded(
    [
      {
        packId: 'pack',
        version: 'v1',
        assetId: 'b',
        title: 'Dismissed during setup',
      },
    ],
    {isCurrent: () => ++checks === 1},
  );
  assert.equal(checks, 2);
  assert.equal(plays, playsBefore, 'dismissal during setup cannot start audio');
});

test('closing playing or paused audio clears queue, sleep and restore state despite late progress', async () => {
  for (const paused of [false, true]) {
    await playback.downloaded([
      {packId: 'pack', version: 'v1', assetId: 'a', title: 'Saved recording'},
    ]);
    await playback.sleep(15);
    if (paused) await playback.pause();
    const pendingProgress = persistPlayback();
    await playback.stop();
    await pendingProgress;
    await persistPlayback();
    assert.deepEqual(queue, []);
    assert.equal(deadline, 0);
    assert.equal(session, null);
    await assert.rejects(restoreDownloadedSession(), /no_download_session/);
  }
});

test('closing audio invalidates a restore that is still reading its old saved session', async () => {
  await playback.downloaded([
    {packId: 'pack', version: 'v1', assetId: 'a', title: 'Saved recording'},
  ]);
  let finishRead;
  sessionReadGate = new Promise(resolve => {
    finishRead = resolve;
  });
  const restoring = restoreDownloadedSession();
  const rejected = assert.rejects(restoring, /no_download_session/);
  await playback.stop();
  finishRead();
  await rejected;
  sessionReadGate = undefined;
  await persistPlayback();
  assert.deepEqual(queue, []);
  assert.equal(session, null);
  assert.equal(deadline, 0);
});
