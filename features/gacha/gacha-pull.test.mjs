import assert from 'node:assert/strict';
import test from 'node:test';

import { getFeaturedPokemon, toGachaResult } from './gacha-pull.ts';

function pokemon(id, rarity) {
  return {
    id,
    name: `Pokemon ${id}`,
    rarity,
    captureRate: 100,
    isLegendary: false,
    isMythical: false,
    generation: 1,
    types: [],
    image: '',
    bannerIds: [],
    description: '',
  };
}

test('features the rarest notable result in a batch', () => {
  const results = [pokemon(1, 'common'), pokemon(2, 'epic'), pokemon(3, 'legendary')];
  assert.equal(getFeaturedPokemon(results)?.id, 3);
});

test('maps catalog and media data to the persisted result shape', () => {
  const result = toGachaResult(pokemon(25, 'rare'), {
    frontSprite: 'front', backSprite: null, cry: 'cry',
  });
  assert.equal(result.id, 25);
  assert.equal(result.frontSprite, 'front');
  assert.equal(result.cry, 'cry');
});
