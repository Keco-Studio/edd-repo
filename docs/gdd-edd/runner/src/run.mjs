import { mkdir, readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRunPaths, sha256, verifyArtifact, writeAtomic, writeJsonEvidence } from './artifacts.mjs';
import { validateAiEvaluation } from './contracts.mjs';
import { listEvalCaseIds, loadEvalCase } from './eval-case.mjs';
import { buildEvaluationMessages, reasoningEffortForProvider, runCloudEvaluation } from './evaluator.mjs';
import { loadIsolationManifest } from './isolation.mjs';
import { renderProblem, renderProgress, renderResult } from './renderer.mjs';

const DEFAULT_REPOSITORY_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const DEFAULT_RUNS_ROOT = fileURLToPath(new URL('../../runs/', import.meta.url));
const DEFAULT_SCHEMA_PATH = fileURLToPath(new URL('../../schemas/evaluation-v1.schema.json', import.meta.url));
const DEFAULT_SCHEMA_REPOSITORY_PATH = 'docs/gdd-edd/schemas/evaluation-v1.schema.json';

function requestedModel(provider, model) {
  return model || (provider === 'claude' ? 'sonnet' : '本地默认配置');
}

export async function nextEvaluationId(runsRoot, outputStem) {
  const entries = await readdir(runsRoot, { withFileTypes: true }).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  const names = new Set(entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name));
  if (!names.has(outputStem)) return outputStem;
  let run = 2;
  while (names.has(`${outputStem}-run${run}`)) run += 1;
  return `${outputStem}-run${run}`;
}

export async function loadEvaluationAssets(evalCase, options = {}) {
  const repositoryRoot = options.repositoryRoot || DEFAULT_REPOSITORY_ROOT;
  const schemaPath = options.schemaPath || DEFAULT_SCHEMA_PATH;
  const absolutePaths = {
    gdd: resolve(repositoryRoot, evalCase.gddPath),
    rubric: resolve(repositoryRoot, evalCase.rubricPath),
    prompt: resolve(repositoryRoot, evalCase.promptPath),
    schema: schemaPath,
    isolation: resolve(repositoryRoot, evalCase.isolationManifestPath),
  };
  const [gdd, rubric, promptTemplate, schemaText, isolationText] = await Promise.all([
    readFile(absolutePaths.gdd, 'utf8'),
    readFile(absolutePaths.rubric, 'utf8'),
    readFile(absolutePaths.prompt, 'utf8'),
    readFile(absolutePaths.schema, 'utf8'),
    readFile(absolutePaths.isolation, 'utf8'),
  ]);
  return {
    gdd,
    rubric,
    promptTemplate,
    schema: JSON.parse(schemaText),
    hashes: {
      gdd: sha256(gdd),
      rubric: sha256(rubric),
      prompt: sha256(promptTemplate),
      schema: sha256(schemaText),
      isolation: sha256(isolationText),
    },
    paths: {
      gdd: evalCase.gddPath,
      rubric: evalCase.rubricPath,
      prompt: evalCase.promptPath,
      schema: DEFAULT_SCHEMA_REPOSITORY_PATH,
      isolation: evalCase.isolationManifestPath,
    },
    absolutePaths,
  };
}

function requestEvidence({ evaluationId, evalCase, isolation, assets, messages, provider, model }) {
  return {
    evaluationId,
    source: {
      caseId: evalCase.id,
      projectId: evalCase.projectId,
      documentId: evalCase.documentId,
      revision: evalCase.revision,
      title: evalCase.title,
    },
    isolationValidation: isolation,
    invocation: {
      provider,
      requestedModel: requestedModel(provider, model),
      generationParameters: { reasoningEffort: reasoningEffortForProvider(provider) },
    },
    cloudInput: {
      messages,
      gdd: { path: assets.paths.gdd, sha256: assets.hashes.gdd, content: assets.gdd },
      rubric: { path: assets.paths.rubric, sha256: assets.hashes.rubric, content: assets.rubric },
      schema: { path: assets.paths.schema, sha256: assets.hashes.schema, content: assets.schema },
    },
  };
}

function evidenceReference(written, relativePath) {
  return written ? { path: relativePath, absolutePath: written.path, sha256: written.sha256 } : null;
}

