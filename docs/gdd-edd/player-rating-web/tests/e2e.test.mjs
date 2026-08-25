import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRatingServer } from '../src/server.mjs';

test('one player response creates a combined result and updates in place', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'edd-e2e-'));
  const resultRoot = join(root, 'result');
  await mkdir(resultRoot, { recursive: true });
  await writeFile(join(resultRoot, 'evaluation.md'), '# Evaluation\n');
  const app = await createRatingServer({ resultRoot, dataFile: join(root, 'store.json'), publicRoot: new URL('../public/', import.meta.url), adminToken: 'e2e-admin-token', host: '127.0.0.1', port: 0, rateLimit: 100 });
  await app.listen();
  t.after(() => app.close());
  const adminHeaders = { authorization: 'Bearer e2e-admin-token', 'content-type': 'application/json' };
  const created = await fetch(`${app.baseUrl}/api/admin/sessions`, { method: 'POST', headers: adminHeaders, body: JSON.stringify({ gameTitle: '流浪猫收养记', resultDocument: 'evaluation.md', aiCoreScore: 40, aiExperienceScore: 45, expiryDays: 7 }) }).then((response) => response.json());
  const endpoint = `${app.baseUrl}/api/public/sessions/${created.session.publicToken}/ratings`;
  const rating = { anonymousId: 'stable-browser-identity', coreScore: 4, experienceScore: 3, coreReasons: [], experienceReasons: [], comment: 'not in markdown' };
  await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(rating) });
  await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...rating, coreScore: 5 }) });
  const sessions = await fetch(`${app.baseUrl}/api/admin/sessions`, { headers: adminHeaders }).then((response) => response.json());
  assert.equal(sessions.sessions[0].aggregate.count, 1);
  assert.equal(sessions.sessions[0].combined.final, 83);
  const markdown = await readFile(join(resultRoot, 'evaluation.md'), 'utf8');
  assert.match(markdown, /正式总分：83\.0 分/);
  assert.doesNotMatch(markdown, /not in markdown/);
});
