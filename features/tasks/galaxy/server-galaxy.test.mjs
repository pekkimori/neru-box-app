import assert from 'node:assert/strict';
import test from 'node:test';
import { mapServerGalaxy } from './server-galaxy.ts';

test('the online archive keeps separate assignments and deleted-goal history within its nebula', () => {
  const history = [{ date: '2026-10-04', tasks: [
    { id: 'first', questId: 'repeat', nebulaId: 'home', title: 'First round', status: 'lit', coinsEarned: 0, completionPhotoUri: '/tasks/first/photos/proof/content' },
    { id: 'second', questId: 'repeat', nebulaId: 'home', title: 'Second round', status: 'lit', coinsEarned: 0 },
    { id: 'not-done', nebulaId: 'home', title: 'Later', status: 'dim', coinsEarned: 0 },
  ] }, { date: '2026-10-03', tasks: [{ id: 'detached', questId: null, nebulaId: 'home', title: 'Historical task', status: 'lit', coinsEarned: 0 }] }];
  const nebulas = [{ id: 'home', name: 'Home', icon: '🏠', archivedAt: '2026-10-04' }];
  const mapped = mapServerGalaxy(history, nebulas);
  assert.equal(mapped.stars.length, 3);
  assert.equal(new Set(mapped.stars.map(star => star.starId)).size, 3);
  assert.ok(mapped.stars.every(star => star.constellationName === 'Home'));
  assert.equal(mapped.stars.find(star => star.starId === 'server:first').completionPhotoUri, '/tasks/first/photos/proof/content');
  assert.ok(mapped.stars.every(star => Number.isFinite(star.x) && Number.isFinite(star.y)));
  assert.equal(mapServerGalaxy(history, nebulas, new Set(['2026-10-04:server:first'])).stars.length, 2);
});
