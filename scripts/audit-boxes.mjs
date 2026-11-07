import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const roots = ['app', 'components', 'features'];
const implementations = new Set(['components/app-box.tsx', 'components/app-controls.tsx', 'components/dom-button.tsx']);

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? sourceFiles(join(directory, entry.name))
    : /\.(ts|tsx)$/.test(entry.name) ? [join(directory, entry.name)] : []))).flat();
}

/** Find explicit surface chrome, including inline styles, rather than every layout View. */
export function inspectBoxSource(file, text) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const boxes = [];
  const candidates = [];
  const inlineCounts = new Map();
  const aliases = new Map();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause?.namedBindings || !ts.isNamedImports(statement.importClause.namedBindings)) continue;
    for (const specifier of statement.importClause.namedBindings.elements) aliases.set(specifier.name.text, (specifier.propertyName ?? specifier.name).text);
  }
  const canonical = name => aliases.get(name) ?? name;
  const location = node => ({ file, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1 });
  const propName = node => node.name?.getText(source).replace(/^['"]|['"]$/g, '');
  function owner(node) {
    if (ts.isPropertyAssignment(node.parent)) return propName(node.parent);
    if (ts.isVariableDeclaration(node.parent)) return node.parent.name.getText(source);
    let parent = node.parent;
    while (parent && !ts.isJsxOpeningElement(parent) && !ts.isJsxSelfClosingElement(parent)) parent = parent.parent;
    const tag = parent ? canonical(parent.tagName.getText(source)) : 'inline';
    const index = (inlineCounts.get(tag) ?? 0) + 1;
    inlineCounts.set(tag, index);
    return `${tag}[${index}]`;
  }
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = canonical(node.tagName.getText(source));
      if (tag === 'AppBox') {
        const attrs = Object.fromEntries(node.attributes.properties.filter(ts.isJsxAttribute).map(a => [a.name.getText(source), a.initializer?.getText(source)]));
        boxes.push({ ...location(node), owner: tag, variant: attrs.variant?.replaceAll('"', '') ?? 'card', tone: attrs.tone ?? 'neutral' });
      }
    }
    if (ts.isCallExpression(node) && ['boxStyle', 'boxCSSStyle'].includes(canonical(node.expression.getText(source)))) {
      const options = node.arguments[1];
      const props = options && ts.isObjectLiteralExpression(options) ? Object.fromEntries(options.properties.filter(ts.isPropertyAssignment).map(p => [propName(p), p.initializer.getText(source)])) : {};
      boxes.push({ ...location(node), owner: node.expression.getText(source), variant: props.variant?.replace(/['"]/g, '') ?? 'card', tone: props.tone ?? 'neutral' });
    }
    if (ts.isObjectLiteralExpression(node)) {
      const props = node.properties.filter(ts.isPropertyAssignment);
      const names = props.map(propName);
      const hasRecipe = node.properties.some(p => ts.isSpreadAssignment(p) && ts.isCallExpression(p.expression)
        && ['boxStyle', 'boxCSSStyle'].includes(canonical(p.expression.expression.getText(source))));
      const padding = names.some(p => /^padding/.test(p));
      const border = names.includes('borderWidth') || names.includes('border');
      const background = names.includes('backgroundColor') || names.includes('background');
      const radius = names.includes('borderRadius');
      if (!hasRecipe && ((radius && (padding || border || background)) || (border && (padding || background)) || (padding && background))) {
        const name = owner(node);
        candidates.push({ ...location(node), key: `${file}#${name}`, owner: name, properties: names });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return { boxes, candidates };
}

export async function auditBoxes() {
  const exceptions = JSON.parse(await readFile(new URL('./box-exceptions.json', import.meta.url), 'utf8'));
  const results = await Promise.all((await Promise.all(roots.map(sourceFiles))).flat().sort().filter(f => !implementations.has(f))
    .map(async file => inspectBoxSource(file, await readFile(file, 'utf8'))));
  const boxes = results.flatMap(r => r.boxes);
  const candidates = results.flatMap(r => r.candidates).map(candidate => ({ ...candidate, classification: exceptions[candidate.key] }));
  return { boxes, exceptions: candidates.filter(c => c.classification), unclassified: candidates.filter(c => !c.classification) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await auditBoxes();
  if (process.argv.includes('--json')) console.log(JSON.stringify(result, null, 2));
  else if (process.argv.includes('--markdown')) {
    const cell = value => String(value).replace(/\s+/g, ' ').replaceAll('|', '\\|');
    const link = row => `[${row.file}:${row.line}](../${row.file}#L${row.line})`;
    console.log('# Box inventory\n');
    console.log('Generated with `node scripts/audit-boxes.mjs --markdown > docs/box-inventory.md`. Source locations include mapped collections, not runtime instance counts. Layout-only Views are outside this surface audit.\n');
    console.log(`${result.boxes.length} shared surface locations; ${result.exceptions.length} classified structural, control, and artwork styles.\n`);
    console.log('| Box type | Owner | Tone | Source |\n| --- | --- | --- | --- |');
    for (const row of result.boxes) console.log(`| ${cell(row.variant)} | ${row.owner} | ${cell(row.tone)} | ${link(row)} |`);
    console.log('\n## Specialized containers and non-container shapes\n');
    console.log('| Style | Classification / owner | Source |\n| --- | --- | --- |');
    for (const row of result.exceptions) console.log(`| ${cell(row.owner)} | ${cell(row.classification)} | ${link(row)} |`);
    if (result.unclassified.length) console.log('\nUnclassified: '+result.unclassified.map(c => c.key).join(', '));
  } else {
    console.table(Object.entries(Object.groupBy(result.boxes, b => b.variant)).map(([variant, rows]) => ({ variant, locations: rows.length })));
    console.log(`${result.boxes.length} shared surfaces; ${result.exceptions.length} explicit exceptions.`);
    if (result.unclassified.length) { console.error('Surface styles needing classification:\n'+result.unclassified.map(c => c.key).join('\n')); process.exitCode = 1; }
  }
}
