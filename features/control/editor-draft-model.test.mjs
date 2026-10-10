import assert from 'node:assert/strict';
import test from 'node:test';
import { savedApps, savedEffects } from './editor-draft-model.ts';

test('saving a numeric draft rejects incomplete fields instead of substituting a limit', () => {
  for (const limitMinutes of ['', '1x', '0', '1441', '1.5']) {
    assert.throws(() => savedApps([{ id: 'messages', limitMinutes }]), /whole number/);
  }
  const draft = [{ id: 'messages', limitMinutes: '90' }];
  assert.deepEqual(savedApps(draft), [{ id: 'messages', limitMinutes: 90 }]);
  assert.equal(draft[0].limitMinutes, '90');
});

test('mode timing is converted only for saving and incomplete timing cannot be committed', () => {
  const effect = { mute: false, grayscale: false, blueLight: false, pomodoro: true, reduceInterruptions: false, allowedAppIds: [], workMinutes: '25', breakMinutes: '5' };
  const draft = { normal: effect, focus: effect, sleep: effect };
  assert.equal(savedEffects(draft).focus.workMinutes, 25);
  assert.equal(draft.focus.workMinutes, '25');
  assert.throws(() => savedEffects({ ...draft, focus: { ...effect, workMinutes: '' } }), /focus work/);
  assert.throws(() => savedEffects({ ...draft, focus: { ...effect, breakMinutes: '61' } }), /focus break/);
});
