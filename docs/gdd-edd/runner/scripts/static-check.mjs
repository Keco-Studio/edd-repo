import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const template = await readFile(new URL('../result/评价模板-v7.md', root), 'utf8');
const evaluator = await readFile(new URL('src/ai-evaluator.mjs', root), 'utf8');
const renderer = await readFile(new URL('src/document-renderer.mjs', root), 'utf8');
const progressAudit = await readFile(new URL('src/progress-audit.mjs', root), 'utf8');
const sampling = await readFile(new URL('src/eval-sampling.mjs', root), 'utf8');
const progressRules = await readFile(new URL('../progress/README.md', root), 'utf8');
const prompt = await readFile(new URL('../prompts/gdd-evaluation-v2.md', root), 'utf8');
const rubric = await readFile(new URL('../rubrics/three-dimension-v2.md', root), 'utf8');
const schema = await readFile(new URL('src/ai-evaluation.schema.json', root), 'utf8');
const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const caseManifest = JSON.parse(await readFile(new URL('../eval-cases/paws-patience-r97.json', root), 'utf8'));
const sourceFiles = ['src/scoring.mjs', 'src/server.mjs', 'src/eval-case.mjs', 'src/ai-evaluator.mjs', 'src/document-renderer.mjs', 'src/progress-audit.mjs', 'src/eval-statistics.mjs', 'src/eval-baseline-store.mjs', 'src/eval-sampling.mjs', 'src/evaluate-case.mjs', 'public/index.html'];
const sources = await Promise.all(sourceFiles.map((path) => readFile(new URL(path, root), 'utf8')));
const activeDocs = await Promise.all([
  readFile(new URL('../README.md', root), 'utf8'),
  readFile(new URL('README.md', root), 'utf8'),
  readFile(new URL('../result/README.md', root), 'utf8'),
]);

assert.match(template, /\{\{experienceValueObservations\}\}/);
assert.match(template, /\{\{gameplaySystemsObservations\}\}/);
assert.match(template, /\{\{contentPresentationObservations\}\}/);
assert.match(template, /\{\{problemDocument\}\}/);
assert.match(template, /玩家有效样本/);
assert.doesNotMatch(template, /基线|退化|通过线|结论：|PASS|FAIL/);
assert.match(prompt, /只返回符合 JSON Schema 的 JSON/);
assert.match(prompt, /仅按 GDD 明确证据/);
assert.match(prompt, /不得补全/);
assert.match(prompt, /只归入一个维度/);
assert.match(prompt, /不得推测实际运行质量/);
assert.ok(prompt.length < 400, 'Prompt 应保持简短');
assert.doesNotMatch(prompt, /Progression|Problem|Result|创建.*文档/);
assert.match(rubric, /体验目标 -> 设计响应 -> GDD 证据/);
assert.match(rubric, /0-9/);
assert.match(rubric, /37-40/);
assert.match(rubric, /不拆二级分数/);
assert.match(schema, /"dimensions"/);
assert.doesNotMatch(schema, /"metrics"|"model"/);
assert.match(evaluator, /--json/);
assert.match(evaluator, /stream-json/);
assert.match(evaluator, /read-only/);
assert.match(evaluator, /'--tools', 'Read'/);
assert.match(renderer, /AI 结构化输出/);
assert.doesNotMatch(renderer, /JSON\.stringify\(execution\.rawOutput/);
assert.match(progressAudit, /writeAiEvidence/);
assert.match(progressAudit, /writeFailureProgression/);
assert.match(progressRules, /不保存正式评分/);
assert.match(progressRules, /progress\/evidence/);
assert.equal(packageJson.scripts.eval, 'node src/evaluate-case.mjs');
assert.equal(packageJson.scripts['eval:baseline'], 'node src/eval-sampling.mjs baseline');
assert.equal(packageJson.scripts['eval:compare'], 'node src/eval-sampling.mjs compare');
assert.match(sampling, /runs: 3/);
assert.doesNotMatch(sampling, /REGRESSION|PASS|FAIL|退化/);
assert.equal(caseManifest.id, 'paws-patience-r97');
assert.equal(caseManifest.type, 'gold');
assert.equal(caseManifest.promptPath, 'docs/gdd-edd/prompts/gdd-evaluation-v2.md');
assert.equal(caseManifest.rubricPath, 'docs/gdd-edd/rubrics/three-dimension-v2.md');
assert.equal(caseManifest.resultTemplatePath, 'docs/gdd-edd/result/评价模板-v7.md');
assert.doesNotMatch(evaluator, /PAWS_SOURCE/);
assert.doesNotMatch(sources.join('\n'), /evaluate-paws/);
assert.doesNotMatch(sources.join('\n'), /aiCoreScore|aiExperienceScore|coreAverage|experienceAverage/);
assert.doesNotMatch(sources.join('\n'), /admin-test-token|ngrok_[A-Za-z0-9]+/);
assert.doesNotMatch(activeDocs.join('\n'), /two-dimension-v1|评价模板-v6|AI 60%、人工 40%/i);
console.log('静态检查通过：AI 只返回 JSON，Node 生成三文档，固定三维标尺，无流程判断。');
