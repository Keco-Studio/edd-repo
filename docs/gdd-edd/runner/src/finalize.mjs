import { readFile, unlink } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRunPaths, verifyArtifact, writeAtomic } from './artifacts.mjs';
import { combineScores, DIMENSIONS, validateAiEvaluation, validateHumanScores } from './contracts.mjs';

const DEFAULT_RUNS_ROOT = fileURLToPath(new URL('../../runs/', import.meta.url));
const FINAL_START = '<!-- EDD_FINAL_START -->';
const FINAL_END = '<!-- EDD_FINAL_END -->';
const PROGRESS_START = '<!-- EDD_FINALIZATION_START -->';
const PROGRESS_END = '<!-- EDD_FINALIZATION_END -->';

const HUMAN_FIELDS = [
  ['evaluator', '评分人'],
  ['evaluatedAt', '评分时间'],
  ['experienceValue', '体验价值（0-30）'],
  ['gameplaySystems', '玩法与系统（0-40）'],
  ['contentPresentation', '内容与呈现（0-30）'],
  ['rationale', '评分理由'],
];

const decimal = (value) => Number(value).toFixed(1);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function exactField(markdown, label) {
  const pattern = new RegExp('^- ' + escapeRegex(label) + '：`([^`\\r\\n]*)`$', 'gmu');
  const matches = [...markdown.matchAll(pattern)];
  if (matches.length !== 1) throw new Error(`${label}字段必须且只能出现一次`);
  const value = matches[0][1].trim();
  if (!value || value === '__') throw new Error(`${label}尚未填写`);
  return value;
}

export function parseHumanSection(markdown) {
  const values = Object.fromEntries(HUMAN_FIELDS.map(([key, label]) => [key, exactField(markdown, label)]));
  return validateHumanScores({
    evaluator: values.evaluator,
    evaluatedAt: values.evaluatedAt,
    rationale: values.rationale,
    experienceValue: Number(values.experienceValue),
    gameplaySystems: Number(values.gameplaySystems),
    contentPresentation: Number(values.contentPresentation),
  });
}

function assertSingleFinalBlock(markdown) {
  const starts = markdown.split(FINAL_START).length - 1;
  const ends = markdown.split(FINAL_END).length - 1;
  const startIndex = markdown.indexOf(FINAL_START);
  const endIndex = markdown.indexOf(FINAL_END);
  if (starts !== 1 || ends !== 1 || startIndex > endIndex) throw new Error('最终评分标记必须且只能出现一组');
  return { startIndex, endIndex };
}

export function renderFinalSection({ ai, human, scores }) {
  const rows = DIMENSIONS.map((dimension) => (
    `| ${dimension.label} | ${dimension.maximum} | ${decimal(ai[dimension.key])} | ${decimal(human.scores[dimension.key])} | ${decimal(scores.dimensions[dimension.key])} |`
  )).join('\n');
  return `
## 最终评分

| 维度 | 满分 | AI 40% | 人工 60% | 合并 |
| --- | ---: | ---: | ---: | ---: |
${rows}
| 总分 | 100 | ${decimal(scores.aiTotal)} | ${decimal(scores.humanTotal)} | ${decimal(scores.finalTotal)} |

- AI 总分：${decimal(scores.aiTotal)}/100
- 人工总分：${decimal(scores.humanTotal)}/100
- 最终总分：${decimal(scores.finalTotal)}/100
- 人工评分者：${human.evaluator}
- 人工评分时间：${human.evaluatedAt}
- 人工评分理由：${human.rationale}

计算公式：每个维度按 AI 分数 * 0.40 + 人工分数 * 0.60 合并，最终总分为三个合并维度分之和。
`;
}

function replaceFinalBlock(markdown, content) {
  const { startIndex, endIndex } = assertSingleFinalBlock(markdown);
  const contentStart = startIndex + FINAL_START.length;
  return `${markdown.slice(0, contentStart)}${content}${markdown.slice(endIndex)}`;
}

function assertResultId(markdown, runId) {
  const matches = [...markdown.matchAll(/^- 测评 ID：([^\r\n]+)$/gmu)];
  if (matches.length !== 1 || matches[0][1].trim() !== runId) throw new Error('Result 测评 ID 不一致');
}

async function readJson(path, label) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new Error(`${label}不是有效 JSON：${error.message}`);
  }
}

