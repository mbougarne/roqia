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
let dismissals = 0;
const removed = [];
let bookmarks = [
  {
    kind: 'quran-verse',
    bookmarkId: 'saved-hafs-4-1',
    editionId: 'hafs-kfgqpc-v2.0-update13',
    surah: 4,
    verse: 1,
  },
];
const runtime = {bookmarks: async () => bookmarks};
const hosts = names => Object.fromEntries(names.map(n => [n, n]));
const ui = {
  ...hosts([
    'AppText',
    'AppIcon',
    'IconBadge',
    'Card',
    'IconButton',
    'Button',
    'Input',
    'Page',
    'Row',
    'StateView',
    'Sheet',
  ]),
  usePalette: () => ({}),
};
const load = Module._load;
Module._load = function (name, parent, ...rest) {
  if (name === 'react-native')
    return {
      Keyboard: {dismiss: () => dismissals++},
      Platform: {OS: 'ios'},
      View: 'View',
      Text: 'Text',
      Pressable: 'Pressable',
    };
  if (parent?.filename.endsWith('/design/components.tsx')) {
    if (name === './ui') return ui;
    if (name === './Illustration') return {Illustration: 'Illustration'};
    if (name === './useFormat') return {useFormat: () => ({number: String})};
    if (name === 'react-native-svg')
      return {__esModule: true, default: 'Svg', Path: 'Path'};
  }
  if (parent?.filename.endsWith('/quran/DetailScreens.tsx')) {
    if (name === './context')
      return {
        useQuran: () => runtime,
        useOnFocus: (fn, deps) => React.useEffect(fn, deps),
      };
    if (name === './LibraryScreens')
      return {
        act: promise => {
          void promise;
        },
      };
    if (name === './runtime') return {readerDefaults: {}};
    if (name === '../../data') return {noteData: {}};
    if (name.endsWith('/design/ui')) return ui;
    if (name.endsWith('/design/components'))
      return hosts([
        'Banner',
        'Group',
        'Ornament',
        'RadioRow',
        'Range',
        'SearchField',
        'Segments',
        'SettingRow',
        'Toggle',
      ]);
    if (name.endsWith('/design/useFormat'))
      return {useFormat: () => ({number: String})};
    if (name === '../devotional/bookmarks')
      return {
        removeBookmark: async id => {
          removed.push(id);
          bookmarks = bookmarks.filter(b => b.bookmarkId !== id);
        },
      };
  }
  return load.call(this, name, parent, ...rest);
};
const {SearchField} = require('../../src/design/components.tsx');
const {
  QuranBookmarksScreen,
} = require('../../src/features/quran/DetailScreens.tsx');

Module._load = load;

test('iPhone search has a visible Done action, submits with dismissal, and clearing also hides the keyboard', async () => {
  let view,
    query = 'النساء',
    submitted = 0;
  const before = dismissals;
  await act(async () => {
    view = create(
      React.createElement(SearchField, {
        label: 'بحث',
        value: query,
        dismissible: true,
        onChange: value => {
          query = value;
        },
        onSubmit: () => submitted++,
      }),
    );
  });
  await act(async () => view.root.findByType('Input').props.onFocus());
  assert.equal(view.root.findByType('Button').props.label, 'تم');
  await act(async () => view.root.findByType('Button').props.onPress());
  assert.equal(dismissals, before + 1);
  assert.equal(query, 'النساء');
  await act(async () => view.root.findByType('Input').props.onSubmitEditing());
  assert.equal(submitted, 1);
  assert.equal(dismissals, before + 2);
  await act(async () => view.root.findByType('IconButton').props.onPress());
  assert.equal(query, '');
  assert.equal(dismissals, before + 3);
  await act(async () => view.root.findByType('Input').props.onBlur());
  assert.equal(view.root.findAllByType('Button').length, 0);
  await act(async () => view.unmount());
});

test('Quran bookmark removal uses Arabic text and removes only the selected saved reference', async () => {
  let view;
  await act(async () => {
    view = create(
      React.createElement(QuranBookmarksScreen, {
        navigation: {goBack() {}, navigate() {}},
      }),
    );
  });
  assert.equal(view.root.findAllByType('IconButton').length, 0);
  const button = view.root.findByType('Button');
  assert.equal(button.props.label, 'إزالة العلامة');
  assert.equal(button.props.icon, undefined);
  await act(async () => button.props.onPress());
  assert.deepEqual(removed, ['saved-hafs-4-1']);
  assert.equal(
    view.root.findByType('StateView').props.title,
    'لا توجد علامات قراءة',
  );
  await act(async () => view.unmount());
});
