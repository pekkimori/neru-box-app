import test from 'node:test';
import assert from 'node:assert/strict';
import { getPokemonCryUrl } from './pokemon-cry.ts';

test('uses mobile-compatible cries for ordinary and punctuated species names', () => {
  for (const [name, file] of [['Psyduck', 'psyduck'], ['Mr. Mime', 'mrmime'], ["Farfetch’d", 'farfetchd'], ['nidoran-f', 'nidoranf'], ['Nidoran♂', 'nidoranm'], ['Ho-Oh', 'hooh'], ['Mime Jr.', 'mimejr']]) {
    assert.equal(getPokemonCryUrl(name), `https://play.pokemonshowdown.com/audio/cries/${file}.mp3`);
  }
});
