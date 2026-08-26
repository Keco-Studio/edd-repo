import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const template = await readFile(new URL('../result/评价模板-v6.md', root), 'utf8');
const evaluator = await readFile(new URL('src/ai-evaluator.mjs', root), 'utf8');
const renderer = await readFile(new URL('src/document-renderer.mjs', root), 'utf8');
const prompt = await readFile(new URL('../prompts/gdd-evaluation-v1.md', root), 'utf8');
const rubric = await readFile(new URL('../rubrics/two-dimension-v1.md', root), 'utf8');
const schema = await readFile(new URL('src/ai-evaluation.schema.json', root), 'utf8');
const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const caseManifest = JSON.parse(await readFile(new URL('../eval-cases/paws-patience-r97.json', root), 'utf8'));
const sourceFiles = ['src/scoring.mjs', 'src/server.mjs', 'src/eval-case.mjs', 'src/ai-evaluator.mjs', 'src/document-renderer.mjs', 'src/evaluate-case.mjs', 'public/index.html'];
const sources = await Promise.all(sourceFiles.map((path) => readFile(new URL(path, root), 'utf8')));
const legacyDocuments = [
  '../progress/paws-patience-gdd-r97-Progression.md',
  '../problem/paws-patience-gdd-r97-问题记录.md',
  '../result/paws-patience-gdd-r97-评价结果.md',
];
const resultFiles = await readdir(new URL('../result/', root));
const activeDocs = await Promise.all([
  readFile(new URL('../README.md', root), 'utf8'),
  readFile(new URL('README.md', root), 'utf8'),
  readFile(new URL('../result/README.md', root), 'utf8'),
  readFile(new URL('../../superpowers/plans/2026-08-26-score-only-evaluation.md', root), 'utf8'),
]);

assert.match(template, /\{\{coreObservations\}\}/);
assert.match(template, /\{\{experienceObservations\}\}/);
assert.match(template, /\{\{problemDocument\}\}/);
assert.match(template, /玩家有效样本/);
assert.doesNotMatch(template, /基线|退化|通过线|结论：|PASS|FAIL/);
assert.match(prompt, /只返回符合 JSON Schema 的 JSON/);
assert.doesNotMatch(prompt, /Progression|Problem|Result|创建.*文档/);
assert.match(rubric, /0-15/);
assert.match(rubric, /46-50/);
assert.match(rubric, /不是二级评分项/);
assert.match(schema, /"dimensions"/);
assert.doesNotMatch(schema, /"metrics"|"model"/);
assert.match(evaluator, /--json/);
assert.match(evaluator, /stream-json/);
assert.match(evaluator, /read-only/);
assert.match(evaluator, /'--tools', 'Read'/);
assert.match(renderer, /AI 结构化输出/);
assert.equal(packageJson.scripts.eval, 'node src/evaluate-case.mjs');
assert.equal(caseManifest.id, 'paws-patience-r97');
assert.equal(caseManifest.type, 'gold');
assert.equal(caseManifest.promptPath, 'docs/gdd-edd/prompts/gdd-evaluation-v1.md');
assert.equal(caseManifest.rubricPath, 'docs/gdd-edd/rubrics/two-dimension-v1.md');
assert.equal(caseManifest.resultTemplatePath, 'docs/gdd-edd/result/评价模板-v6.md');
assert.doesNotMatch(evaluator, /PAWS_SOURCE/);
assert.doesNotMatch(sources.join('\n'), /evaluate-paws/);
assert.doesNotMatch(sources.join('\n'), /admin-test-token|ngrok_[A-Za-z0-9]+/);
for (const path of legacyDocuments) await assert.rejects(access(new URL(path, root)), undefined, `${path} 不应存在`);
assert.doesNotMatch(resultFiles.join('\n'), /评价模板-v(?!6)\d+\.md/i);
assert.doesNotMatch(activeDocs.join('\n'), /评价模板-v(?!6)\d+/i);
console.log('静态检查通过：AI 只返回 JSON，Node 生成三文档，固定两维度标尺，无流程判断。');
