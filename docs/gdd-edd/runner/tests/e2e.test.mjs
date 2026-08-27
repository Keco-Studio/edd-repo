import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRatingServer } from '../src/server.mjs';

test('one player response creates a combined result and updates in place', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'edd-e2e-'));
  const resultRoot = join(root, 'result');
  const progressRoot = join(root, 'progress');
  const problemRoot = join(root, 'problem');
  await Promise.all([resultRoot, progressRoot, problemRoot].map((path) => mkdir(path, { recursive: true })));
  await Promise.all([
    writeFile(join(progressRoot, 'evaluation-Progression.md'), `# Progression

## 输入材料

- AI 体验价值：18/30
- AI 玩法与系统：28/40
- AI 内容与呈现：21/30

## 最终执行结果

- 玩家样本：0
`),
    writeFile(join(problemRoot, 'evaluation-问题记录.md'), '# Problem\n'),
    writeFile(join(resultRoot, 'evaluation-评价结果.md'), `# Result

- 玩家有效样本：0
- 最终体验价值：暂无玩家评分
- 最终玩法与系统：暂无玩家评分
- 最终内容与呈现：暂无玩家评分
- 最终总分：暂无玩家评分
`),
  ]);
  const app = await createRatingServer({ resultRoot, progressRoot, problemRoot, dataFile: join(root, 'store.json'), publicRoot: new URL('../public/', import.meta.url), host: '127.0.0.1', port: 0, rateLimit: 100 });
  await app.listen();
  t.after(() => app.close());
  const created = await app.createSessionForDocuments({ evaluationId: 'evaluation', gameTitle: '流浪猫收养记', aiExperienceValueScore: 18, aiGameplaySystemsScore: 28, aiContentPresentationScore: 21, expiryDays: 7 });
  const endpoint = `${app.baseUrl}/api/public/sessions/${created.session.publicToken}/ratings`;
  const rating = { anonymousId: 'stable-browser-identity', experienceValueScore: 3, gameplaySystemsScore: 4, contentPresentationScore: 5, experienceValueReasons: [], gameplaySystemsReasons: [], contentPresentationReasons: [], comment: 'not in markdown' };
  await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(rating) });
  assert.equal(app.store.getRatings(created.session.id).length, 1);
  const resultMarkdown = await readFile(join(resultRoot, created.documents.result), 'utf8');
  assert.match(resultMarkdown, /玩家有效样本：1/);
  assert.match(resultMarkdown, /最终体验价值：60\.0\/100/);
  assert.match(resultMarkdown, /最终玩法与系统：73\.0\/100/);
  assert.match(resultMarkdown, /最终内容与呈现：79\.0\/100/);
  assert.match(resultMarkdown, /最终总分：70\.9\/100/);
  assert.match(resultMarkdown, /正式总分：70\.9 分/);
  assert.doesNotMatch(resultMarkdown, /结论|通过|不通过/);
  assert.doesNotMatch(resultMarkdown, /not in markdown/);

  const progressMarkdown = await readFile(join(progressRoot, created.documents.progress), 'utf8');
  assert.match(progressMarkdown, /EDD_PLAYER_PROGRESS_START/);
  assert.match(progressMarkdown, /## 玩家评分同步/);
  assert.match(progressMarkdown, /有效样本：1/);
  assert.match(progressMarkdown, /Result 已更新/);
  assert.doesNotMatch(progressMarkdown, /60\.0|73\.0|79\.0|70\.9|最终总分/);
  assert.doesNotMatch(progressMarkdown, /结论|通过|不通过/);
});
