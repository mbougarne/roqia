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
  downloaded = true,
  duration = async () => 50000,
  start = async () => true,
  contentTag = async () => '"verified-recording"';
const platform = {OS: 'android'};
const runtime = {
  catalog: {recordings: [recording]},
  downloads: {listJobs: () => []},
  installed: () => downloaded,
  recordingDuration: (...args) => duration(...args),
  recordingContentTag: (...args) => contentTag(...args),
};
const original = Module._load;
Module._load = function (name, parent, ...rest) {
  if (parent?.filename.endsWith('/quran/ListenScreen.tsx')) {
    if (name === 'react-native') return {Platform: platform};
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
            return start();
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
        bindCachedTiming: async identity =>
          platform.OS === 'ios' && !identity.audioEtag
            ? {status: 'invalid', segments: []}
            : timing,
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
  assert.equal(view.root.findAllByType('Sheet').length, 0);
  await unmount(view);
});
test('slow local verification and playback never open preparation for a saved verse', async () => {
  let finishDuration, finishStart;
  const before = plays.length,
    closedBefore = closed;
  duration = () =>
    new Promise(resolve => {
      finishDuration = resolve;
    });
  start = () =>
    new Promise(resolve => {
      finishStart = resolve;
    });
  const view = await mount();
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 1300));
  });
  assert.equal(
    view.root.findAllByType('Sheet').length,
    0,
    'slow local timing resolution needs no download alert',
  );
  assert.equal(plays.length, before);
  await act(async () => finishDuration(50000));
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 1300));
  });
  assert.equal(plays.length, before + 1);
  assert.equal(closed, closedBefore);
  assert.equal(
    view.root.findAllByType('Sheet').length,
    0,
    'slow integrity verification needs no download alert',
  );
  assert.equal(network, 0);
  await act(async () => finishStart(true));
  assert.equal(closed, closedBefore + 1);
  await unmount(view);
  duration = async () => 50000;
  start = async () => true;
});
test('older iPhone downloads wait for local entity recovery without flashing a download sheet', async () => {
  let finishTag;
  platform.OS = 'ios';
  contentTag = () =>
    new Promise(resolve => {
      finishTag = resolve;
    });
  const before = plays.length,
    closedBefore = closed;
  let view;
  try {
    view = await mount();
    assert.equal(view.root.findAllByType('Sheet').length, 0);
    assert.equal(plays.length, before);
    assert.equal(network, 0);
    await act(async () => finishTag('"verified-recording"'));
    assert.equal(plays.length, before + 1);
    assert.equal(closed, closedBefore + 1);
    assert.equal(view.root.findAllByType('Sheet').length, 0);
    assert.equal(network, 0);
  } finally {
    if (view) await unmount(view);
    platform.OS = 'android';
    contentTag = async () => '"verified-recording"';
  }
});
test('a saved recording that fails playback opens an actionable error instead of remaining hidden', async () => {
  start = async () => undefined;
  const view = await mount();
  assert.equal(view.root.findAllByType('Sheet').length, 1);
  assert.ok(
    view.root
      .findAllByType('Text')
      .some(n => String(n.props.children).includes('تعذر تشغيل الملف')),
  );
  await unmount(view);
  start = async () => true;
});
test('saved timings without the audio file still offer the required download', async () => {
  downloaded = false;
  const before = plays.length;
  const view = await mount();
  assert.equal(view.root.findAllByType('Sheet').length, 1);
  assert.ok(
    view.root
      .findAllByType('Button')
      .some(n => n.props.label.startsWith('تنزيل السورة والتشغيل')),
  );
  assert.equal(plays.length, before);
  assert.equal(network, 0);
  await unmount(view);
  downloaded = true;
});
test('a reciter without local chapter metadata prompts after the saved selection loads', async () => {
  runtime.catalog.recordings = [];
  const before = plays.length;
  const view = await mount();
  assert.equal(view.root.findAllByType('Sheet').length, 1);
  assert.ok(
    view.root
      .findAllByType('Button')
      .some(n => n.props.label === 'تنزيل السورة والتشغيل'),
  );
  assert.equal(plays.length, before);
  assert.equal(network, 0);
  await unmount(view);
  runtime.catalog.recordings = [recording];
});
test('missing timing stays over the reader until explicit preparation; dismissing prevents delayed playback', async () => {
  timing = null;
  const before = plays.length;
  const view = await mount();
  assert.equal(view.root.findAllByType('Sheet').length, 1);
  assert.ok(
    view.root
      .findAllByType('Button')
      .some(n => n.props.label === 'إعادة محاولة تجهيز توقيت الآيات'),
  );
  assert.equal(network, 0);
  assert.equal(plays.length, before);
  const closedBeforeDismiss = closed;
  await act(async () => view.root.findByType('Sheet').props.onClose());
  assert.equal(closed, closedBeforeDismiss + 1);
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
