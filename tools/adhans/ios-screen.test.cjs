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
const sounds = require('../../src/features/prayer/sounds.data.json');

const played = [],
  alerts = [];
let pauses = 0,
  stops = 0,
  reconciliations = 0;
let selected = {normal: null, fajr: null};
const native = {
  previewAdhan: async payload => played.push(JSON.parse(payload)),
  stopAdhan: () => stops++,
};
const load = Module._load;
Module._load = function (name, parent, ...rest) {
  if (parent?.filename.endsWith('/prayer/SoundsScreen.tsx')) {
    if (name === 'react-native')
      return {
        Platform: {OS: 'ios'},
        Alert: {alert: (...args) => alerts.push(args)},
      };
    if (name === './service')
      return {
        reconcilePrayer: async () => reconciliations++,
        requestPrayerPermission: () => {
          throw Error('preview_must_not_request_notifications');
        },
        openPrayerSettings: async () => {},
      };
    if (name === './sounds')
      return {
        sounds,
        selectedSounds: async () => selected,
        selectSound: async sound => {
          selected = {normal: sound.id, fajr: sound.id};
        },
        localSound: async sound => ({
          ...sound.bundled,
          path: '/bundle/' + sound.bundled.resource + '.mp3',
        }),
        adhanNative: () => native,
        bundledSoundAvailable: () => true,
      };
    if (name.endsWith('/design/components'))
      return Object.fromEntries(
        ['Banner', 'Group', 'SettingRow', 'RadioRow'].map(n => [n, n]),
      );
    if (name.endsWith('/design/ui'))
      return Object.fromEntries(
        ['Page', 'IconButton', 'Button'].map(n => [n, n]),
      );
    if (name.endsWith('/design/useFormat'))
      return {useFormat: () => ({number: String})};
    if (name === '../audio/controller')
      return {playback: {pause: async () => pauses++}};
    if (name === '../quran/context')
      return {useOnFocus: (fn, deps) => React.useEffect(fn, deps)};
  }
  return load.call(this, name, parent, ...rest);
};
const {SoundsScreen} = require('../../src/features/prayer/SoundsScreen.tsx');

Module._load = load;
test('all six iPhone previews work without notification permission and stop on leaving the screen', async () => {
  let view;
  await act(async () => {
    view = create(
      React.createElement(SoundsScreen, {navigation: {goBack() {}}}),
    );
  });
  assert.equal(view.root.findAllByType('RadioRow').length, 6);
  assert.ok(
    view.root.findAllByType('RadioRow').every(row => !row.props.disabled),
  );
  const playButtons = () =>
    view.root
      .findAllByType('IconButton')
      .filter(button => button.props.name === 'play');
  for (let i = 0; i < sounds.length; i++) {
    await act(async () => playButtons()[i].props.onPress());
    assert.equal(played.at(-1).sha256, sounds[i].bundled.sha256);
  }
  assert.equal(pauses, 6);
  assert.deepEqual(alerts, []);
  await act(async () => view.root.findAllByType('RadioRow')[4].props.onPress());
  assert.equal(view.root.findAllByType('RadioRow')[4].props.selected, true);
  assert.equal(reconciliations, 1);
  await act(async () => view.unmount());
  assert.equal(stops, 1);
});
