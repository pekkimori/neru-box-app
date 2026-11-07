import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { act, create } from 'react-test-renderer';
import ts from 'typescript';

// Exercise the real React controls; only platform views and device feedback are adapters.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url);
const light = { mode: 'light', accent: '#8839EF', onAccent: '#FFFFFF', accentSoft: '#EEE5FA', card: '#FFFFFF', text: '#171717', line: '#E5E5E5' };
let palette = light;
let taps = 0;
const platform = { OS: 'web', select: options => options[platform.OS] ?? options.default };
const native = { ActivityIndicator: 'Spinner', Text: 'Text', View: 'View', Platform: platform, StyleSheet: { create: styles => styles } };
const cache = new Map();
function load(relative) {
  if (cache.has(relative)) return cache.get(relative);
  const output = ts.transpileModule(readFileSync(new URL(relative, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  const adapter = id => {
    if (id === 'react-native') return native;
    if (id === '@expo/vector-icons') return { Ionicons: 'Icon' };
    if (id === '@/theme/app-theme') return { useAppTheme: () => ({ colors: palette, appearance: { mode: palette.mode } }) };
    if (id === '@/theme/controls') return load('../theme/controls.ts');
    if (id === '@/theme/boxes') return load('../theme/boxes.ts');
    if (id === '@/theme/layout' || id === './layout') return load('../theme/layout.ts');
    if (id === '@/theme/typography') return load('../theme/typography.ts');
    if (id === './motion') return { MotionPressable: React.forwardRef(function TestPressTarget(props, ref) { return React.createElement('PressTarget', { ...props, ref }); }) };
    if (id === './app-controls') return load('./app-controls.tsx');
    if (id === './control-label') return { ControlLabel: 'ControlLabel' };
    if (id === '@/utils/interaction-feedback') return { playTapFeedback: () => taps++ };
    if (id === '@/utils/neru-reactions') return { emitNeruButtonPress: () => {} };
    if (id === '@expo/ui') return { Host: 'Host', Button: 'NativeButton', Text: 'NativeText' };
    if (id === '@expo/ui/community/segmented-control') return { SegmentedControl: 'Segments' };
    return require(id);
  };
  new Function('require', 'module', 'exports', output)(adapter, module, module.exports);
  cache.set(relative, module.exports);
  return module.exports;
}
const { ActionButton, ButtonLabel, ButtonIcon, ChoiceChip, ChoiceCard, IconButton, DismissSurface, InteractiveSurface } = load('./app-controls.tsx');
const { AppButton } = load('./native-controls.tsx');
const { ControlTokens, controlColors } = load('../theme/controls.ts');
const flatten = value => Object.assign({}, ...[value].flat(Infinity).filter(Boolean));
async function render(element, run) {
  let root;
  await act(() => { root = create(element); });
  try { await run(root); } finally { await act(() => root.unmount()); palette = light; platform.OS = 'web'; }
}
const target = root => root.root.findByType('PressTarget');
const style = root => flatten(target(root).props.style({ pressed: false, hovered: false }));

test('loading retains the accessible name and disables interaction while showing progress', async () => {
  await render(React.createElement(AppButton, { label: 'Save plan', loading: true, onPress() {} }), root => {
    assert.equal(target(root).props.accessibilityLabel, 'Save plan');
    assert.equal(target(root).props.disabled, true);
    assert.deepEqual(target(root).props.accessibilityState, { disabled: true, busy: true });
    assert.equal(root.root.findAllByType('Spinner').length, 1);
  });
});

test('disabled state is consistent for visual and accessibility-only callers', async () => {
  for (const props of [{ disabled: true }, { accessibilityState: { disabled: true } }]) {
    await render(React.createElement(ActionButton, props), root => {
      assert.equal(target(root).props.disabled, true);
      assert.equal(target(root).props.accessibilityState.disabled, true);
      assert.equal(style(root).opacity, ControlTokens.disabledOpacity);
    });
  }
});

test('choices announce checked state; tabs announce selected state without aria-checked', async () => {
  for (const [Component, props, role, state] of [
    [ChoiceChip, { selected: true }, 'radio', { checked: true }],
    [ChoiceCard, { multiple: true, accessibilityState: { checked: true } }, 'checkbox', { checked: true }],
    [ChoiceCard, { accessibilityRole: 'tab', selected: true }, 'tab', { selected: true }],
  ]) await render(React.createElement(Component, props), root => {
    assert.equal(target(root).props.accessibilityRole, role);
    assert.deepEqual(target(root).props.accessibilityState, { ...state, disabled: false, busy: undefined });
  });
});

test('primary label and icon colors track theme changes, including pale custom accents', async () => {
  await render(React.createElement(ActionButton, { variant: 'primary', style: { flex: 1 } },
    React.createElement(ButtonLabel, null, 'Save'), React.createElement(ButtonIcon, { name: 'checkmark' })), async root => {
    assert.equal(style(root).backgroundColor, light.accent);
    assert.equal(style(root).flex, 1);
    palette = { ...light, accent: '#F5DF88', onAccent: '#000000' };
    await act(() => root.update(React.createElement(ActionButton, { variant: 'primary' },
      React.createElement(ButtonLabel, null, 'Save'), React.createElement(ButtonIcon, { name: 'checkmark' }))));
    assert.equal(style(root).backgroundColor, '#F5DF88');
    assert.equal(flatten(root.root.findByType('Text').props.style).color, '#000000');
    assert.equal(root.root.findByType('Icon').props.color, '#000000');
    assert.notEqual(controlColors(palette, 'destructive').foreground, palette.accent);
  });
});

test('icon controls keep 44 point targets and web focus is cleared on blur', async () => {
  await render(React.createElement(IconButton, { accessibilityLabel: 'Close', selected: true }), async root => {
    assert.equal(style(root).width, 44);
    assert.equal(style(root).minHeight, 44);
    assert.equal(style(root).backgroundColor, light.accent);
    await act(() => target(root).props.onFocus({}));
    assert.equal(style(root).outlineWidth, 2);
    await act(() => target(root).props.onBlur({}));
    assert.equal(style(root).outlineWidth, undefined);
  });
});

test('dismissal surfaces have no animation, feedback, or keyboard stop', async () => {
  await render(React.createElement(DismissSurface, { onPress() {} }), root => {
    const props = target(root).props;
    assert.equal(props.pressScale, 1);
    assert.equal(props.feedback, 'none');
    assert.equal(props.accessible, false);
    assert.equal(props.focusable, false);
  });
});

test('artwork can own its animation and sound while keeping the interaction contract', async () => {
  await render(React.createElement(InteractiveSurface, { customFeedback: true, accessibilityLabel: 'Catch Pokémon' }), root => {
    const props = target(root).props;
    assert.equal(props.pressScale, 1);
    assert.equal(props.feedback, 'none');
    assert.equal(props.accessibilityRole, 'button');
    assert.equal(flatten(props.style({ pressed: true, hovered: false })).opacity, undefined);
  });
});

test('native forms retain native buttons, destructive tint, and a stable loading name', async () => {
  platform.OS = 'ios';
  await render(React.createElement(AppButton, { label: 'Delete', loading: true, variant: 'destructive', onPress() { throw new Error('Must not submit'); } }), root => {
    assert.equal(root.root.findByType('NativeButton').props.disabled, true);
    assert.equal(root.root.findByType('Host').props.accessibilityState.busy, true);
    assert.equal(root.root.findByType('Host').props.seedColor, controlColors(light, 'destructive').foreground);
    assert.equal(root.root.findByType('NativeText').props.modifiers.at(-1).label, 'Delete');
    const before = taps;
    root.root.findByType('NativeButton').props.onPress();
    assert.equal(taps, before);
  });
});
