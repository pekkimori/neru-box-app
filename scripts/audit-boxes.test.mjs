import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectBoxSource } from './audit-boxes.mjs';

test('surface audit detects stylesheet and inline bypasses while ignoring layout-only views', () => {
  const result = inspectBoxSource('example.tsx', `
    const styles = { card: { backgroundColor: colors.card, borderRadius: 12, padding: 16 }, layout: { flex: 1, gap: 12 } };
    <View style={{ borderWidth: 1, borderColor: colors.line, padding: 20 }} />;
  `);
  assert.equal(result.candidates.length, 2);
  assert.deepEqual(result.candidates.map(c => c.owner), ['card', 'View[1]']);
});

test('surface audit recognizes aliased components and recipes without treating them as bypasses', () => {
  const result = inspectBoxSource('example.tsx', `
    import { AppBox as Box } from '@/components/app-box';
    import { boxStyle as surface } from '@/theme/boxes';
    const styles = { input: { ...surface(colors, { variant: 'field' }), color: colors.text } };
    <Box variant="group" />;
  `);
  assert.equal(result.candidates.length, 0);
  assert.deepEqual(result.boxes.map(b => b.variant), ['field', 'group']);
});
