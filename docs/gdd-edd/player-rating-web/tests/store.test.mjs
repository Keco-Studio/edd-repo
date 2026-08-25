import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JsonStore, hashRespondent } from '../src/store.mjs';

test('creates unique sessions and persists after reload', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'edd-store-'));
  const file = join(dir, 'store.json');
  const store = new JsonStore(file);
  await store.init();
  const first = await store.createSession({ gameTitle: 'A', resultDocument: 'a.md', aiCoreScore: 40, aiExperienceScore: 40, minimumResponses: 5, expiresAt: new Date(Date.now() + 86400000).toISOString() });
  const second = await store.createSession({ gameTitle: 'B', resultDocument: 'b.md', aiCoreScore: 40, aiExperienceScore: 40, minimumResponses: 5, expiresAt: new Date(Date.now() + 86400000).toISOString() });
  assert.notEqual(first.publicToken, second.publicToken);
  const reloaded = new JsonStore(file);
  await reloaded.init();
  assert.equal(reloaded.getSessionByToken(first.publicToken).gameTitle, 'A');
  assert.doesNotReject(async () => JSON.parse(await readFile(file, 'utf8')));
});

test('upserts one rating per respondent and blocks closed sessions', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'edd-store-'));
  const store = new JsonStore(join(dir, 'store.json'));
  await store.init();
  const session = await store.createSession({ gameTitle: 'A', resultDocument: 'a.md', aiCoreScore: 40, aiExperienceScore: 40, minimumResponses: 5, expiresAt: new Date(Date.now() + 86400000).toISOString() });
  const respondentHash = hashRespondent(session.id, 'browser-1');
  await store.upsertRating(session.id, respondentHash, { coreScore: 2, experienceScore: 3, coreReasons: [], experienceReasons: [], comment: '' });
  await store.upsertRating(session.id, respondentHash, { coreScore: 5, experienceScore: 4, coreReasons: [], experienceReasons: [], comment: 'updated' });
  assert.equal(store.getRatings(session.id).length, 1);
  assert.equal(store.getRatings(session.id)[0].coreScore, 5);
  await store.closeSession(session.id);
  await assert.rejects(store.upsertRating(session.id, 'other', { coreScore: 5, experienceScore: 5, coreReasons: [], experienceReasons: [], comment: '' }), /关闭/);
});

test('blocks expired sessions', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'edd-store-'));
  const store = new JsonStore(join(dir, 'store.json'));
  await store.init();
  const session = await store.createSession({ gameTitle: 'A', resultDocument: 'a.md', aiCoreScore: 40, aiExperienceScore: 40, minimumResponses: 5, expiresAt: new Date(Date.now() - 1000).toISOString() });
  await assert.rejects(store.upsertRating(session.id, 'x', { coreScore: 3, experienceScore: 3, coreReasons: [], experienceReasons: [], comment: '' }), /过期/);
});
