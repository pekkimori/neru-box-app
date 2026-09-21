import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import React from 'react';
import { act, create } from 'react-test-renderer';
import ts from 'typescript';

const require = createRequire(import.meta.url);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const reads = [];
const storage = {
  getItem: () => new Promise((resolve) => reads.push(resolve)),
  setItem: async () => {},
};
globalThis.__neruStorageTestAdapter = storage;
const source = await readFile(new URL('./useStorage.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  .replace("from 'react'", `from '${pathToFileURL(require.resolve('react')).href}'`)
  .replace(/import AsyncStorage from '@react-native-async-storage\/async-storage';/, 'const AsyncStorage = globalThis.__neruStorageTestAdapter;');
const { useStorage } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
delete globalThis.__neruStorageTestAdapter;

function mountSubscribers(key, output) {
  function Subscriber({ name }) {
    output[name] = useStorage(key, []);
    return null;
  }
  return create(React.createElement(React.Fragment, null,
    React.createElement(Subscriber, { name: 'first' }),
    React.createElement(Subscriber, { name: 'second' }),
  ));
}

test('a sibling update completes hydration even if the initial read is still pending', async () => {
  reads.length = 0;
  const output = {};
  let renderer;
  await act(async () => { renderer = mountSubscribers('hydration-race', output); });
  assert.equal(output.second.loaded, false);
  await act(async () => { reads[0]('[]'); });
  await act(async () => { output.first.save(['new domain']); });
  assert.equal(output.second.loaded, true);
  assert.deepEqual(output.second.value, ['new domain']);
  await act(async () => { reads[1]('["stale domain"]'); });
  assert.equal(output.second.loaded, true);
  assert.deepEqual(output.second.value, ['new domain']);
  await act(async () => renderer.unmount());
});

test('writing before either read finishes keeps both subscribers loaded', async () => {
  reads.length = 0;
  const output = {};
  let renderer;
  await act(async () => { renderer = mountSubscribers('local-write-race', output); });
  await act(async () => { output.first.save(['first task']); });
  await act(async () => reads.forEach((resolve) => resolve(null)));
  for (const subscriber of Object.values(output)) {
    assert.equal(subscriber.loaded, true);
    assert.deepEqual(subscriber.value, ['first task']);
  }
  await act(async () => renderer.unmount());
});
