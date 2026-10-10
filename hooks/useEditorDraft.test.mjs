import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import React from 'react';
import { act, create } from 'react-test-renderer';
import ts from 'typescript';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url);
const source = await readFile(new URL('./useEditorDraft.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  .replace("from 'react'", `from '${pathToFileURL(require.resolve('react')).href}'`);
const { useEditorDraft } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

async function fixture(save = async () => {}) {
  const writes = [];
  const checks = [];
  let output;
  function Editor({ value = '09:00', revision = 4 }) {
    output = useEditorDraft(value, revision, async (next, options) => {
      writes.push({ next, ...options });
      await save(next);
    }, next => {
      checks.push(next);
      if (!/^\d{2}:\d{2}$/.test(next)) throw new Error('Enter a complete time');
    });
    return null;
  }
  let renderer;
  await act(async () => { renderer = create(React.createElement(Editor)); });
  return { writes, checks, renderer, Editor, get: () => output };
}

test('typing stages incomplete values without validation or network writes, then commits once', async () => {
  const f = await fixture();
  try {
    await act(async () => f.get().begin());
    for (const value of ['', '1', '10:', '10:30']) await act(async () => f.get().setValue(value));
    assert.equal(f.get().value, '10:30');
    assert.deepEqual(f.checks, []);
    assert.deepEqual(f.writes, []);
    await act(async () => f.get().commit());
    assert.deepEqual(f.checks, ['10:30']);
    assert.deepEqual(f.writes, [{ next: '10:30', expectedRevision: 4 }]);
    await act(async () => f.get().commit());
    assert.equal(f.writes.length, 1);
  } finally { await act(async () => f.renderer.unmount()); }
});

test('a failed save retains the draft; correcting it does not revalidate until the next commit', async () => {
  const f = await fixture();
  try {
    await act(async () => f.get().setValue('10:'));
    await act(async () => { await assert.rejects(f.get().commit(), /complete time/); });
    assert.equal(f.get().value, '10:');
    assert.equal(f.writes.length, 0);
    await act(async () => f.get().setValue('10:30'));
    assert.deepEqual(f.checks, ['10:']);
    assert.equal(f.get().error, null);
    await act(async () => f.get().commit());
    assert.equal(f.writes.length, 1);
  } finally { await act(async () => f.renderer.unmount()); }
});

test('a background refresh preserves the draft and its original revision; reopening discards it', async () => {
  const f = await fixture();
  try {
    await act(async () => f.get().setValue('10:30'));
    await act(async () => f.renderer.update(React.createElement(f.Editor, { value: '11:00', revision: 5 })));
    assert.equal(f.get().value, '10:30');
    await act(async () => f.get().commit());
    assert.equal(f.writes[0].expectedRevision, 4);
    await act(async () => f.get().begin());
    assert.equal(f.get().value, '11:00');
  } finally { await act(async () => f.renderer.unmount()); }
});

test('network failure keeps the draft and double commits send only one request', async () => {
  let reject;
  const f = await fixture(() => new Promise((_, fail) => { reject = fail; }));
  try {
    await act(async () => f.get().setValue('10:30'));
    let first;
    await act(async () => { first = f.get().commit(); });
    await act(async () => assert.equal(await f.get().commit(), false));
    await act(async () => { reject(new Error('Offline')); await assert.rejects(first, /Offline/); });
    assert.equal(f.writes.length, 1);
    assert.equal(f.get().value, '10:30');
    assert.equal(f.get().saving, false);
  } finally { await act(async () => f.renderer.unmount()); }
});
