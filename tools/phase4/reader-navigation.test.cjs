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
  chapterGate = null,
  scrollFailures = 0,
  averageLength = 50;
const listeners = new Set();
let backPress = null;
let edition = require('../../src/features/quran/domain.ts').editions[0];

const platform = {OS: 'android'};
let fixtureChapter = null;
let navigationEvents = [];

const verses = Array.from({length: 23}, (_, i) => ({
  number: i + 1,
  text: `SOURCE ${i + 1}`,
}));
const text = {pack: {version: 'source-1'}};
const runtime = {
  text: () => text,
  chapter: async (_text, surah) => {
    if (chapterGate) await chapterGate;
    if (fixtureChapter) return fixtureChapter(surah);
    return {
      editionId: edition.id,
      surah: 2,
      verses,
      opening: 'OPENING',
    };
  },
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
    props.ListFooterComponent,
  );
});
const load = Module._load;
Module._load = function (name, parent, ...rest) {
  if (parent?.filename.endsWith('/quran/ReaderScreen.tsx')) {
    if (name === 'react-native-safe-area-context')
      return {
        useSafeAreaInsets: () => ({top: 50, bottom: 30, left: 0, right: 0}),
      };
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
        ActivityIndicator: 'Indicator',
        View: 'View',
        ScrollView: 'ScrollView',
        KeyboardAvoidingView: 'KeyboardAvoidingView',
        Keyboard: {dismiss() {}, isVisible: () => false},
        BackHandler: {
          addEventListener: (_event, callback) => {
            backPress = callback;
            return {
              remove: () => {
                backPress = null;
              },
            };
          },
        },
        Text: 'Text',
        Pressable: 'Pressable',
        Modal: 'Modal',
        AppState: {
          currentState: 'active',
          addEventListener: () => ({remove: () => {}}),
        },
        Platform: platform,
        StyleSheet: {
          absoluteFillObject: {
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
          },
        },
        AccessibilityInfo: {announceForAccessibility: () => {}},
        useWindowDimensions: () => ({width: 400, height: 800}),
      };
    if (name === './context')
      return {useLibrary: () => ({runtime, ready: true})};
    if (name === './LibraryScreens') return {act: p => void p};
    if (name === './QuranIndex') return {QuranIndex: 'Index'};
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

async function mount(view, verse = 1, extra = {}) {
  focused = true;
  remembered = [];
  scrolls = [];
  navigationEvents = [];
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
            ...extra,
          },
        },
        navigation: {
          goBack() {},
          navigate() {},
          replace: (name, target) => navigationEvents.push({name, target}),
        },
      }),
    );
  });
  return tree;
}
const list = tree => tree.root.findByType('List');
const isLoading = tree =>
  tree.root.findAllByProps({testID: 'quran-reader-loading'}).length > 0;

function layoutHeader(tree) {
  list(tree).props.ListHeaderComponent.props.onLayout({
    nativeEvent: {layout: {height: 100}},
  });
}
const allVerses = tree =>
  list(tree)
    .props.data.flat()
    .map(v => v.number);

test('iPhone continuous verse options hand off to audio without an overlapping native modal and remain dismissible in both mushafs', async () => {
  const originals = require('../../src/features/quran/domain.ts').editions;
  platform.OS = 'ios';
  try {
    for (const selected of originals) {
      edition = selected;
      const tree = await mount('continuous');
      await act(async () => layoutContinuous(tree));
      const verse = () =>
        tree.root
          .findAllByType('Text')
          .find(n => n.props.accessibilityLabel === 'الآية 1، خيارات الآية');
      await act(async () =>
        verse().props.onPress({nativeEvent: {pageX: 200, pageY: 250}}),
      );
      assert.equal(tree.root.findAllByType('Modal').length, 0);
      const listen = tree.root
        .findAllByType('IconButton')
        .find(n => n.props.label === 'الاستماع للآية');
      await act(async () => listen.props.onPress());
      assert.equal(tree.root.findByType('Audio').props.verse, 1);
      assert.equal(
        tree.root.findAllByProps({accessibilityLabel: 'إغلاق خيارات الآية'})
          .length,
        0,
      );
      await act(async () => tree.root.findByType('Audio').props.onClose());
      assert.equal(tree.root.findAllByType('Audio').length, 0);
      await act(async () =>
        verse().props.onPress({nativeEvent: {pageX: 200, pageY: 250}}),
      );
      await act(async () =>
        tree.root
          .findByProps({accessibilityLabel: 'إغلاق خيارات الآية'})
          .props.onPress(),
      );
      assert.equal(
        tree.root.findAllByProps({accessibilityLabel: 'إغلاق خيارات الآية'})
          .length,
        0,
      );
      await act(async () => tree.unmount());
    }
  } finally {
    edition = originals[0];
    platform.OS = 'android';
  }
});

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
  assert.equal(isLoading(tree), true);
  assert.equal(
    list(tree).props.importantForAccessibility,
    'no-hide-descendants',
  );
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
  assert.equal(isLoading(tree), true, 'text layout alone is not ready to read');
  await act(async () => list(tree).props.onContentSizeChange(400, 4000));
  assert.deepEqual(scrolls, [{offset: 1054}]);
  assert.equal(isLoading(tree), false);
  assert.equal(list(tree).props.importantForAccessibility, 'auto');
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
  assert.equal(
    isLoading(tree),
    true,
    'an estimated scroll is not the saved position',
  );
  await act(async () => new Promise(resolve => setTimeout(resolve, 120)));
  assert.deepEqual(scrolls.at(-1), {index: 19});
  assert.equal(isLoading(tree), false);
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