function updateProgress(markdown, runId, human, scores) {
  const block = `${PROGRESS_START}
## 人工评分终结

- 测评 ID：${runId}
- 状态：completed
- 人工评分者：${human.evaluator}
- 人工评分时间：${human.evaluatedAt}
- AI 总分：${decimal(scores.aiTotal)}/100
- 人工总分：${decimal(scores.humanTotal)}/100
- 最终总分：${decimal(scores.finalTotal)}/100
${PROGRESS_END}`;
  const starts = markdown.split(PROGRESS_START).length - 1;
  const ends = markdown.split(PROGRESS_END).length - 1;
  if (starts === 0 && ends === 0) return `${markdown.trimEnd()}\n\n${block}\n`;
  if (starts !== 1 || ends !== 1) throw new Error('Progress 终结标记无效');
  const startIndex = markdown.indexOf(PROGRESS_START);
  const endIndex = markdown.indexOf(PROGRESS_END) + PROGRESS_END.length;
  return `${markdown.slice(0, startIndex)}${block}${markdown.slice(endIndex)}`;
}

function renderFinalizeProblem(runId, error) {
  return `# GDD EDD Problem

- 测评 ID：${runId}
- 状态：阻断
- 失败阶段：人工评分终结
- 错误摘要：${String(error.message || error).replace(/\r?\n/g, ' ')}
- Result：result.md
- Progress：progress.md

## 恢复动作

修正 Result 中的人工评分后重新运行：

\`npm run finalize -- --run ${runId}\`
`;
}

async function clearFinalizeProblem(path) {
  let content;
  try {
    content = await readFile(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  if (content.includes('- 失败阶段：人工评分终结')) await unlink(path);
}

export async function finalizeRun(options = {}) {
  const runId = options.runId;
  const paths = createRunPaths(options.runsRoot || DEFAULT_RUNS_ROOT, runId);
  let originalResult;
  try {
    originalResult = await readFile(paths.result, 'utf8');
    const originalProgress = await readFile(paths.progress, 'utf8');
    assertResultId(originalResult, runId);
    assertSingleFinalBlock(originalResult);
    const human = parseHumanSection(originalResult);
    const request = await readJson(paths.request, 'Request Evidence');
    const response = await readJson(paths.response, 'Response Evidence');
    if (request.evaluationId !== runId || response.evaluationId !== runId) throw new Error('Evidence 测评 ID 不一致');
    const source = request.source || {};
    const evalCase = {
      projectId: source.projectId,
      documentId: source.documentId,
      revision: source.revision,
      title: source.title,
    };
    const evaluation = validateAiEvaluation(response.rawResponse, evalCase);
    const ai = Object.fromEntries(DIMENSIONS.map(({ key }) => [key, evaluation.dimensions[key].score]));
    const scores = combineScores(ai, human.scores);
    const finalResult = replaceFinalBlock(originalResult, renderFinalSection({ ai, human, scores }));
    const finalProgress = updateProgress(originalProgress, runId, human, scores);
    await writeAtomic(paths.progress, finalProgress);
    await writeAtomic(paths.result, finalResult);
    await Promise.all([
      verifyArtifact(paths.progress, runId),
      verifyArtifact(paths.result, runId),
    ]);
    await clearFinalizeProblem(paths.problem);
    return { runId, paths, human, scores };
  } catch (error) {
    await writeAtomic(paths.problem, renderFinalizeProblem(runId, error));
    throw error;
  }
}

function takeValue(argv, index, name) {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${name} 缺少值`);
  return value;
}

export function parseFinalizeOptions(argv = []) {
  const parsed = { runId: undefined, runsRoot: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--run') { parsed.runId = takeValue(argv, index, '--run'); index += 1; }
    else if (argument.startsWith('--run=')) parsed.runId = argument.slice(6) || (() => { throw new Error('--run 缺少值'); })();
    else if (argument === '--runs-root') { parsed.runsRoot = takeValue(argv, index, '--runs-root'); index += 1; }
    else if (argument.startsWith('--runs-root=')) parsed.runsRoot = argument.slice(12) || (() => { throw new Error('--runs-root 缺少值'); })();
    else throw new Error(`未知参数：${argument}`);
  }
  if (!parsed.runId) throw new Error('必须提供 --run <测评 ID>');
  return parsed;
}

async function startCli() {
  try {
    const result = await finalizeRun(parseFinalizeOptions(process.argv.slice(2)));
    console.log(`测评 ID：${result.runId}\n最终总分：${decimal(result.scores.finalTotal)}/100\nResult：${result.paths.result}`);
  } catch (error) {
    console.error(`人工评分终结失败：${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) startCli();
