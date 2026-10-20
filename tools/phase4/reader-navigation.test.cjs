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
let focused = true,
  preferences,
  remembered = [],
  scrolls = [],
  invalidFont = false,
  scrollFailures = 0,
  averageLength = 50;
const listeners = new Set();
const edition = require('../../src/features/quran/domain.ts').editions[0];

const verses = Array.from({length: 23}, (_, i) => ({
  number: i + 1,
  text: `SOURCE ${i + 1}`,
}));
const text = {pack: {version: 'source-1'}};
const runtime = {
  text: () => text,
  chapter: async () => ({
    editionId: edition.id,
    surah: 2,
    verses,
    opening: 'OPENING',
  }),
  font: async () => {
    if (invalidFont) throw Error('invalid_font');
    return 'source-font';
  },
  preferences: async () => ({...preferences}),
  bookmarks: async () => [],
  remember: async l => remembered.push(l),
  catalog: {translations: []},
};
const FlatList = React.forwardRef((props, ref) => {
  React.useImperativeHandle(ref, () => ({
    scrollToIndex: args => {
      scrolls.push({index: args.index});
      if (scrollFailures-- > 0)
        props.onScrollToIndexFailed({
          index: args.index,
          averageItemLength: averageLength,
        });
    },
    scrollToOffset: args => scrolls.push({offset: args.offset}),
  }));
  return React.createElement(
    'List',
    props,
    props.ListHeaderComponent,
    props.data.length === 1 ? props.renderItem({item: props.data[0]}) : null,
  );
});
const load = Module._load;
Module._load = function (name, parent, ...rest) {
  if (parent?.filename.endsWith('/quran/ReaderScreen.tsx')) {
    if (name === '@react-native-clipboard/clipboard')
      return {setString: () => {}};
    if (name === '@react-navigation/native')
      return {
        useFocusEffect: cb => {
          const active = React.useSyncExternalStore(
            cb => {
              listeners.add(cb);
              return () => listeners.delete(cb);
            },
            () => focused,
          );
          React.useEffect(() => (active ? cb() : undefined), [active, cb]);
        },
      };
    if (name === 'react-native')
      return {
        FlatList,
        View: 'View',
        Text: 'Text',
        Pressable: 'Pressable',
        Modal: 'Modal',
        AppState: {
          currentState: 'active',
          addEventListener: () => ({remove: () => {}}),
        },
        Platform: {OS: 'android'},
        AccessibilityInfo: {announceForAccessibility: () => {}},
        useWindowDimensions: () => ({width: 400, height: 800}),
      };
    if (name === './context')
      return {useLibrary: () => ({runtime, ready: true})};
    if (name === './LibraryScreens') return {act: p => void p};
    if (name === './ListenScreen') return {ReaderVerseAudio: 'Audio'};
    if (name === './runtime')
      return {
        readerDefaults: {
          size: 26,
          lineHeight: 1.9,
          view: 'verses',
          translationId: null,
          keepAwake: false,
        },
        keepAwake: () => {},
      };
    if (name.endsWith('/design/ui'))
      return {
        ...Object.fromEntries(
          [
            'AppText',
            'AppIcon',
            'Button',
            'Card',
            'IconButton',
            'Page',
            'StateView',
            'Sheet',
          ].map(n => [n, n]),
        ),
        usePalette: () => ({}),
      };
    if (name.endsWith('/design/components'))
      return {NumberBadge: 'Badge', Ornament: 'Ornament', rtlRow: {}};
    if (name.endsWith('/design/useFormat'))
      return {useFormat: () => ({number: String})};
  }
  return load.call(this, name, parent, ...rest);
};
const {
  QuranReaderScreen,
} = require('../../src/features/quran/ReaderScreen.tsx');

Module._load = load;

async function focus(value) {
  await act(async () => {
    focused = value;
    listeners.forEach(cb => cb());
  });
}

async function mount(view, verse = 1) {
  focused = true;
  remembered = [];
  scrolls = [];
  invalidFont = false;
  preferences = {
    size: 26,
    lineHeight: 1.9,
    view,
    translationId: null,
    keepAwake: false,
  };
  let tree;
  await act(async () => {
    tree = create(
      React.createElement(QuranReaderScreen, {
        route: {
          params: {
            editionId: edition.id,
            surah: 2,
            verse,
            packVersion: 'source-1',
          },
        },
        navigation: {goBack() {}, navigate() {}},
      }),
    );
  });
  return tree;
}
const list = tree => tree.root.findByType('List');

function layoutHeader(tree) {
  list(tree).props.ListHeaderComponent.props.onLayout({
    nativeEvent: {layout: {height: 100}},
  });
}
const allVerses = tree =>
  list(tree)
    .props.data.flat()
    .map(v => v.number);

