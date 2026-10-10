import assert from 'node:assert/strict';
import test from 'node:test';
import { formatMessageText } from './message-format.ts';

test('renders single and double asterisks as bold alongside ordinary text', () => {
  assert.deepEqual(formatMessageText('Olá *texto* e **outro texto**!'), [
    { text: 'Olá ', bold: false },
    { text: 'texto', bold: true },
    { text: ' e ', bold: false },
    { text: 'outro texto', bold: true },
    { text: '!', bold: false },
  ]);
  assert.deepEqual(formatMessageText('*é*\n**linha um\nlinha dois**'), [
    { text: 'é', bold: true },
    { text: '\n', bold: false },
    { text: 'linha um\nlinha dois', bold: true },
  ]);
});

test('preserves unfinished streaming spans and formats them when closed', () => {
  for (const text of ['*', '**', '*texto', '**texto*', 'texto*', '* texto *']) {
    assert.deepEqual(formatMessageText(text), [{ text, bold: false }]);
  }
  assert.deepEqual(formatMessageText('**texto**'), [{ text: 'texto', bold: true }]);
  assert.deepEqual(formatMessageText(''), []);
});

test('preserves literal asterisks in escapes, code, lists and multiplication', () => {
  const text = '* item\n2 * 3 * 4\n`*code*`\n```\n**code**\n```';
  assert.deepEqual(formatMessageText(text), [{ text, bold: false }]);
  assert.deepEqual(formatMessageText(String.raw`\*literal\* e *bold \* literal*`), [
    { text: '*literal* e ', bold: false },
    { text: 'bold * literal', bold: true },
  ]);
});
