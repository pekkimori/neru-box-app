import assert from 'node:assert/strict';
import test from 'node:test';

import { computeGalaxyPositions } from './galaxy-geometry.ts';
import { buildGalaxyEdges } from './galaxy-edges.ts';
import { createGalaxyMockStars } from './galaxy-mock-data.ts';

function star(id, domain, date, week, order = 0, completedAt) {
  return {
    starId: id,
    label: id,
    constellationId: domain,
    constellationName: `Domain ${domain}`,
    constellationIcon: '·',
    completionDate: date,
    completedAt,
    completionOrder: order,
    isoWeek: week,
    weekLabel: '',
    coinsEarned: 1,
    domainColor: '',
    x: 0,
    y: 0,
  };
}

test('chains each day by actual completion timestamp', () => {
  const input = [
    star('third', 'c', '2026-07-06', '2026-W28', 0, '2026-07-06T18:00:00.000Z'),
    star('first', 'a', '2026-07-06', '2026-W28', 2, '2026-07-06T08:00:00.000Z'),
    star('second', 'b', '2026-07-06', '2026-W28', 1, '2026-07-06T12:00:00.000Z'),
  ];
  const sequence = buildGalaxyEdges(input).filter((edge) => edge.kind === 'daily-sequence');

  assert.deepEqual(
    sequence.map((edge) => [edge.from.starId, edge.to.starId]),
    [['first', 'second'], ['second', 'third']],
  );
});

test('links a repeated domain to its previous task from the same day', () => {
  const input = [
    star('a-first', 'a', '2026-07-06', '2026-W28', 0),
    star('b', 'b', '2026-07-06', '2026-W28', 1),
    star('a-again', 'a', '2026-07-06', '2026-W28', 2),
  ];
  const repeated = buildGalaxyEdges(input).filter((edge) => edge.kind === 'domain-repeat');

  assert.equal(repeated.length, 1);
  assert.deepEqual([repeated[0].from.starId, repeated[0].to.starId], ['a-first', 'a-again']);
});

test('bridges the next day to one stable node from the previous day', () => {
  const input = [
    star('day-one-a', 'a', '2026-07-06', '2026-W28', 0),
    star('day-one-b', 'b', '2026-07-06', '2026-W28', 1),
    star('day-two-first', 'c', '2026-07-07', '2026-W28', 0),
    star('day-two-second', 'd', '2026-07-07', '2026-W28', 1),
  ];
  const first = buildGalaxyEdges(input).filter((edge) => edge.kind === 'day-bridge');
  const second = buildGalaxyEdges([...input].reverse()).filter((edge) => edge.kind === 'day-bridge');

  assert.equal(first.length, 1);
  assert.equal(first[0].to.starId, 'day-two-first');
  assert.equal(first[0].from.completionDate, '2026-07-06');
  assert.equal(first[0].from.starId, second[0].from.starId);
});

test('never connects one week structure to another', () => {
  const input = [
    star('week-28', 'a', '2026-07-12', '2026-W28'),
    star('week-29', 'b', '2026-07-13', '2026-W29'),
  ];
  const edges = buildGalaxyEdges(input);

  assert.equal(edges.length, 0);
});

test('uses readable date ranges and stable distinct domain colors', () => {
  const input = [
    star('a1', 'a', '2026-07-06', '2026-W28'),
    star('b1', 'b', '2026-07-07', '2026-W28'),
    star('c1', 'c', '2026-07-08', '2026-W28'),
  ];
  const first = computeGalaxyPositions(input, buildGalaxyEdges(input));
  const reversed = [...input].reverse();
  const second = computeGalaxyPositions(reversed, buildGalaxyEdges(reversed));

  assert.equal(first.weekLabels[0].label, 'Jul 6–12, 2026');
  assert.doesNotMatch(first.weekLabels[0].label, /^W\d/);
  assert.equal(new Set(first.domains.map((domain) => domain.color)).size, 3);
  assert.deepEqual(
    first.domains.map((domain) => [domain.constellationId, domain.color]),
    second.domains.map((domain) => [domain.constellationId, domain.color]),
  );
});

test('spreads a same-day chain into a graph instead of one vertical stick', () => {
  const input = ['a', 'b', 'c', 'd'].map((domain, index) => (
    star(`task-${domain}`, domain, '2026-07-12', '2026-W28', index)
  ));
  const layout = computeGalaxyPositions(input, buildGalaxyEdges(input));
  const roundedX = new Set(layout.positioned.map((item) => Math.round(item.x)));
  const roundedY = new Set(layout.positioned.map((item) => Math.round(item.y)));

  assert.ok(roundedX.size >= 3);
  assert.ok(roundedY.size >= 3);
});

test('mock archive spans four disconnected weeks with dense daily chains', () => {
  const mocks = createGalaxyMockStars();
  const weeks = new Set(mocks.map((item) => item.isoWeek));
  const edges = buildGalaxyEdges(mocks);

  assert.equal(mocks.length, 40);
  assert.equal(weeks.size, 4);
  assert.ok(edges.length > 30);
  assert.ok(edges.every((edge) => edge.from.isoWeek === edge.to.isoWeek));
});
