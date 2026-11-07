import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import ts from 'typescript';

export const CONTROL_TYPES = {
  AppButton: 'Form action', ActionButton: 'Inline action', IconButton: 'Icon action', TextButton: 'Text action',
  ChoiceChip: 'Choice chip', ChoiceCard: 'Choice card', ToggleRow: 'Checklist toggle', TabButton: 'Navigation tab',
  ActionRow: 'Disclosure / action row', InteractiveSurface: 'Artwork / spatial interaction',
  DismissSurface: 'Dismissal / event boundary', DomDismissSurface: 'Dismissal / event boundary', DomButton: 'DOM action / spatial target',
  AppSwitch: 'Native switch', AppCheckbox: 'Native checkbox', AppSegments: 'Native segmented control',
  AppPicker: 'Native picker', AppSlider: 'Native slider', DateTimeField: 'Date / time field',
  AnimatedStarTarget: 'SVG star target', GoogleButton: 'Provider sign-in',
};
const implementations = new Set([
  'components/app-controls.tsx', 'components/native-controls.tsx', 'components/motion.tsx',
  'components/dom-button.tsx', 'components/date-time-field.tsx', 'components/date-time-field.web.tsx',
]);
async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? sourceFiles(join(directory, entry.name))
    : entry.name.endsWith('.tsx') ? [join(directory, entry.name)] : []))).flat();
}
const controls = [];
const unclassified = [];
for (const file of (await Promise.all(['app', 'components', 'features'].map(sourceFiles))).flat().sort()) {
  if (implementations.has(file)) continue;
  const source = ts.createSourceFile(file, await readFile(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const aliases = new Map();
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement) && statement.importClause?.namedBindings && ts.isNamedImports(statement.importClause.namedBindings)) {
      for (const specifier of statement.importClause.namedBindings.elements) {
        aliases.set(specifier.name.text, (specifier.propertyName ?? specifier.name).text);
      }
    }
  }
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const localTag = node.tagName.getText(source);
      const tag = aliases.get(localTag) ?? localTag;
      const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
      const attributes = Object.fromEntries(node.attributes.properties.filter(ts.isJsxAttribute).map(attribute =>
        [attribute.name.getText(source), attribute.initializer?.getText(source)]));
      const defaultVariant = { AppButton: 'primary', ActionButton: 'secondary', TextButton: 'ghost',
        IconButton: attributes.selected ? 'primary when selected; secondary otherwise' : 'secondary', DomButton: 'secondary' }[tag] ?? '';
      if (CONTROL_TYPES[tag]) controls.push({ file, line, component: tag, category: CONTROL_TYPES[tag],
        label: attributes.accessibilityLabel ?? attributes['aria-label'] ?? attributes.label ?? '', variant: attributes.variant ?? defaultVariant });
      else if (['Pressable', 'TouchableOpacity', 'TouchableHighlight', 'TouchableWithoutFeedback', 'MotionPressable', 'MotionTouchableOpacity', 'Button', 'button', 'a', 'Link'].includes(tag)) {
        unclassified.push({ file, line, tag });
      } else if (/^[a-z]/.test(tag) && (attributes.onClick || attributes.onPress)) {
        unclassified.push({ file, line, tag });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
if (process.argv.includes('--json')) console.log(JSON.stringify({ controls, unclassified }, null, 2));
else if (process.argv.includes('--markdown')) {
  console.log('# Control inventory\n');
  console.log(`Generated with \`node scripts/audit-controls.mjs --markdown > docs/control-inventory.md\`.\n\n${controls.length} source locations across ${new Set(controls.map(control => control.file)).size} files. A mapped control can render many runtime instances. Shared implementation internals are excluded.\n`);
  console.log('| Category | Component | Variant | Location | Accessible label / caption |\n| --- | --- | --- | --- | --- |');
  const cell = value => value.replace(/\s+/g, ' ').replaceAll('|', '\\|').replaceAll('`', '\\`');
  for (const control of controls) console.log(`| ${control.category} | ${control.component} | ${cell(control.variant)} | [${control.file}:${control.line}](../${control.file}#L${control.line}) | ${cell(control.label)} |`);
}
else {
  const counts = Object.groupBy(controls, control => control.category);
  console.table(Object.entries(counts).map(([category, entries]) => ({ category, controls: entries.length })));
  console.log(`${controls.length} categorized controls across ${new Set(controls.map(control => control.file)).size} files.`);
  if (unclassified.length) { console.error('Controls needing classification:', unclassified); process.exitCode = 1; }
}
