import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { act, create } from 'react-test-renderer';
import ts from 'typescript';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url);
const cache = new Map();
let palette;
function load(relative) {
  if (cache.has(relative)) return cache.get(relative);
  const output = ts.transpileModule(readFileSync(new URL(relative, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  const adapter = id => {
    if (id === 'react-native') return { View: 'View', StyleSheet: { create: s => s } };
    if (id === '@/theme/app-theme') return { useAppTheme: () => ({ colors: palette }) };
    if (id === '@/theme/boxes' || id === './boxes') return load('../theme/boxes.ts');
    if (id === './layout') return load('../theme/layout.ts');
    return require(id);
  };
  new Function('require', 'module', 'exports', output)(adapter, module, module.exports);
  cache.set(relative, module.exports);
  return module.exports;
}
const { buildEditorialPalette } = load('../theme/editorial-theme.ts');
const { boxStyle, BoxTokens } = load('../theme/boxes.ts');
const { boxCSSStyle } = load('../theme/box-css.ts');
const { AppBox } = load('./app-box.tsx');
const flatten = styles => Object.assign({}, ...styles.flat(Infinity).filter(Boolean));

test('passive containers forward content, layout, refs and explicit accessibility without creating controls', async () => {
  palette = buildEditorialPalette('light', 'neru');
  const ref = React.createRef();
  let root;
  await act(() => { root = create(React.createElement(AppBox, { ref, variant: 'group', testID: 'group', accessibilityLabel: 'Sessions', style: { marginTop: 20 } }, 'Content'), {
    createNodeMock: element => element.type === 'View' ? { native: true } : null,
  }); });
  try {
    const view = root.root.findByType('View');
    assert.deepEqual(view.children, ['Content']);
    assert.deepEqual(ref.current, { native: true });
    assert.equal(view.props.accessibilityLabel, 'Sessions');
    assert.equal(view.props.testID, 'group');
    assert.equal(view.props.accessible, undefined);
    assert.equal(view.props.accessibilityRole, undefined);
    assert.equal(view.props.onPress, undefined);
    assert.equal(flatten(view.props.style).marginTop, 20);
    assert.equal(flatten(view.props.style).overflow, 'hidden');
    assert.equal(flatten(view.props.style).padding, 0);
  } finally { await act(() => root.unmount()); }
});

test('rendered containers react to light, dark and custom-accent changes', async () => {
  let root;
  const element = () => React.createElement(AppBox, { tone: 'accent' });
  palette = buildEditorialPalette('light', 'neru');
  await act(() => { root = create(element()); });
  try {
    for (const next of [buildEditorialPalette('dark', 'nord'), buildEditorialPalette('light', 'custom', '#F5DF88')]) {
      palette = next;
      await act(() => root.update(element()));
      const style = flatten(root.root.findByType('View').props.style);
      assert.equal(style.backgroundColor, next.accentSoft);
      assert.equal(style.borderColor, next.accent);
    }
  } finally { await act(() => root.unmount()); }
});

test('semantic variants preserve grouping, empty, bubble and danger distinctions', () => {
  for (const mode of ['light', 'dark']) {
    const colors = buildEditorialPalette(mode, 'custom', '#88CCAA');
    assert.equal(boxStyle(colors, { variant: 'empty' }).borderStyle, 'dashed');
    assert.equal(boxStyle(colors, { variant: 'inset' }).borderWidth, 0);
    assert.equal(boxStyle(colors, { variant: 'notice' }).borderLeftWidth, BoxTokens.noticeWidth);
    assert.notEqual(boxStyle(colors, { tone: 'danger' }).borderColor, colors.accent);
    assert.equal(boxStyle(colors, { variant: 'bubble', tone: 'accent' }).backgroundColor, colors.accent);
    assert.equal(boxStyle(colors, { variant: 'bubble', tone: 'accent' }).borderTopRightRadius, 0);
    assert.equal(boxStyle(colors, { variant: 'bubble' }).borderTopLeftRadius, 0);
    assert.deepEqual(boxStyle(colors, { variant: 'plain' }), {});
    assert.equal(boxStyle(colors, { variant: 'field' }).minHeight, 48);
  }
});

test('DOM fields and overlays share the native box geometry and theme', () => {
  for (const variant of ['field', 'dialog', 'media', 'badge']) {
    const colors = buildEditorialPalette('dark', 'rose-pine');
    const native = boxStyle(colors, { variant });
    const web = boxCSSStyle(colors, { variant });
    for (const key of ['borderRadius', 'backgroundColor', 'borderColor', 'padding']) assert.equal(web[key], native[key]);
    assert.equal('borderCurve' in web, false);
    assert.equal('paddingHorizontal' in web, false);
  }
});