function layoutContinuous(tree) {
  const paragraph = tree.root
    .findAllByType('Text')
    .find(n => n.props.onTextLayout);
  paragraph.props.onTextLayout({
    nativeEvent: {
      lines: verses.map((v, i) => ({text: v.text, y: i * 50, height: 50})),
    },
  });
  list(tree).props.ListHeaderComponent.props.onLayout({
    nativeEvent: {layout: {height: 100}},
  });
  (layoutHeader(tree), list(tree).props.onContentSizeChange(400, 4000));
}
test('verse mode retains the full chapter and mounted list across settings; typography restores the current verse', async () => {
  const tree = await mount('verses', 5);
  assert.deepEqual(
    allVerses(tree),
    verses.map(v => v.number),
  );
  assert.equal(list(tree).props.initialScrollIndex, undefined);
  await act(
    async () => (
      layoutHeader(tree),
      list(tree).props.onContentSizeChange(400, 4000)
    ),
  );
  await act(async () =>
    list(tree).props.onViewableItemsChanged({
      viewableItems: [{item: [verses[14]]}],
    }),
  );
  const before = list(tree);
  await focus(false);
  assert.equal(list(tree), before);
  await focus(true);
  assert.equal(list(tree), before);
  assert.deepEqual(
    allVerses(tree),
    verses.map(v => v.number),
  );
  assert.equal(remembered.at(-1).verse, 15);
  await focus(false);
  preferences.size = 34;
  await focus(true);

  await act(
    async () => (
      layoutHeader(tree),
      list(tree).props.onContentSizeChange(400, 4000)
    ),
  );
  assert.deepEqual(scrolls.at(-1), {index: 14});
  assert.deepEqual(
    allVerses(tree),
    verses.map(v => v.number),
  );
  await act(async () => {
    list(tree).props.onViewableItemsChanged({
      viewableItems: [{item: [verses[0]]}],
    });
    list(tree).props.onScrollEndDrag();
  });
  assert.equal(
    remembered.at(-1).verse,
    1,
    'earlier verses remain reachable after returning',
  );
  await act(async () => tree.unmount());
});
test('continuous mode retains earlier verses and position after settings and mode changes', async () => {
  const tree = await mount('continuous', 5);
  await act(async () => layoutContinuous(tree));
  assert.deepEqual(
    allVerses(tree),
    verses.map(v => v.number),
  );
  await act(async () =>
    list(tree).props.onScroll({nativeEvent: {contentOffset: {y: 712}}}),
  );
  const before = list(tree);
  await focus(false);
  await focus(true);
  assert.equal(list(tree), before);
  assert.equal(remembered.at(-1).verse, 13);
  await focus(false);
  preferences.lineHeight = 2.2;
  await focus(true);
  await act(async () => layoutContinuous(tree));
  assert.deepEqual(scrolls.at(-1), {offset: 704});
  assert.deepEqual(
    allVerses(tree),
    verses.map(v => v.number),
  );
  await focus(false);
  preferences.view = 'verses';
  await focus(true);

  await act(
    async () => (
      layoutHeader(tree),
      list(tree).props.onContentSizeChange(400, 4000)
    ),
  );
  assert.deepEqual(scrolls.at(-1), {index: 12});
  assert.deepEqual(
    allVerses(tree),
    verses.map(v => v.number),
  );
  await act(async () => tree.unmount());
});
test('returning to a reader still rejects unavailable or corrupt source fonts', async () => {
  const tree = await mount('verses');
  await focus(false);
  invalidFont = true;
  await focus(true);
  assert.equal(
    tree.root.findByType('StateView').props.title,
    'تعذر فتح المصحف بأمان',
  );
  await act(async () => tree.unmount());
});

test('a deep continuous locator waits for both text and scroll content layout before restoring', async () => {
  const tree = await mount('continuous', 20);
  await act(async () => {
    layoutHeader(tree);
    const paragraph = tree.root
      .findAllByType('Text')
      .find(n => n.props.onTextLayout);
    paragraph.props.onTextLayout({
      nativeEvent: {
        lines: verses.map((v, i) => ({text: v.text, y: i * 50, height: 50})),
      },
    });
  });
  assert.deepEqual(
    scrolls,
    [],
    'scrolling before the content height exists would clamp the bookmark to the start',
  );
  await act(async () => list(tree).props.onContentSizeChange(400, 4000));
  assert.deepEqual(scrolls, [{offset: 1054}]);
  assert.deepEqual(
    allVerses(tree),
    verses.map(v => v.number),
  );
  await act(async () => tree.unmount());
});

test('an unmeasured deep verse retries after estimating the offset without replacing the saved verse', async () => {
  const tree = await mount('verses', 20);
  assert.equal(list(tree).props.initialNumToRender, 20);
  scrollFailures = 1;
  await act(async () => {
    layoutHeader(tree);
    list(tree).props.onContentSizeChange(400, 4000);
    list(tree).props.onViewableItemsChanged({
      viewableItems: [{item: [verses[0]]}],
    });
  });
  assert.deepEqual(scrolls, [{index: 19}, {offset: 1050}]);
  await act(async () => new Promise(resolve => setTimeout(resolve, 120)));
  assert.deepEqual(scrolls.at(-1), {index: 19});
  await act(async () => list(tree).props.onScrollEndDrag());
  assert.equal(remembered.at(-1).verse, 20);
  await act(async () => tree.unmount());
  const unmeasured = await mount('verses', 20);
  scrollFailures = 1;
  averageLength = 0;
  await act(async () => {
    layoutHeader(unmeasured);
    list(unmeasured).props.onContentSizeChange(400, 4000);
  });
  assert.deepEqual(
    scrolls,
    [{index: 19}],
    'a zero estimate must not scroll the initial window back to verse 1',
  );
  await act(async () => new Promise(resolve => setTimeout(resolve, 120)));
  assert.deepEqual(scrolls.at(-1), {index: 19});
  await act(async () => unmeasured.unmount());
});
