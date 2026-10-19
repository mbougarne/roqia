require('./register.cjs');
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const React = require('react');
const {act, create} = require('react-test-renderer');
const supplied = require('../../src/features/asma/1792441861026.json');

const names = supplied.map(row => ({
  name: row['الاسم'],
  meaning: row['المعنى'],
}));
const {createFormatters} = require('../../src/design/format.ts');

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

let digitStyle = 'western';
const scrolls = [];
const announcements = [];
const themeContext = React.createContext({uiScale: 1});
const originalLoad = Module._load;
Module._load = function (id, parent, ...rest) {
  if (parent?.filename.endsWith('/asma/AsmaScreen.tsx')) {
    if (id === 'react-native')
      return {
        View: 'View',
        AccessibilityInfo: {
          announceForAccessibility: text => announcements.push(text),
        },
      };
    if (id === 'react-native-svg')
      return {__esModule: true, default: 'Svg', Path: 'Path'};
    if (id === 'react-native-gesture-handler')
      return {
        GestureDetector: 'GestureDetector',
        GestureHandlerRootView: 'GestureRoot',
        Gesture: {
          Pan: () => {
            const gesture = {
              maxPointers() {
                return this;
              },
              activeOffsetX() {
                return this;
              },
              failOffsetY() {
                return this;
              },
              runOnJS() {
                return this;
              },
              onEnd(callback) {
                this.finish = callback;
                return this;
              },
            };
            return gesture;
          },
        },
      };
    if (id.endsWith('/design/components'))
      return {Ornament: 'Ornament', rtlRow: {}};
    if (id.endsWith('/store')) return {themeContext};
    if (id.endsWith('/design/useFormat'))
      return {useFormat: () => createFormatters(digitStyle)};
    if (id.endsWith('/design/ui'))
      return {
        AppIcon: 'Icon',
        AppText: 'Text',
        Button: 'Button',
        Card: 'Card',
        usePalette: () => ({}),
        Page: ({children, footer, headerContent, scrollRef, ...props}) => {
          React.useImperativeHandle(scrollRef, () => ({
            scrollTo: p => scrolls.push(p),
          }));
          return React.createElement(
            'Page',
            props,
            headerContent,
            children,
            footer,
          );
        },
      };
  }
  return originalLoad.call(this, id, parent, ...rest);
};
const {AsmaScreen} = require('../../src/features/asma/AsmaScreen.tsx');

Module._load = originalLoad;
const texts = tree =>
  tree.root
    .findAllByType('Text')
    .map(n => n.props.children)
    .flat()
    .join(' ');
const swipe = (tree, x, y = 0, success = true) =>
  act(() =>
    tree.root
      .findByType('GestureDetector')
      .props.gesture.finish({translationX: x, translationY: y}, success),
  );
const position = tree =>
  tree.root
    .findAllByType('View')
    .find(n => n.props.accessibilityRole === 'adjustable');

test('horizontal swipes traverse paired cards; cancelled, short, vertical and boundary gestures preserve position', async () => {
  let tree;
  await act(() => {
    tree = create(React.createElement(AsmaScreen, {navigation: {goBack() {}}}));
  });
  assert.equal(tree.root.findAllByType('Button').length, 0);
  assert.deepEqual(
    position(tree).props.accessibilityActions.map(a => a.name),
    ['increment'],
  );
  for (const [x, y, success] of [
    [30, 0, true],
    [150, 200, true],
    [150, 0, false],
    [-150, 0, true],
  ]) {
    await swipe(tree, x, y, success);
    assert.equal(position(tree).props.accessibilityValue.now, 1);
    assert.equal(scrolls.length, 0);
  }
  for (let i = 0; i < names.length; i++) {
    assert.equal(tree.root.findAllByType('Card').length, 1);
    const headers = tree.root
      .findAllByType('Text')
      .filter(n => n.props.accessibilityRole === 'header');
    assert.deepEqual(
      headers.map(n => n.props.children),
      [names[i].name],
    );
    assert.ok(texts(tree).includes(names[i].meaning));
    if (i < names.length - 1) await swipe(tree, 150);
  }
  assert.equal(scrolls.length, 98);
  assert.ok(scrolls.every(s => s.y === 0 && s.animated === false));
  assert.equal(announcements.at(-1), names.at(-1).name);
  await swipe(tree, 150);
  assert.equal(position(tree).props.accessibilityValue.now, 99);
  assert.equal(scrolls.length, 98);
  assert.deepEqual(
    position(tree).props.accessibilityActions.map(a => a.name),
    ['decrement'],
  );
  await swipe(tree, -150);
  assert.ok(texts(tree).includes(names.at(-2).meaning));
  await act(() =>
    position(tree).props.onAccessibilityAction({
      nativeEvent: {actionName: 'increment'},
    }),
  );
  assert.equal(position(tree).props.accessibilityValue.now, 99);
  await act(() =>
    position(tree).props.onAccessibilityAction({
      nativeEvent: {actionName: 'decrement'},
    }),
  );
  assert.equal(position(tree).props.accessibilityValue.now, 98);
  digitStyle = 'eastern';
  await act(() =>
    tree.update(React.createElement(AsmaScreen, {navigation: {goBack() {}}})),
  );
  assert.ok(texts(tree).includes('٩٨'));
  assert.ok(texts(tree).includes('٩٩'));
  assert.ok(texts(tree).includes(names.at(-2).meaning));
  await act(() => tree.unmount());
});
