require('../foundation/register.cjs');
const {test} = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  ts = require('typescript'),
  Module = require('node:module'),
  React = require('react'),
  {act, create} = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
require.extensions['.tsx'] = (module, file) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
      },
    }).outputText,
    file,
  );
const recording =
  require('../../src/features/quran/catalog.ts').quranCatalog.recordings.find(
    r => r.id === 'mp3quran-120-warsh',
  );
let plays = [],
  network = 0,
  closed = 0,
  timing = null,
  duration = async () => 50000;
const runtime = {
  catalog: {recordings: [recording]},
  downloads: {listJobs: () => []},
  installed: () => true,
  recordingDuration: (...args) => duration(...args),
};
const original = Module._load;
Module._load = function (name, parent, ...rest) {
  if (parent?.filename.endsWith('/quran/ListenScreen.tsx')) {
    if (name === '@react-navigation/native')
      return {useFocusEffect: cb => React.useEffect(cb, [cb])};
    if (name.endsWith('/design/ui'))
      return {
        AppText: 'Text',
        Button: 'Button',
        StateView: 'State',
        Sheet: ({visible, children, ...p}) =>
          visible ? React.createElement('Sheet', p, children) : null,
      };
    if (name.endsWith('/design/components'))
      return Object.fromEntries(
        [
          'Banner',
          'Group',
          'Progress',
          'RadioRow',
          'SettingRow',
          'SearchField',
        ].map(k => [k, k]),
      );
    if (name.endsWith('/design/format')) return {number: String, bytes: String};
    if (name.endsWith('/repositories/database'))
      return {readRecord: async () => recording.id, saveRecord: async () => {}};
    if (name === '../audio/Player')
      return {
        PlayerScreen: () => {
          throw Error('reader must not render a player screen');
        },
      };
    if (name === '../audio/controller')
      return {
        segmentPlaybackSupported: () => true,
        playback: {
          downloaded: async (entries, options) => {
            if (!options.isCurrent()) return;
            plays.push(entries);
            return true;
          },
        },
      };
    if (name === './context')
      return {
        useLibrary: () => ({runtime, ready: true, error: false, revision: 0}),
      };
    if (name === './remoteRecordings')
      return {
        remoteRecordings:
          require('../../src/features/quran/remote-recordings.data.json').recordings.map(
            r => ({...r, surahs: r.surahs.split(',').map(Number)}),
          ),
        prepareRemoteRecording: async () => {
          network++;
          throw Error('unexpected network');
        },
      };
    if (name === './timingCache')
      return {
        cachedTiming: async () => timing,
        bindCachedTiming: async () => timing,
        prepareTiming: async () => {
          network++;
          return timing;
        },
        prepareTimingSource: async () => {
          network++;
        },
      };
  }
  return original.call(this, name, parent, ...rest);
};
const {ReaderVerseAudio} = require('../../src/features/quran/ListenScreen.tsx');
Module._load = original;
async function mount(verse = 1) {
  let view;
  await act(async () => {
    view = create(
      React.createElement(ReaderVerseAudio, {
        editionId: 'warsh-kfgqpc-v2.1-update6',
        surah: 1,
        verse,
        onClose: () => closed++,
      }),
    );
  });
  return view;
}
async function unmount(view) {
  await act(async () => view.unmount());
}
test('a cached verse plays locally without rendering the player or requesting timing', async () => {
  timing = {
    status: 'ready',
    segments: [{verse: 1, startMs: 13240, endMs: 18720}],
  };
  const view = await mount();
  assert.equal(plays.length, 1);
  assert.deepEqual(plays[0][0].segment, timing.segments[0]);
  assert.equal(closed, 1);
  assert.equal(network, 0);
  assert.equal(
    view.toJSON(),
    null,
    'no preparation sheet flashes for a cached verse',
  );
  await unmount(view);
});
test('missing timing stays over the reader until explicit preparation; dismissing prevents delayed playback', async () => {
  timing = null;
  const before = plays.length;
  const view = await mount();
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 370));
  });
  assert.equal(view.root.findAllByType('Sheet').length, 1);
  assert.ok(
    view.root
      .findAllByType('Button')
      .some(n => n.props.label === 'إعادة محاولة تجهيز توقيت الآيات'),
  );
  assert.equal(network, 0);
  assert.equal(plays.length, before);
  await act(async () => view.root.findByType('Sheet').props.onClose());
  assert.equal(closed, 2);
  await unmount(view);
  let complete;
  duration = () =>
    new Promise(resolve => {
      complete = resolve;
    });
  timing = {
    status: 'ready',
    segments: [{verse: 1, startMs: 13240, endMs: 18720}],
  };
  const pending = await mount();
  await unmount(pending);
  await act(async () => complete(50000));
  assert.equal(
    plays.length,
    before,
    'unmounted readers cannot start a delayed verse',
  );
});
