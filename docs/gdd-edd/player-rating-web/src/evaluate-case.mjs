import { join } from 'node:path';
import { readdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runAiEvaluation } from './ai-evaluator.mjs';
import { buildEvaluationPrompt } from './ai-evaluator.mjs';
import { loadEvaluationAssets, renderEvaluationDocuments, writeEvaluationDocuments } from './document-renderer.mjs';
import { listEvalCaseIds, loadEvalCase } from './eval-case.mjs';
import { createRatingServer } from './server.mjs';

const DEFAULT_RESULT_ROOT = fileURLToPath(new URL('../../result/', import.meta.url));
const DEFAULT_PROGRESS_ROOT = fileURLToPath(new URL('../../progress/', import.meta.url));
const DEFAULT_PROBLEM_ROOT = fileURLToPath(new URL('../../problem/', import.meta.url));
const decimal = (value) => Number(value).toFixed(1);

export async function nextEvaluationId(resultRoot, outputStem) {
  const files = new Set(await readdir(resultRoot).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  }));
  let highestRun = files.has(`${outputStem}-评价结果.md`) ? 1 : 0;
  const prefix = `${outputStem}-run`;
  const suffix = '-评价结果.md';
  for (const file of files) {
    if (!file.startsWith(prefix) || !file.endsWith(suffix)) continue;
    const run = Number(file.slice(prefix.length, -suffix.length));
    if (Number.isInteger(run) && run >= 2) highestRun = Math.max(highestRun, run);
  }
  return highestRun ? `${outputStem}-run${highestRun + 1}` : outputStem;
}

export async function evaluateCase(options = {}) {
  const evalCase = options.evalCase || await (options.caseLoader || loadEvalCase)(options.caseId, options.caseOptions);
  const provider = options.provider || 'claude';
  const evaluator = options.evaluator || runAiEvaluation;
  const assets = options.assets || await (options.assetLoader || loadEvaluationAssets)(evalCase, options.assetOptions);
  const serverOptions = { port: process.env.EDD_PORT ? Number(process.env.EDD_PORT) : 0, ...(options.serverOptions || {}) };
  const resultRoot = serverOptions.resultRoot || DEFAULT_RESULT_ROOT;
  const progressRoot = serverOptions.progressRoot || DEFAULT_PROGRESS_ROOT;
  const problemRoot = serverOptions.problemRoot || DEFAULT_PROBLEM_ROOT;
  const evaluationId = await nextEvaluationId(resultRoot, evalCase.outputStem);
  const documentNames = {
    progress: `${evaluationId}-Progression.md`,
    problem: `${evaluationId}-问题记录.md`,
    result: `${evaluationId}-评价结果.md`,
  };
  const documents = {
    progress: join(progressRoot, documentNames.progress),
    problem: join(problemRoot, documentNames.problem),
    result: join(resultRoot, documentNames.result),
  };
  const prompt = buildEvaluationPrompt({ evalCase, promptTemplate: assets.promptTemplate });
  const run = await evaluator({ evalCase, provider, model: options.model, cwd: options.cwd, evaluationId, prompt });
  const evaluation = run.evaluation;
  const execution = run.execution;
  const rendered = (options.renderer || renderEvaluationDocuments)({ evalCase, evaluation, execution, evaluationId, documents: documentNames, assets });
  await (options.documentWriter || writeEvaluationDocuments)(documents, rendered);
  const app = await (options.serverFactory || createRatingServer)(serverOptions);
  const created = await app.createSessionForDocuments({
    evaluationId,
    gameTitle: evaluation.source.title,
    aiCoreScore: evaluation.aiCoreScore,
    aiExperienceScore: evaluation.aiExperienceScore,
    expiryDays: options.expiryDays || 7,
  });
  await app.listen();
  return {
    app,
    case: evalCase,
    evaluation,
    execution,
    evaluationId,
    session: created.session,
    documents: created.documents,
    playerUrl: `${app.baseUrl}/?session=${encodeURIComponent(created.session.publicToken)}`,
  };
}

export function formatEvaluationScore(result) {
  const { evaluation } = result;
  return `核心玩法：${decimal(evaluation.aiCoreScore)}/50
玩家体验：${decimal(evaluation.aiExperienceScore)}/50
总分：${decimal(evaluation.aiTotalScore)}/100
人工评分：${result.playerUrl}`;
}

function takeValue(argv, index, name) {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${name} 缺少值`);
  return value;
}

export function parseCliOptions(argv = []) {
  const parsed = { caseId: undefined, provider: 'claude', model: undefined, listCases: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--list-cases') parsed.listCases = true;
    else if (argument === '--case') { parsed.caseId = takeValue(argv, index, '--case'); index += 1; }
    else if (argument.startsWith('--case=')) parsed.caseId = argument.slice('--case='.length) || (() => { throw new Error('--case 缺少值'); })();
    else if (argument === '--provider') { parsed.provider = takeValue(argv, index, '--provider'); index += 1; }
    else if (argument.startsWith('--provider=')) parsed.provider = argument.slice('--provider='.length) || (() => { throw new Error('--provider 缺少值'); })();
    else if (argument === '--model') { parsed.model = takeValue(argv, index, '--model'); index += 1; }
    else if (argument.startsWith('--model=')) parsed.model = argument.slice('--model='.length) || (() => { throw new Error('--model 缺少值'); })();
    else throw new Error(`未知参数：${argument}`);
  }
  return parsed;
}

export async function runCli(options = {}) {
  const parsed = parseCliOptions(options.argv || []);
  const write = options.write || console.log;
  if (parsed.listCases) {
    const caseIds = await (options.listCases || listEvalCaseIds)();
    for (const id of caseIds) write(id);
    return { listed: true, caseIds };
  }
  const result = await (options.evaluate || evaluateCase)({ caseId: parsed.caseId, provider: parsed.provider, model: parsed.model });
  write(formatEvaluationScore(result));
  return result;
}

async function startCli() {
  try { await runCli({ argv: process.argv.slice(2) }); }
  catch (error) {
    console.error(`评价失败：${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) startCli();
