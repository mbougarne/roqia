require('../foundation/register.cjs');
const {test} = require('node:test'),
  assert = require('node:assert/strict');
const fs = require('node:fs'),
  ts = require('typescript'),
  Module = require('node:module');
const react = require('react'),
  original = Module._load;
require.extensions['.tsx'] = (module, file) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
      },
    }).outputText,
    file,
  );
Module._load = function (request, parent, ...rest) {
  if (parent?.filename.endsWith('/design/components.tsx')) {
    if (request === 'react') return {...react, useState: () => [100, () => {}]};
    if (request === 'react-native')
      return {View: 'View', Pressable: 'Pressable'};
    if (request === 'react-native-svg')
      return {__esModule: true, default: 'Svg', Path: 'Path'};
    if (request === './Illustration') return {Illustration: 'Illustration'};
    if (request === './useFormat')
      return {
        useFormat: () =>
          require('../../src/design/format.ts').createFormatters('western'),
      };
    if (request === './ui')
      return {
        AppText: 'AppText',
        AppIcon: 'AppIcon',
        Card: 'Card',
        IconButton: 'IconButton',
        Input: 'Input',
        usePalette: () => ({}),
      };
  }
  return original.call(this, request, parent, ...rest);
};
const {Range, Toggle, RadioRow} = require('../../src/design/components.tsx');
Module._load = original;
function nodes(node) {
  return !node || typeof node !== 'object'
    ? []
    : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)];
}
function slider(value, onChange, extra = {}) {
  return nodes(
    Range({
      label: 'Spacing',
      min: 1.7,
      max: 2.2,
      step: 0.1,
      stops: [1.7, 1.9, 2.2],
      value,
      onChange,
      ...extra,
    }),
  ).find(n => n.props?.accessibilityRole === 'adjustable').props;
}
test('assistive adjustment reaches every supported nonuniform reader spacing and respects both limits', () => {
  let value = 1.7;
  const move = action =>
    slider(value, v => (value = v)).onAccessibilityAction({
      nativeEvent: {actionName: action},
    });
  for (const expected of [1.9, 2.2, 2.2]) {
    move('increment');
    assert.equal(value, expected);
  }
  for (const expected of [1.9, 1.7, 1.7]) {
    move('decrement');
    assert.equal(value, expected);
  }
});
test('pointer adjustment chooses a supported reader spacing without emitting an invalid intermediate value', () => {
  for (const [x, expected] of [
    [0, 1.7],
    [40, 1.9],
    [100, 2.2],
  ]) {
    let value;
    slider(1.9, v => (value = v)).onResponderGrant({
      nativeEvent: {locationX: x},
    });
    assert.equal(value, expected);
  }
  const text = nodes(
    Range({
      label: 'Rate',
      min: 0.75,
      max: 1.5,
      step: 0.25,
      value: 1.25,
      onChange: () => {},
    }),
  )
    .filter(n => n.type === 'AppText')
    .map(n => n.props.children)
    .join(' ');
  assert.match(text, /1[.,]25/);
});
test('switch exposes checked state and changes only when pressed', () => {
  let changed = null;
  const control = nodes(
    Toggle({label: 'Reminder', value: false, onChange: v => (changed = v)}),
  ).find(n => n.props?.accessibilityRole === 'switch');
  assert.equal(changed, null);
  assert.equal(control.props.accessibilityState.checked, false);
  control.props.onPress();
  assert.equal(changed, true);
});
test('storage selection exposes independent checkbox semantics', () => {
  const control = RadioRow({
    title: 'Pack',
    selected: true,
    multiple: true,
    onPress: () => {},
  });
  assert.equal(control.props.accessibilityRole, 'checkbox');
  assert.deepEqual(control.props.accessibilityState, {
    checked: true,
    disabled: false,
  });
});
test('unavailable sound choices expose their disabled state', () => {
  const control = RadioRow({
    title: 'Sound',
    selected: false,
    disabled: true,
    onPress: () => {},
  });
  assert.equal(control.props.disabled, true);
  assert.equal(control.props.accessibilityState.disabled, true);
});
