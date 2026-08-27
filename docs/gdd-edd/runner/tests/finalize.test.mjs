import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { finalizeRun, parseHumanSection } from '../src/finalize.mjs';
import { renderResult } from '../src/renderer.mjs';

const evaluationId = 'demo-r1';
const evalCase = { id: 'demo-r1', title: 'Demo', revision: 1 };
const dimension = (score, label) => ({
  score,
  observations: [{ statement: `${label}观察`, evidence: '第 1 节' }],
  rationale: `${label}理由`,
  evidenceGaps: [],
});
const rawResponse = {
  source: { projectId: 'project-id', documentId: 'document-id', revision: 1, title: 'Demo' },
  dimensions: {
    experienceValue: dimension(24, '体验价值'),
    gameplaySystems: dimension(32, '玩法与系统'),
    contentPresentation: dimension(18, '内容与呈现'),
  },
};
const evaluation = {
  ...rawResponse,
  aiTotalScore: 74,
  additionalFindings: [],
};

function completedHumanFields(markdown) {
  return markdown
    .replace('- 评分人：`__`', '- 评分人：`Li`')
    .replace('- 评分时间：`__`', '- 评分时间：`2026-08-27T18:00:00+08:00`')
    .replace('- 体验价值（0-30）：`__`', '- 体验价值（0-30）：`20`')
    .replace('- 玩法与系统（0-40）：`__`', '- 玩法与系统（0-40）：`35`')
    .replace('- 内容与呈现（0-30）：`__`', '- 内容与呈现（0-30）：`25`')
    .replace('- 评分理由：`__`', '- 评分理由：`核心循环明确，但体验目标仍需收紧。`');
}

async function fixture(transform = completedHumanFields) {
  const runsRoot = await mkdtemp(join(tmpdir(), 'gdd-finalize-'));
  const runRoot = join(runsRoot, evaluationId);
  const evidenceRoot = join(runRoot, 'evidence');
  await mkdir(evidenceRoot, { recursive: true });
  const initial = renderResult({ evaluationId, evalCase, evaluation });
  const result = transform(initial);
  await writeFile(join(runRoot, 'result.md'), result);
  await writeFile(join(runRoot, 'progress.md'), `# Progress\n\n- 测评 ID：${evaluationId}\n`);
  await writeFile(join(evidenceRoot, 'request.json'), `${JSON.stringify({
    evaluationId,
    source: { caseId: 'demo-r1', projectId: 'project-id', documentId: 'document-id', revision: 1, title: 'Demo' },
  })}\n`);
  await writeFile(join(evidenceRoot, 'response.json'), `${JSON.stringify({ evaluationId, rawResponse })}\n`);
  return { runsRoot, runRoot, result };
}

function outsideFinalBlock(markdown) {
  const start = '<!-- EDD_FINAL_START -->';
  const end = '<!-- EDD_FINAL_END -->';
  return [markdown.slice(0, markdown.indexOf(start) + start.length), markdown.slice(markdown.indexOf(end))];
}

test('parses the six fixed human Markdown fields', () => {
  const parsed = parseHumanSection(completedHumanFields(renderResult({ evaluationId, evalCase, evaluation })));
  assert.deepEqual(parsed.scores, { experienceValue: 20, gameplaySystems: 35, contentPresentation: 25 });
  assert.equal(parsed.evaluator, 'Li');
});

test('finalizes 40/60 scores and preserves text outside the final block', async () => {
  const item = await fixture();
  const beforeOutside = outsideFinalBlock(item.result);
  const finalized = await finalizeRun({ runId: evaluationId, runsRoot: item.runsRoot });
  const result = await readFile(join(item.runRoot, 'result.md'), 'utf8');
  assert.deepEqual(outsideFinalBlock(result), beforeOutside);
  assert.match(result, /21\.6/);
  assert.match(result, /33\.8/);
  assert.match(result, /22\.2/);
  assert.match(result, /AI 总分.*74\.0/);
  assert.match(result, /人工总分.*80\.0/);
  assert.match(result, /最终总分.*77\.6/);
  assert.equal(finalized.scores.finalTotal, 77.6);
  assert.match(await readFile(join(item.runRoot, 'progress.md'), 'utf8'), /人工评分终结.*77\.6/s);
});

for (const [name, transform, expected] of [
  ['placeholder', (value) => value, /尚未填写/],
  ['non numeric', (value) => completedHumanFields(value).replace('（0-30）：`20`', '（0-30）：`abc`'), /体验价值/],
  ['out of range', (value) => completedHumanFields(value).replace('（0-30）：`20`', '（0-30）：`31`'), /体验价值/],
  ['missing evaluator', (value) => completedHumanFields(value).replace('- 评分人：`Li`', '- 评分人：``'), /评分人/],
  ['missing rationale', (value) => completedHumanFields(value).replace(/- 评分理由：`[^`]+`/, '- 评分理由：``'), /评分理由/],
  ['duplicate markers', (value) => `${completedHumanFields(value)}\n<!-- EDD_FINAL_START -->`, /最终评分标记/],
]) {
  test(`rejects ${name} without changing Result`, async () => {
    const item = await fixture(transform);
    await assert.rejects(finalizeRun({ runId: evaluationId, runsRoot: item.runsRoot }), expected);
    assert.equal(await readFile(join(item.runRoot, 'result.md'), 'utf8'), item.result);
    assert.match(await readFile(join(item.runRoot, 'problem.md'), 'utf8'), /人工评分终结/);
  });
}

test('rejects mismatched evidence Run IDs', async () => {
  const item = await fixture();
  await writeFile(join(item.runRoot, 'evidence', 'request.json'), `${JSON.stringify({ evaluationId: 'other-run', source: {} })}\n`);
  await assert.rejects(finalizeRun({ runId: evaluationId, runsRoot: item.runsRoot }), /测评 ID 不一致/);
  assert.equal(await readFile(join(item.runRoot, 'result.md'), 'utf8'), item.result);
});
