import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';

const runnerRoot = new URL('../', import.meta.url);
const gddRoot = new URL('../../', import.meta.url);

const readRunner = (path) => readFile(new URL(path, runnerRoot), 'utf8');
const readGdd = (path) => readFile(new URL(path, gddRoot), 'utf8');

await Promise.all([
  access(new URL('rubrics/gdd-v1.md', gddRoot)),
  access(new URL('prompts/evaluator-v1.md', gddRoot)),
  access(new URL('schemas/evaluation-v1.schema.json', gddRoot)),
  access(new URL('runs/', gddRoot)),
]);

const packageJson = JSON.parse(await readRunner('package.json'));
assert.deepEqual(Object.keys(packageJson.scripts).sort(), ['check', 'eval', 'finalize', 'test']);
assert.equal(packageJson.scripts.eval, 'node src/run.mjs');
assert.equal(packageJson.scripts.finalize, 'node src/finalize.mjs');
assert.equal(Object.keys(packageJson).includes('dependencies'), false);
assert.equal(Object.keys(packageJson).includes('optionalDependencies'), false);

const sourceNames = (await readdir(new URL('src/', runnerRoot))).filter((name) => name.endsWith('.mjs')).sort();
assert.deepEqual(sourceNames, [
  'artifacts.mjs',
  'contracts.mjs',
  'eval-case.mjs',
  'evaluator.mjs',
  'finalize.mjs',
  'isolation.mjs',
  'renderer.mjs',
  'run.mjs',
]);
const sources = (await Promise.all(sourceNames.map((name) => readRunner(`src/${name}`)))).join('\n');
assert.doesNotMatch(sources, /player-rating-web|ngrok|eval-sampling|eval-baseline|server\.mjs|store\.mjs/);

const [readme, runnerReadme, rubric, prompt, schemaText, renderer, finalize, finalizeTest, caseText] = await Promise.all([
  readGdd('README.md'),
  readRunner('README.md'),
  readGdd('rubrics/gdd-v1.md'),
  readGdd('prompts/evaluator-v1.md'),
  readGdd('schemas/evaluation-v1.schema.json'),
  readRunner('src/renderer.mjs'),
  readRunner('src/finalize.mjs'),
  readRunner('tests/finalize.test.mjs'),
  readGdd('eval-cases/paws-patience-r97.json'),
]);
const schema = JSON.parse(schemaText);
const evalCase = JSON.parse(caseText);

assert.match(readme, /全新 session/);
assert.match(readme, /只能启用 Keco 自研 MCP/);
assert.match(readme, /AI 40%.*人工 60%/s);
assert.match(readme, /npm run finalize/);
assert.match(readme, /result\.md/);
assert.match(runnerReadme, /不包含 Web 服务/);
assert.match(rubric, /体验价值/);
assert.match(rubric, /37-40/);
assert.doesNotMatch(rubric, /Prompt|Schema|progress\.md|result\.md/);
assert.match(prompt, /\{\{gdd\}\}/);
assert.match(prompt, /\{\{rubric\}\}/);
assert.match(prompt, /只返回符合指定 JSON Schema/);
assert.deepEqual(schema.required, ['source', 'dimensions']);
assert.deepEqual(schema.properties.dimensions.required, ['experienceValue', 'gameplaySystems', 'contentPresentation']);
assert.match(renderer, /EDD_FINAL_START/);
assert.match(finalize, /AI 分数 \* 0\.40 \+ 人工分数 \* 0\.60/);
assert.match(finalizeTest, /保持文本不变|preserves text outside/);
assert.equal(evalCase.promptPath, 'docs/gdd-edd/prompts/evaluator-v1.md');
assert.equal(evalCase.rubricPath, 'docs/gdd-edd/rubrics/gdd-v1.md');
assert.equal(evalCase.isolationManifestPath, 'docs/gdd-edd/isolation/paws-patience-r97.json');
assert.equal('resultTemplatePath' in evalCase, false);

console.log('静态检查通过：受控 GDD 输入、固定三维、Markdown 人工评分、无 Web/基线链路。');
