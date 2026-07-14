import assert from 'node:assert/strict';
import test from 'node:test';

import { getNeruResponse } from './preview-model.ts';

test('matches response intent while preserving personality', () => {
  assert.match(getNeruResponse('Help me focus', 'direct'), /Choose one task/);
  assert.match(getNeruResponse('Help me focus', 'curious'), /pulls your attention/);
});

test('supports deterministic fallback selection', () => {
  const first = getNeruResponse('Something unmatched', 'warm', () => 0);
  const second = getNeruResponse('Something unmatched', 'warm', () => 0.99);
  assert.notEqual(first, second);
});