export async function evaluateCase(options = {}) {
  const caseLoader = options.caseLoader || loadEvalCase;
  const evalCase = options.evalCase || await caseLoader(options.caseId, options.caseOptions);
  const runsRoot = options.runsRoot || DEFAULT_RUNS_ROOT;
  const evaluationId = await nextEvaluationId(runsRoot, evalCase.outputStem);
  const paths = createRunPaths(runsRoot, evaluationId);
  await mkdir(paths.evidenceRoot, { recursive: true });

  const provider = options.provider || 'codex';
  const model = options.model;
  const startedAt = new Date().toISOString();
  const assetLoader = options.assetLoader || loadEvaluationAssets;
  const isolationLoader = options.isolationLoader || loadIsolationManifest;
  const evaluator = options.evaluator || runCloudEvaluation;
  let failedStage = '隔离校验';
  let isolation;
  let assets = options.assets;
  let messages = [];
  let execution = {
    provider,
    requestedModel: requestedModel(provider, model),
    generationParameters: { reasoningEffort: reasoningEffortForProvider(provider) },
    startedAt,
    events: [],
  };
  const evidence = { request: null, response: null };

  try {
    const isolationPath = assets?.absolutePaths?.isolation
      || resolve(options.repositoryRoot || DEFAULT_REPOSITORY_ROOT, evalCase.isolationManifestPath);
    isolation = await isolationLoader(isolationPath);
    if (isolation.sessionId.startsWith('fixture-') && options.strictIsolation === true) {
      throw new Error('正式测评不得使用仓库内置 fixture 隔离清单；请替换为启动器生成的本次清单');
    }

    failedStage = '固定输入加载';
    assets ||= await assetLoader(evalCase, {
      repositoryRoot: options.repositoryRoot,
      schemaPath: options.schemaPath,
    });
    messages = buildEvaluationMessages({
      evalCase,
      gdd: assets.gdd,
      rubric: assets.rubric,
      promptTemplate: assets.promptTemplate,
    });

    failedStage = 'Request Evidence 写入';
    const request = requestEvidence({ evaluationId, evalCase, isolation, assets, messages, provider, model });
    evidence.request = evidenceReference(await writeJsonEvidence(paths.request, request), 'evidence/request.json');

    failedStage = 'Cloud 评价';
    const runningInput = {
      evaluationId, status: 'running', evalCase, isolation, assets, messages,
      execution, evidence, provider, model,
    };
    await writeAtomic(paths.result, renderResult(runningInput));
    await writeAtomic(paths.progress, renderProgress(runningInput));

    const cloud = await evaluator({
      provider,
      model,
      evalCase,
      messages,
      schema: assets.schema,
      schemaPath: assets.absolutePaths?.schema || options.schemaPath || DEFAULT_SCHEMA_PATH,
      timeoutMs: options.timeoutMs,
    });
    execution = cloud.execution || execution;

    failedStage = 'Response Evidence 写入';
    evidence.response = evidenceReference(await writeJsonEvidence(paths.response, {
      evaluationId,
      rawResponse: cloud.rawResponse,
    }), 'evidence/response.json');

    failedStage = 'Schema 校验';
    const evaluation = validateAiEvaluation(cloud.rawResponse, evalCase);

    failedStage = '评价文档写入';
    const renderInput = {
      evaluationId,
      status: 'awaiting_human',
      evalCase,
      isolation,
      assets,
      messages,
      evaluation,
      execution,
      evidence,
      provider,
      model,
    };
    await writeAtomic(paths.result, renderResult(renderInput));
    await writeAtomic(paths.progress, renderProgress(renderInput));

    failedStage = '评价文档回读';
    await Promise.all([
      verifyArtifact(paths.result, evaluationId),
      verifyArtifact(paths.progress, evaluationId),
    ]);
    return { evaluationId, evalCase, evaluation, execution, isolation, evidence, paths };
  } catch (error) {
    const failedInput = {
      evaluationId,
      status: 'failed',
      evalCase,
      isolation,
      assets,
      messages,
      execution,
      evidence,
      provider,
      model,
      startedAt,
      error,
      failedStage,
    };
    try {
      await writeAtomic(paths.result, renderResult(failedInput));
      await writeAtomic(paths.problem, renderProblem(failedInput));
      await writeAtomic(paths.progress, renderProgress(failedInput));
      await Promise.all([
        verifyArtifact(paths.result, evaluationId),
        verifyArtifact(paths.problem, evaluationId),
        verifyArtifact(paths.progress, evaluationId),
      ]);
    } catch (artifactError) {
      throw new Error(`${error.message}；失败产物写入失败：${artifactError.message}`);
    }
    throw error;
  }
}

function takeValue(argv, index, name) {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${name} 缺少值`);
  return value;
}

export function parseCliOptions(argv = []) {
  const parsed = { caseId: undefined, provider: 'codex', model: undefined, runsRoot: undefined, listCases: false, strictIsolation: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--list-cases') parsed.listCases = true;
    else if (argument === '--strict-isolation') parsed.strictIsolation = true;
    else if (argument === '--case') { parsed.caseId = takeValue(argv, index, '--case'); index += 1; }
    else if (argument.startsWith('--case=')) parsed.caseId = argument.slice(7) || (() => { throw new Error('--case 缺少值'); })();
    else if (argument === '--provider') { parsed.provider = takeValue(argv, index, '--provider'); index += 1; }
    else if (argument.startsWith('--provider=')) parsed.provider = argument.slice(11) || (() => { throw new Error('--provider 缺少值'); })();
    else if (argument === '--model') { parsed.model = takeValue(argv, index, '--model'); index += 1; }
    else if (argument.startsWith('--model=')) parsed.model = argument.slice(8) || (() => { throw new Error('--model 缺少值'); })();
    else if (argument === '--runs-root') { parsed.runsRoot = takeValue(argv, index, '--runs-root'); index += 1; }
    else if (argument.startsWith('--runs-root=')) parsed.runsRoot = argument.slice(12) || (() => { throw new Error('--runs-root 缺少值'); })();
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
  const result = await (options.evaluate || evaluateCase)(parsed);
  write(`测评 ID：${result.evaluationId}\n暂定 AI 总分：${result.evaluation.aiTotalScore.toFixed(1)}/100\n简要总结：${result.evaluation.summary}\nResult：${result.paths.result}\n下一步：在 Result 填写人工评分后运行 npm run finalize -- --run ${result.evaluationId}`);
  return result;
}

async function startCli() {
  try {
    await runCli({ argv: process.argv.slice(2) });
  } catch (error) {
    console.error(`评价失败：${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) startCli();
