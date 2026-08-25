import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRatingServer } from '../src/server.mjs';

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'edd-server-'));
  const resultRoot = join(root, 'result');
  const dataFile = join(root, 'data', 'store.json');
  await import('node:fs/promises').then(({ mkdir }) => mkdir(resultRoot, { recursive: true }));
  await writeFile(join(resultRoot, 'result.md'), '# Result\n');
  const progressRoot = join(root, 'progress');
  const problemRoot = join(root, 'problem');
  const app = await createRatingServer({ resultRoot, progressRoot, problemRoot, dataFile, publicRoot: new URL('../public/', import.meta.url), adminToken: 'admin-test-token', host: '127.0.0.1', port: 0, rateLimit: 100 });
  await app.listen();
  return { app, root, resultRoot, progressRoot, problemRoot, base: app.baseUrl };
}

const json = (url, options = {}) => fetch(url, { ...options, headers: { 'content-type': 'application/json', ...(options.headers || {}) } });
const admin = { authorization: 'Bearer admin-test-token' };

test('admin auth, document list, public submit, update, close and sync', async (t) => {
  const f = await fixture();
  t.after(() => f.app.close());
  assert.equal((await fetch(`${f.base}/api/admin/documents`)).status, 401);
  const documents = await fetch(`${f.base}/api/admin/documents`, { headers: admin }).then((r) => r.json());
  assert.deepEqual(documents.documents, ['result.md']);

  const createdResponse = await json(`${f.base}/api/admin/sessions`, { method: 'POST', headers: admin, body: JSON.stringify({ gameTitle: '流浪猫收养记', resultDocument: 'result.md', aiCoreScore: 45, aiExperienceScore: 40, expiryDays: 7, minimumResponses: 5 }) });
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  const publicSession = await fetch(`${f.base}/api/public/sessions/${created.session.publicToken}`).then((r) => r.json());
  assert.equal(publicSession.session.gameTitle, '流浪猫收养记');
  assert.equal(publicSession.session.aiCoreScore, undefined);

  const body = { anonymousId: 'browser-one-long-id', coreScore: 4, experienceScore: 3, coreReasons: ['weak_feedback'], experienceReasons: ['ui_clarity'], comment: '私密评论' };
  assert.equal((await json(`${f.base}/api/public/sessions/${created.session.publicToken}/ratings`, { method: 'POST', body: JSON.stringify(body) })).status, 200);
  assert.equal((await json(`${f.base}/api/public/sessions/${created.session.publicToken}/ratings`, { method: 'POST', body: JSON.stringify({ ...body, coreScore: 5 }) })).status, 200);
  const list = await fetch(`${f.base}/api/admin/sessions`, { headers: admin }).then((r) => r.json());
  assert.equal(list.sessions[0].aggregate.count, 1);
  assert.equal(list.sessions[0].aggregate.coreAverage, 5);
  const markdown = await readFile(join(f.resultRoot, 'result.md'), 'utf8');
  assert.match(markdown, /EDD_PLAYER_RATINGS_START/);
  assert.doesNotMatch(markdown, /私密评论/);

  assert.equal((await json(`${f.base}/api/admin/sessions/${created.session.id}/close`, { method: 'POST', headers: admin, body: '{}' })).status, 200);
  assert.equal((await json(`${f.base}/api/public/sessions/${created.session.publicToken}/ratings`, { method: 'POST', body: JSON.stringify({ ...body, anonymousId: 'different-browser-id' }) })).status, 409);
  assert.equal((await json(`${f.base}/api/admin/sessions/${created.session.id}/sync`, { method: 'POST', headers: admin, body: '{}' })).status, 200);
});

test('rejects invalid, expired, and unknown submissions', async (t) => {
  const f = await fixture();
  t.after(() => f.app.close());
  const invalid = await json(`${f.base}/api/public/sessions/nope/ratings`, { method: 'POST', body: '{}' });
  assert.equal(invalid.status, 404);
});

test('creates a complete workflow and returns a player session', async (t) => {
  const f = await fixture();
  t.after(() => f.app.close());
  const response = await json(`${f.base}/api/admin/workflows`, { method: 'POST', headers: admin, body: JSON.stringify({
    evaluationId: 'cat-flow-r1', gameTitle: '流浪猫收养记', gddReference: 'Keco:GDD-01', runtimeEvidence: '', aiCoreScore: 45, aiExperienceScore: 50, expiryDays: 7,
    issues: [{ dimension: 'core', deduction: 5, evidence: 'GDD/核心玩法', description: '反馈不足', suggestion: '补充反馈' }],
  }) });
  assert.equal(response.status, 201);
  const data = await response.json();
  assert.ok(data.session.publicToken);
  assert.equal(data.session.resultDocument, 'cat-flow-r1-评价结果.md');
  assert.deepEqual(data.documents, { progress: 'cat-flow-r1-Progression.md', problem: 'cat-flow-r1-问题记录.md', result: 'cat-flow-r1-评价结果.md' });
  assert.match(await readFile(join(f.progressRoot, data.documents.progress), 'utf8'), /cat-flow-r1-问题记录/);
  assert.match(await readFile(join(f.problemRoot, data.documents.problem), 'utf8'), /P-01/);
  assert.match(await readFile(join(f.resultRoot, data.documents.result), 'utf8'), /EDD_PLAYER_RATINGS_START/);
});
