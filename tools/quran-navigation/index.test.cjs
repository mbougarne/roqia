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
let savedKind = 'surah',
  restoredKind = null;
const runtime = {
  indexKind: () => restoredKind ?? Promise.resolve(savedKind),
  setIndexKind: async k => {
    savedKind = k;
  },
};
const load = Module._load;
Module._load = function (name, parent, ...rest) {
  if (parent?.filename.endsWith('/quran/QuranIndex.tsx')) {
    if (name === 'react-native') return {View: 'View'};
    if (name === './context') return {useLibrary: () => ({runtime})};
    if (name.endsWith('/design/components'))
      return {
        Group: 'Group',
        SettingRow: 'SettingRow',
        SearchField: 'SearchField',
        Segments: 'Segments',
      };
    if (name.endsWith('/design/ui'))
      return {AppText: 'AppText', Row: 'Row', StateView: 'StateView'};
    if (name.endsWith('/design/useFormat'))
      return {useFormat: () => ({number: String})};
  }
  return load.call(this, name, parent, ...rest);
};
const {QuranIndex} = require('../../src/features/quran/QuranIndex.tsx');

Module._load = load;
const {editions} = require('../../src/features/quran/domain.ts');

test('three tabs select edition-bound ranges, persist the index, accept Arabic digits and validate direct ayah jumps', async () => {
  let view;
  const destinations = [];
  await act(async () => {
    view = create(
      React.createElement(QuranIndex, {
        editionId: editions[0].id,
        packVersion: 'source-1',
        allowAyahJump: true,
        onSelect: t => destinations.push(t),
      }),
    );
  });
  const tabs = () => view.root.findByType('Segments'),
    search = () => view.root.findByType('SearchField');
  assert.equal(tabs().props.options.length, 3);
  await act(async () => tabs().props.onChange('juz'));
  assert.equal(savedKind, 'juz');
  assert.equal(view.root.findAllByType('SettingRow').length, 30);
  await act(async () => search().props.onChange('٢'));
  assert.equal(view.root.findAllByType('SettingRow').length, 1);
  await act(async () =>
    view.root.findAllByType('SettingRow')[0].props.onPress(),
  );
  assert.equal(destinations.at(-1).verse, 141);
  assert.equal(destinations.at(-1).section.kind, 'juz');
  await act(async () => tabs().props.onChange('hizb'));
  assert.equal(view.root.findAllByType('SettingRow').length, 60);
  await act(async () => search().props.onChange('٢:٢٥٥'));
  await act(async () => view.root.findByType('Row').props.onPress());
  assert.equal(destinations.at(-1).verse, 255);
  assert.equal(destinations.at(-1).section.kind, 'surah');
  await act(async () => search().props.onChange('٢:٩٩٩'));
  assert.equal(view.root.findAllByType('Row').length, 0);
  assert.equal(
    view.root.findByType('StateView').props.title,
    'رقم السورة أو الآية غير صالح',
  );
  await act(async () => view.unmount());
});
test('a slow stored-tab read cannot override the user’s new selection', async () => {
  let resolve;
  restoredKind = new Promise(r => {
    resolve = r;
  });
  let view;
  try {
    await act(async () => {
      view = create(
        React.createElement(QuranIndex, {
          editionId: editions[1].id,
          packVersion: 'test',
          onSelect() {},
        }),
      );
    });
    await act(async () =>
      view.root.findByType('Segments').props.onChange('hizb'),
    );
    await act(async () => resolve('juz'));
    assert.equal(view.root.findByType('Segments').props.value, 'hizb');
  } finally {
    restoredKind = null;
    if (view) await act(async () => view.unmount());
  }
});
