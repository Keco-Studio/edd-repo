import { join } from 'node:path';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runAiEvaluation } from './ai-evaluator.mjs';
import { buildEvaluationPrompt } from './ai-evaluator.mjs';
import { loadEvaluationAssets, renderEvaluationDocuments, writeEvaluationDocuments } from './document-renderer.mjs';
import { listEvalCaseIds, loadEvalCase } from './eval-case.mjs';
import { createRatingServer } from './server.mjs';
import { preserveProgressSyncBlocks, verifyEvaluationDocument, writeAiEvidence, writeFailureProgression, writeTextAtomic } from './progress-audit.mjs';

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
  const requestedModel = options.model || (provider === 'claude' ? 'sonnet' : '本地默认配置');
  const startedAt = new Date().toISOString();
  const audit = {
    goal: '根据固定 GDD 和标尺生成可人工复核的评价文档',
    evidence: null,
    events: [{ component: 'Node', action: '加载 Eval Case 与固定输入', status: 'completed', detail: `${evalCase.id}；固定资产已读取并计算哈希` }],
    nextAction: '查看 Result 并分发人工评分链接',
  };
  let app;
  let created;
  let execution;
  let failedStep = 'AI 评价';
  const renderer = options.renderer || renderEvaluationDocuments;
  try {
    const run = await evaluator({ evalCase, provider, model: options.model, cwd: options.cwd, evaluationId, prompt });
    const evaluation = run.evaluation;
    execution = run.execution;
    audit.events.push({ component: 'AI', action: 'AI 评价', status: 'completed', detail: `${execution.provider} 返回结构化结果` });
    for (const event of execution.events || []) {
      audit.events.push({ component: 'Provider', action: event.name || event.type, status: 'observed', detail: event.detail || event.type });
    }
    audit.events.push({ component: 'Node', action: 'Schema 校验', status: 'completed', detail: '来源、三个维度、证据与问题结构通过校验' });

    failedStep = 'AI 证据写入';
    audit.evidence = await (options.evidenceWriter || writeAiEvidence)(progressRoot, evaluationId, execution.rawOutput);
    audit.events.push({ component: 'Node', action: '写入 AI 证据', status: 'completed', detail: `${audit.evidence.path}；回读与 JSON 解析通过` });

    failedStep = '评价文档写入';
    let rendered = renderer({ evalCase, evaluation, execution, evaluationId, documents: documentNames, assets, audit });
    await (options.documentWriter || writeEvaluationDocuments)(documents, rendered);
    audit.events.push({ component: 'Node', action: '写入三份评价文档', status: 'completed', detail: 'Progression、Problem、Result 已原子写入' });

    failedStep = '评价文档回读';
    await Promise.all([
      verifyEvaluationDocument(documents.problem, evaluationId),
      verifyEvaluationDocument(documents.result, evaluationId),
    ]);
    audit.events.push({ component: 'Node', action: '文档回读', status: 'completed', detail: 'Problem 与 Result 的评价标识已验证' });
    rendered = renderer({ evalCase, evaluation, execution, evaluationId, documents: documentNames, assets, audit });
    await writeTextAtomic(documents.progress, rendered.progress);

    failedStep = '人工评分会话创建';
    app = await (options.serverFactory || createRatingServer)(serverOptions);
    created = await app.createSessionForDocuments({
      evaluationId,
      gameTitle: evaluation.source.title,
      aiExperienceValueScore: evaluation.aiExperienceValueScore,
      aiGameplaySystemsScore: evaluation.aiGameplaySystemsScore,
      aiContentPresentationScore: evaluation.aiContentPresentationScore,
      expiryDays: options.expiryDays || 7,
    });
    await app.listen();
    audit.events.push({ component: 'Node', action: '创建人工评分会话', status: 'completed', detail: `会话 ${created.session.id} 已创建，评分服务已启动` });

    failedStep = 'Progression 最终化';
    const existingProgress = await readFile(documents.progress, 'utf8');
    rendered = renderer({ evalCase, evaluation, execution, evaluationId, documents: documentNames, assets, audit });
    await writeTextAtomic(documents.progress, preserveProgressSyncBlocks(rendered.progress, existingProgress));
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
  } catch (error) {
    audit.events.push({ component: failedStep.startsWith('AI') ? 'AI' : 'Node', action: failedStep, status: 'failed', detail: error.message });
    if (created?.session?.id && app?.store?.deleteSession) await app.store.deleteSession(created.session.id).catch(() => {});
    if (app?.baseUrl) await app.close().catch(() => {});
    const retry = `npm run eval -- --case ${evalCase.id} --provider ${provider}${options.model ? ` --model ${options.model}` : ''}`;
    try {
      await (options.failureWriter || writeFailureProgression)(documents.progress, {
        evalCase, evaluationId, provider, requestedModel, observedModel: execution?.observedModel,
        startedAt: execution?.startedAt || startedAt, finishedAt: new Date().toISOString(), exitCode: execution?.exitCode,
        prompt, assets, events: audit.events, error, failedStep, retryCommand: retry,
        completedOutputs: audit.evidence ? [audit.evidence.path] : [],
        incompleteOutputs: ['Problem、Result 或人工评分会话需要检查'],
      });
    } catch (auditError) {
      throw new Error(`${error.message}；失败 Progression 写入失败：${auditError.message}`);
    }
    throw error;
  }
}

export function formatEvaluationScore(result) {
  const { evaluation } = result;
  return `体验价值：${decimal(evaluation.aiExperienceValueScore)}/30
玩法与系统：${decimal(evaluation.aiGameplaySystemsScore)}/40
内容与呈现：${decimal(evaluation.aiContentPresentationScore)}/30
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
