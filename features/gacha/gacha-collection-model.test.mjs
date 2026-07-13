import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getGachaResultsAcquiredOnDate,
  hasValidAcquisitionDate,
} from './gacha-collection-model.ts';

test('returns unique Pokémon acquired on the requested local date', () => {
  const collection = [
    { id: 25, name: 'Pikachu', rarity: 'common', acquiredAt: '2026-07-12T20:00:00Z', acquiredDate: '2026-07-12' },
    { id: 1, name: 'Bulbasaur', rarity: 'common', acquiredAt: '2026-07-13T10:00:00Z', acquiredDate: '2026-07-13' },
    { id: 25, name: 'Pikachu', rarity: 'common', acquiredAt: '2026-07-13T11:00:00Z', acquiredDate: '2026-07-13' },
    { id: 25, name: 'Pikachu', rarity: 'common', acquiredAt: '2026-07-13T12:00:00Z', acquiredDate: '2026-07-13' },
  ];

  assert.deepEqual(
    getGachaResultsAcquiredOnDate(collection, '2026-07-13').map((result) => result.name),
    ['Pikachu', 'Bulbasaur'],
  );
});

test('requires both a valid timestamp and a valid frozen local date', () => {
  assert.equal(hasValidAcquisitionDate({
    name: 'Eevee', rarity: 'rare', acquiredAt: '2026-07-13T12:00:00Z', acquiredDate: '2026-07-13',
  }), true);
  assert.equal(hasValidAcquisitionDate({
    name: 'Eevee', rarity: 'rare', acquiredAt: 'invalid', acquiredDate: '2026-07-13',
  }), false);
  assert.equal(hasValidAcquisitionDate({
    name: 'Eevee', rarity: 'rare', acquiredAt: '2026-07-13T12:00:00Z', acquiredDate: '2026-02-30',
  }), false);
});
