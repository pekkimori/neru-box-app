import assert from 'node:assert/strict';
import test from 'node:test';
import { ICON_GLYPHS, iconKey, iconGlyph, MOOD_KEYS, moodKey } from './icon-reference.ts';

test('symbolic icon names render their original glyphs, including server-created piano domains', () => {
  assert.equal(iconGlyph('piano'), '🎹');
  assert.equal(iconGlyph('water'), '💧');
  assert.equal(iconGlyph('sparkles'), '✨');
  for (const [name, glyph] of Object.entries(ICON_GLYPHS)) {
    assert.match(name, /^[a-z][a-z0-9-]{0,63}$/);
    assert.equal(iconKey(glyph), name);
    assert.equal(iconGlyph(name), glyph);
  }
  assert.equal(iconKey('🛏'), 'bed');
  assert.equal(iconKey('❤︎'), 'heart');
  assert.equal(iconGlyph('future-icon'), '✨');
  assert.throws(() => iconKey('unsupported glyph 🧿'), /supported/);
});
test('diary moods use semantic keys and read legacy emoji without changing selection', () => {
  for (const key of MOOD_KEYS) assert.equal(moodKey(key), key);
  assert.equal(moodKey('⚡'), 'charged');
  assert.equal(moodKey('😌'), 'calm');
  assert.equal(moodKey('🔥'), 'on-fire');
  assert.equal(moodKey('unknown'), null);
  assert.equal(moodKey('toString'), null);
});
