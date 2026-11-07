import assert from 'node:assert/strict';
import test from 'node:test';
import { buildQuizMemories, readQuizProfile, recommendPersonality } from './personality-quiz-model.ts';
import { readChatAttempt } from './chat-repository.ts';

test('recommends each personality from the majority and resolves ties with the reply preference', () => {
  for (const personality of ['warm', 'direct', 'curious']) {
    assert.equal(recommendPersonality([personality, personality, 'warm']), personality);
  }
  assert.equal(recommendPersonality(['warm', 'direct', 'curious']), 'curious');
  assert.equal(recommendPersonality(['curious', 'warm', 'direct']), 'direct');
});

test('quiz details and personality form one valid preferences command while preserving existing memories', () => {
  const existing = { id: '11111111-1111-4111-8111-111111111111', text: 'I like short sessions' };
  const profile = { name: '  Alex  ', goal: '  Study consistently  ', focusTime: 'Evening' };
  const memories = buildQuizMemories([existing], profile);
  assert.deepEqual(memories[0], existing);
  assert.deepEqual(readQuizProfile(memories), { name: 'Alex', goal: 'Study consistently', focusTime: 'Evening' });
  assert.doesNotThrow(() => readChatAttempt({
    operationId: '22222222-2222-4222-8222-222222222222',
    command: { kind: 'preferences', revision: 0, personality: 'direct', memories },
  }));
});

test('retaking updates quiz memories without duplicates and clears omitted optional details', () => {
  const first = buildQuizMemories([], { name: 'Alex', goal: 'Study', focusTime: 'Evening' });
  const retake = buildQuizMemories(first, { name: '', goal: 'Read daily', focusTime: '' });
  assert.equal(retake.length, 1);
  assert.equal(retake[0].id, first[1].id);
  assert.deepEqual(readQuizProfile(retake), { name: '', goal: 'Read daily', focusTime: '' });
  assert.deepEqual(readQuizProfile([]), { name: '', goal: '', focusTime: '' });
});

test('enforces required goal, input bounds and the memory limit without discarding saved details', () => {
  assert.throws(() => buildQuizMemories([], { name: '', goal: '   ', focusTime: '' }), /current goal/);
  assert.throws(() => buildQuizMemories([], { name: 'a'.repeat(61), goal: 'Study', focusTime: '' }), /shorten/);
  assert.throws(() => buildQuizMemories([], { name: '', goal: 'a'.repeat(161), focusTime: '' }), /shorten/);
  const full = Array.from({ length: 50 }, (_, index) => ({ id: String(index), text: 'Existing memory' }));
  assert.throws(() => buildQuizMemories(full, { name: '', goal: 'Study', focusTime: '' }), /memories are full/);
  assert.equal(full.length, 50);
  const quizOnly = buildQuizMemories([], { name: 'Alex', goal: 'Study', focusTime: 'Evening' });
  assert.equal(buildQuizMemories([...full.slice(0, 47), ...quizOnly], { name: 'Sam', goal: 'Read', focusTime: 'Morning' }).length, 50);
});
