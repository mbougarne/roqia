require('./register.cjs');
const {test} = require('node:test'),
  assert = require('node:assert/strict'),
  Module = require('node:module');

let queue = [{id: 'persisted-paused', url: 'file:///private/audio.mp3'}],
  state = 'paused',
  removed = false;
const player = {
  getQueue: async () => queue,
  getProgress: async () => ({position: 0}),
  getRepeatMode: async () => 0,
  getRate: async () => 1,
  getActiveTrack: async () => queue[0],
  getPlaybackState: async () => ({state}),
  reset: async () => {
    queue = [];
    state = 'none';
  },
  setupPlayer: async () => {},
  updateOptions: async () => {},
  add: async tracks => {
    queue.push(...(Array.isArray(tracks) ? tracks : [tracks]));
  },
  play: async () => {
    state = 'playing';
  },
  pause: async () => {
    state = 'paused';
  },
};
const load = Module._load;
Module._load = function (name, parent, isMain) {
  if (name === 'react')
    return {useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot()};
  if (name === 'react-native')
    return {Image: {resolveAssetSource: asset => ({uri: asset})}};
  if (name === 'react-native-track-player')
    return {
      __esModule: true,
      default: player,
      State: {Playing: 'playing', Buffering: 'buffering', Loading: 'loading'},
      useActiveTrack: () => queue[0],
      usePlaybackState: () => ({state}),
      Capability: {},
      AppKilledPlaybackBehavior: {ContinuePlayback: 1},
    };
  if (name.endsWith('/repositories/database'))
    return {saveRecord: async () => {}, readRecord: async () => null};
  if (name === 'react-native-file-access')
    return {Dirs: {DocumentDir: '/private'}, FileSystem: {}};
  return load.call(this, name, parent, isMain);
};
require.extensions['.mp3'] = (module, file) => {
  module.exports = file;
};
const {playback} = require('../../src/features/audio/controller.ts'),
  {adkarData, data} = require('../../src/data/index.ts');

test('deletion stops an already-native paused queue even before this JS controller sets up', async () => {
  await playback.releaseFiles(['/private/audio.mp3'], async () => {
    assert.equal(queue.length, 0);
    removed = true;
  });
  assert.ok(removed);
});
test('single shared player toggles, replaces queues, preserves arrays and stops explicitly', async () => {
  await playback.all(data, 'ruqya');
  assert.equal(state, 'playing');
  const original = queue.length;
  assert.ok(original > data.length);
  await playback.all(data, 'ruqya');
  assert.equal(state, 'paused');
  assert.equal(queue.length, original);
  const array = adkarData.find(item => item.audioArray?.length);
  assert.ok(array);
  await playback.single([array], 'adhkar', array.audioArray[0].fileName);
  assert.equal(queue.length, 1);
  assert.equal(queue[0].audioFile, array.audioArray[0].fileName);
  await playback.stop();
  assert.equal(queue.length, 0);
});

test('a saved single-item reader does not toggle the containing full-list queue', async () => {
  const {
    useHomeAudioPlayback,
  } = require('../../src/hooks/useHomeAudioPlayback.ts');
  await playback.all(data, data[0].id);
  const full = useHomeAudioPlayback(data);
  const item = useHomeAudioPlayback([data[0]], `devotional-item:${data[0].id}`);
  assert.equal(full.isPlaylistActive, true);
  assert.equal(item.isPlaylistActive, false);
  await item.onPlayAllPress();
  assert.equal(queue.length, data[0].repeat);
  assert.equal(queue[0].scope, `devotional-item:${data[0].id}`);
  assert.equal(state, 'playing');
  await playback.stop();
});
