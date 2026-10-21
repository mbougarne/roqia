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
const keyboard = new Map();
let ready = true,
  libraryError = false,
  selectionGate = null;
const runtime = {
  catalog: require('../../src/features/quran/catalog.ts').quranCatalog,
  select: async () => {},
  preferred: async () => {
    if (selectionGate) await selectionGate;
    return {id: 'warsh-kfgqpc-v2.1-update6'};
  },
  resume: async () => null,
  text: () => ({pack: {}}),
  installed: () => true,
};
const original = Module._load;
Module._load = function (name, parent, ...rest) {
  if (parent?.filename.endsWith('/quran/LibraryScreens.tsx')) {
    if (name === 'react-native')
      return {
        View: 'View',
        Platform: {OS: 'android'},
        ActivityIndicator: 'Indicator',
        Pressable: 'Pressable',
        Alert: {alert() {}},
        Keyboard: {
          isVisible: () => false,
          addListener: (event, cb) => {
            keyboard.set(event, cb);
            return {remove: () => keyboard.delete(event)};
          },
        },
      };
    if (name === './context')
      return {
        useLibrary: () => ({runtime, ready, error: libraryError, retry() {}}),
        useOnFocus: (cb, deps) => React.useEffect(cb, deps),
      };
    if (name === './IphoneQuranLibrary')
      return {IphoneQuranLibrary: 'IphoneLibrary'};
    if (name.endsWith('/design/ui'))
      return {
        ...Object.fromEntries(
          [
            'AppText',
            'AppIcon',
            'IconButton',
            'Page',
            'Button',
            'Card',
            'Row',
            'StateView',
          ].map(n => [n, n]),
        ),
        usePalette: () => ({}),
      };
    if (name.endsWith('/design/components'))
      return Object.fromEntries(
        [
          'Banner',
          'FeatureCard',
          'NumberBadge',
          'RadioRow',
          'SearchField',
          'Group',
          'SettingRow',
          'Ornament',
        ].map(n => [n, n]),
      );
    if (name.endsWith('/design/Illustration'))
      return {Illustration: 'Illustration'};
    if (name.endsWith('/design/useFormat'))
      return {useFormat: () => ({number: String})};
  }
  return original.call(this, name, parent, ...rest);
};
const {
  QuranLibraryScreen,
  EditionScreen,
} = require('../../src/features/quran/LibraryScreens.tsx');

Module._load = original;
test('mushaf selection returns to reading and keeps source/translation controls without a text download step', async () => {
  let tree,
    returned = 0;
  const routes = [];
  await act(async () => {
    tree = create(
      React.createElement(EditionScreen, {
        navigation: {
          goBack() {
            returned++;
          },
          navigate(...args) {
            routes.push(args);
          },
        },
      }),
    );
  });
  const editions = tree.root.findAllByType('RadioRow');
  assert.equal(editions.length, 2);
  await act(async () => editions[1].props.onPress());
  assert.equal(tree.root.findAllByType('RadioRow')[1].props.selected, true);
  const rows = tree.root.findAllByType('SettingRow');
  await act(async () => {
    rows[0].props.onPress();
    rows[1].props.onPress();
  });
  assert.deepEqual(
    routes.map(r => r[0]),
    ['QuranSource', 'QuranTranslations'],
  );
  assert.ok(
    routes.every(r => r[1].editionId === runtime.catalog.texts[1].editionId),
  );
  const next = tree.root.findByType('Button');
  assert.equal(next.props.disabled, false);
  await act(async () => next.props.onPress());
  assert.equal(returned, 1);
  await act(async () => tree.unmount());
});
test('Android keyboard dismissal restores library context while field focus and search query remain independent', async () => {
  let tree;
  await act(async () => {
    tree = create(
      React.createElement(QuranLibraryScreen, {navigation: {navigate() {}}}),
    );
  });
  const context = () => tree.root.findAllByType('SettingRow').length;
  assert.equal(context(), 1);
  await act(async () => {
    tree.root.findByType('SearchField').props.onFocus();
    keyboard.get('keyboardDidShow')();
  });
  assert.equal(context(), 0);
  await act(async () => keyboard.get('keyboardDidHide')());
  assert.equal(
    context(),
    1,
    'Android Back dismisses the keyboard without blurring the input',
  );
  await act(async () => {
    keyboard.get('keyboardDidShow')();
    tree.root.findByType('SearchField').props.onChange('البقرة');
  });
  assert.equal(tree.root.findAllByType('Pressable').length, 1);
  await act(async () => keyboard.get('keyboardDidHide')());
  assert.equal(tree.root.findByType('SearchField').props.value, 'البقرة');
  assert.equal(tree.root.findAllByType('Pressable').length, 1);
  await act(async () => tree.root.findByType('SearchField').props.onChange(''));
  assert.equal(context(), 1);
  await act(async () => tree.unmount());
  assert.equal(keyboard.size, 0);
});

test('the first library visit shows a loader until downloads and saved selection are ready; later renders retain the library', async () => {
  ready = false;
  let release;
  selectionGate = new Promise(resolve => {
    release = resolve;
  });
  let tree;
  const screen = () =>
    React.createElement(QuranLibraryScreen, {navigation: {navigate() {}}});
  const loading = () =>
    tree.root.findAllByProps({testID: 'quran-library-loading'}).length;
  await act(async () => {
    tree = create(screen());
  });
  assert.equal(loading(), 1);
  assert.equal(
    tree.root.findAllByType('Pressable').length,
    0,
    'do not build 114 surah rows before the loader can paint',
  );
  ready = true;
  await act(async () => tree.update(screen()));
  assert.equal(
    loading(),
    1,
    'saved edition and resume position are still pending',
  );
  await act(async () => {
    release();
  });
  selectionGate = null;
  assert.equal(loading(), 0);
  assert.equal(tree.root.findAllByType('Pressable').length, 114);
  await act(async () => tree.update(screen()));
  assert.equal(loading(), 0);
  await act(async () => tree.unmount());

  ready = false;
  libraryError = true;
  await act(async () => {
    tree = create(screen());
  });
  assert.equal(
    loading(),
    0,
    'a failed initialization must expose retry instead of an endless loader',
  );
  assert.equal(
    tree.root.findByType('StateView').props.title,
    'تعذر فتح المكتبة',
  );
  await act(async () => tree.unmount());
  ready = true;
  libraryError = false;
});
