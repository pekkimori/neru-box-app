import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Run the real palette/style implementation with only RN's StyleSheet adapter
// replaced; no native runtime is needed to verify cache identity and scoping.
const source = await readFile(new URL('./editorial-theme.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
  .replace(/import \{\s*StyleSheet,?\s*\} from 'react-native';/, 'const StyleSheet = { create: (value) => value };');
const { buildEditorialPalette, createEditorialPalette, createEditorialStyles, resolveEditorialStyles, setActiveEditorialPalette } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('reuses palettes and styles across components and theme round trips', () => {
  const light = buildEditorialPalette('light', 'neru');
  const dark = buildEditorialPalette('dark', 'neru');
  assert.equal(light, buildEditorialPalette('light', 'neru'));
  const palette = createEditorialPalette();
  let builds = 0;
  const styles = createEditorialStyles(() => { builds++; return { card: { color: palette.text } }; });
  const lightStyles = resolveEditorialStyles(styles, light);
  for (let i = 0; i < 500; i++) assert.equal(resolveEditorialStyles(styles, light), lightStyles);
  assert.equal(resolveEditorialStyles(styles, dark).card.color, dark.text);
  assert.equal(resolveEditorialStyles(styles, light), lightStyles);
  assert.equal(builds, 2);
});

test('materializing a different palette cannot leak into active screen colors', () => {
  const light = buildEditorialPalette('light', 'neru');
  const dark = buildEditorialPalette('dark', 'dracula');
  setActiveEditorialPalette(light);
  const palette = createEditorialPalette();
  const styles = createEditorialStyles(() => ({ card: { backgroundColor: palette.background } }));
  assert.equal(resolveEditorialStyles(styles, dark).card.backgroundColor, dark.background);
  assert.equal(palette.background, light.background);
  assert.equal(styles.card.backgroundColor, light.background);
});
