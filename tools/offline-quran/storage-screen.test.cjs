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
const {isBundledPack} = require('../../src/features/downloads/bundled.ts');

const core = [
  ['quran-warsh', 'source-1'],
  ['quran-hafs', 'kfgqpc-2.0-update13'],
  ['translation-fr.hamidullah', 'source-1'],
  ['translation-en.pickthall', 'source-1'],
].map(([id, version]) => ({id, version, title: id}));
const legacy = {
  id: 'quran-hafs',
  version: 'source-1',
  title: 'Old Hafs mushaf',
};
const audio = {id: 'user-audio', version: '1', title: 'User recording'};
let installed = [],
  confirmation,
  deleted = [];
const downloads = {
  subscribe: () => () => {},
  snapshot: () => 0,
  getError: () => null,
  listInstalled: () => installed,
  listJobs: () => installed.map(p => ({...p, state: 'ready'})),
  isProtectedPack: (id, version) =>
    isBundledPack({id, version}) || id === legacy.id,
  usage: async () => ({installed: 1000, partial: 0, free: 100000}),
  deletePack: async (id, version) => {
    deleted.push([id, version]);
    installed = installed.filter(p => p.packId !== id);
  },
};
const original = Module._load;
Module._load = function (name, parent, ...rest) {
  if (parent?.filename.endsWith('/downloads/Screens.tsx')) {
    if (name === 'react-native')
      return {
        View: 'View',
        Alert: {
          alert: (...args) => {
            confirmation = args;
          },
        },
      };
    if (name === './catalog') return {catalog: [...core, audio]};
    if (name === './native')
      return {nativeDownloadPorts: {size: async () => 1000}};
    if (name === '../quran/context')
      return {useQuran: () => ({downloads, initialize: async () => {}})};
    if (name.endsWith('/design/useFormat'))
      return {useFormat: () => ({number: String, bytes: String})};
    if (name.endsWith('/design/format')) return {ltr: String};
    if (name.endsWith('/design/components') || name.endsWith('/design/ui'))
      return Object.fromEntries(
        [
          'Banner',
          'Ornament',
          'Progress',
          'RadioRow',
          'Segments',
          'SettingRow',
          'AppIcon',
          'AppText',
          'Button',
          'Card',
          'Page',
          'Row',
          'StateView',
        ].map(n => [n, n]),
      );
  }
  return original.call(this, name, parent, ...rest);
};
const {
  StorageScreen,
  DownloadsScreen,
} = require('../../src/features/downloads/Screens.tsx');

Module._load = original;
const install = packs =>
  packs.map(p => ({
    packId: p.id,
    version: p.version,
    files: ['content/' + p.id],
    active: true,
    state: 'ready',
    capabilities: ['audio'],
  }));
const render = async Screen => {
  let tree;
  await act(async () => {
    tree = create(
      React.createElement(Screen, {navigation: {goBack() {}, navigate() {}}}),
    );
  });
  return tree;
};
test('storage lists only user downloads and deletion targets only the selected recording', async () => {
  installed = install([...core, legacy, audio]);
  deleted = [];
  confirmation = null;
  const tree = await render(StorageScreen);
  const rows = tree.root.findAllByType('RadioRow');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].props.title, audio.title);
  assert.equal(tree.root.findAllByType('SettingRow').length, 0);
  await act(async () => rows[0].props.onPress());
  await act(async () => tree.root.findByType('Button').props.onPress());
  const remove = confirmation[2].find(b => b.style === 'destructive');
  await act(async () => {
    remove.onPress();
  });
  assert.deepEqual(deleted, [[audio.id, audio.version]]);
  assert.equal(installed.length, core.length + 1);
  await act(async () => tree.unmount());
});
test('bundled-only storage has no selectable or removable items', async () => {
  installed = install(core);
  const tree = await render(StorageScreen);
  assert.equal(tree.root.findAllByType('RadioRow').length, 0);
  assert.equal(tree.root.findAllByType('SettingRow').length, 0);
  assert.equal(tree.root.findAllByType('Button').length, 0);
  assert.ok(
    tree.root
      .findAllByType('StateView')
      .some(n => n.props.title === 'لا توجد حزم منزّلة'),
  );
  await act(async () => tree.unmount());
});
test('bundled packs are not represented as completed user downloads', async () => {
  installed = install(core);
  const tree = await render(DownloadsScreen);
  await act(async () =>
    tree.root.findByType('Segments').props.onChange('done'),
  );
  assert.ok(
    tree.root
      .findAllByType('StateView')
      .some(n => n.props.title === 'لا توجد تنزيلات مكتملة'),
  );
  await act(async () => tree.unmount());
});
