import { join } from 'node:path';
import { readdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PAWS_SOURCE } from './ai-evaluator.mjs';
import { runAiEvaluation } from './ai-evaluator.mjs';
import { createRatingServer } from './server.mjs';

const DEFAULT_RESULT_ROOT = fileURLToPath(new URL('../../result/', import.meta.url));
const DEFAULT_PROGRESS_ROOT = fileURLToPath(new URL('../../progress/', import.meta.url));
const DEFAULT_PROBLEM_ROOT = fileURLToPath(new URL('../../problem/', import.meta.url));

export async function nextEvaluationId(resultRoot, revision) {
  const files = new Set(await readdir(resultRoot).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  }));
  const base = `paws-patience-gdd-r${revision}`;
  if (!files.has(`${base}-评价结果.md`)) return base;
  let run = 2;
  while (files.has(`${base}-run${run}-评价结果.md`)) run += 1;
  return `${base}-run${run}`;
}

export async function evaluatePaws(options = {}) {
  const provider = options.provider || 'claude';
  const evaluator = options.evaluator || runAiEvaluation;
  const serverOptions = { port: process.env.EDD_PORT ? Number(process.env.EDD_PORT) : 0, ...(options.serverOptions || {}) };
  const resultRoot = serverOptions.resultRoot || DEFAULT_RESULT_ROOT;
  const progressRoot = serverOptions.progressRoot || DEFAULT_PROGRESS_ROOT;
  const problemRoot = serverOptions.problemRoot || DEFAULT_PROBLEM_ROOT;
  const evaluationId = await nextEvaluationId(resultRoot, PAWS_SOURCE.minimumRevision);
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
  const evaluation = await evaluator({ provider, cwd: options.cwd, evaluationId, documents });
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
    evaluation,
    evaluationId,
    session: created.session,
    documents: created.documents,
    playerUrl: `${app.baseUrl}/?session=${encodeURIComponent(created.session.publicToken)}`,
  };
}

function optionValue(name) {
  const index = process.argv.indexOf(name);
  if (index >= 0) return process.argv[index + 1];
  const entry = process.argv.find((argument) => argument.startsWith(`${name}=`));
  return entry?.slice(name.length + 1);
}

async function startCli() {
  try {
    const result = await evaluatePaws({ provider: optionValue('--provider') || 'claude' });
    console.log(`AI 评价：${result.evaluationId} (${result.evaluation.provider}/${result.evaluation.model})`);
    console.log(`GDD：revision ${result.evaluation.source.revision}`);
    console.log(`评价文档：${result.documents.result}`);
    console.log(`玩家评分链接：${result.playerUrl}`);
  } catch (error) {
    console.error(`评价失败：${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) startCli();
