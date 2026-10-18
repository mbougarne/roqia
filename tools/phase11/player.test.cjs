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
  session = null;
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
      State: {},
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
      readRecord: async (c, id) =>
        c === 'playback'
          ? session
          : c === 'installed'
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
              },
    };
  if (name.endsWith('assets/audio')) return {audioAssets: {}};
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