test('the opening loader spans asset loading and native layout, without reappearing on an unchanged settings return', async () => {
  let release;
  chapterGate = new Promise(resolve => {
    release = resolve;
  });
  const tree = await mount('verses');
  assert.equal(isLoading(tree), true);
  assert.equal(tree.root.findAllByType('List').length, 0);
  await act(async () => {
    release();
  });
  chapterGate = null;
  assert.equal(isLoading(tree), true);
  assert.equal(list(tree).props.pointerEvents, 'none');
  await act(async () => layoutHeader(tree));
  assert.equal(isLoading(tree), true);
  await act(async () => list(tree).props.onContentSizeChange(400, 4000));
  assert.equal(isLoading(tree), false);
  assert.equal(list(tree).props.pointerEvents, 'auto');
  await focus(false);
  await focus(true);
  assert.equal(isLoading(tree), false);
  await act(async () => tree.unmount());
});

for (const os of ['ios', 'android']) {
  test(`${os} juz ranges preserve original verse numbers, restore relative positions, and save the selected section`, async () => {
    const {editions, chapters} = require('../../src/features/quran/domain.ts');
    const {sectionRange} = require('../../src/features/quran/divisions.ts');
    platform.OS = os;
    try {
      for (edition of editions) {
        fixtureChapter = surah => ({
          surah,
          opening: 'OPENING',
          verses: Array.from(
            {
              length:
                edition.riwaya === 'warsh'
                  ? chapters[surah - 1].warshVerses
                  : chapters[surah - 1].hafsVerses,
            },
            (_, i) => ({number: i + 1, text: `SOURCE ${surah}:${i + 1}`}),
          ),
        });
        const section = {kind: 'juz', number: 2},
          range = sectionRange(edition.id, section);
        const tree = await mount('verses', range.start.verse + 3, {section});
        assert.equal(allVerses(tree)[0], range.start.verse);
        assert.equal(allVerses(tree).at(-1), range.end.verse);
        assert.equal(
          tree.root
            .findAllByType('Text')
            .some(n => n.props.children === 'OPENING'),
          false,
        );
        await act(async () => {
          layoutHeader(tree);
          list(tree).props.onContentSizeChange(400, 5000);
        });
        assert.deepEqual(scrolls.at(-1), {index: 3});
        await act(async () => list(tree).props.onScrollEndDrag());
        assert.deepEqual(remembered.at(-1).section, section);
        const next = tree.root
          .findAllByType('Button')
          .find(n => n.props.label === 'الجزء التالي');
        await act(async () => next.props.onPress());
        assert.deepEqual(navigationEvents.at(-1).target.section, {
          kind: 'juz',
          number: 3,
        });
        assert.deepEqual(
          navigationEvents.at(-1).target.verse,
          sectionRange(edition.id, {kind: 'juz', number: 3}).start.verse,
        );
        await act(async () => tree.unmount());
      }
    } finally {
      platform.OS = 'android';
      fixtureChapter = null;
      edition = editions[0];
    }
  });

  test(`${os} keeps a multi-surah juz active across chapter continuation and uses a dismissible in-screen index`, async () => {
    const {editions, chapters} = require('../../src/features/quran/domain.ts');
    edition = editions[1];
    platform.OS = os;
    fixtureChapter = surah => ({
      surah,
      opening: 'OPENING',
      verses: Array.from({length: chapters[surah - 1].hafsVerses}, (_, i) => ({
        number: i + 1,
        text: `SOURCE ${i + 1}`,
      })),
    });
    let tree;
    try {
      tree = await mount('verses', 1, {
        surah: 1,
        section: {kind: 'juz', number: 1},
      });
      const next = tree.root
        .findAllByType('Button')
        .find(n => n.props.label === 'متابعة الجزء · البقرة');
      await act(async () => next.props.onPress());
      assert.deepEqual(navigationEvents.at(-1).target.section, {
        kind: 'juz',
        number: 1,
      });
      assert.equal(navigationEvents.at(-1).target.surah, 2);
      await act(async () =>
        tree.root
          .findAllByType('IconButton')
          .find(n => n.props.label === 'فهرس القرآن')
          .props.onPress(),
      );
      assert.equal(tree.root.findAllByType('Index').length, 1);
      assert.equal(
        tree.root.findByType('KeyboardAvoidingView').props.behavior,
        'padding',
      );
      assert.equal(
        tree.root.findAllByType('Modal').length,
        os === 'ios' ? 0 : 1,
      );
      if (os === 'android') {
        await act(async () => assert.equal(backPress(), true));
        assert.equal(tree.root.findAllByType('Index').length, 0);
        await act(async () =>
          tree.root
            .findAllByType('IconButton')
            .find(n => n.props.label === 'فهرس القرآن')
            .props.onPress(),
        );
      }
      const target = {
        editionId: edition.id,
        surah: 87,
        verse: 1,
        packVersion: 'source-1',
        section: {kind: 'hizb', number: 60},
      };
      await act(async () =>
        tree.root.findByType('Index').props.onSelect(target),
      );
      assert.equal(tree.root.findAllByType('Index').length, 0);
      assert.deepEqual(navigationEvents.at(-1).target, target);
    } finally {
      if (tree) await act(async () => tree.unmount());
      fixtureChapter = null;
      platform.OS = 'android';
      edition = editions[0];
    }
  });
}
