import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildEvaluationPrompt, runAiEvaluation } from './ai-evaluator.mjs';
import { baselinePath, compareConfiguration, readBaseline, writeBaseline } from './eval-baseline-store.mjs';
import { loadEvaluationAssets } from './document-renderer.mjs';
import { loadEvalCase } from './eval-case.mjs';
import { compareAggregates, summarizeSamples } from './eval-statistics.mjs';

const DEFAULT_BASELINE_ROOT = fileURLToPath(new URL('../../baselines/', import.meta.url));
const hashJson = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const requestedModelFor = (provider, model) => model || (provider === 'claude' ? 'sonnet' : '本地默认配置');
const metric = (value) => `${value.mean.toFixed(1)} +/- ${value.stddev.toFixed(1)}`;

export function parseSamplingOptions(argv = []) {
  const mode = argv[0];
  if (!['baseline', 'compare'].includes(mode)) throw new Error('模式必须为 baseline 或 compare');
  const result = { mode, caseId: undefined, provider: 'claude', model: undefined, runs: 3, force: false };
  const take = (index, name) => {
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${name} 缺少值`);
    return value;
  };
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--force') result.force = true;
    else if (argument === '--case') { result.caseId = take(index, '--case'); index += 1; }
    else if (argument.startsWith('--case=')) result.caseId = argument.slice(7);
    else if (argument === '--provider') { result.provider = take(index, '--provider'); index += 1; }
    else if (argument.startsWith('--provider=')) result.provider = argument.slice(11);
    else if (argument === '--model') { result.model = take(index, '--model'); index += 1; }
    else if (argument.startsWith('--model=')) result.model = argument.slice(8);
    else if (argument === '--runs') { result.runs = Number(take(index, '--runs')); index += 1; }
    else if (argument.startsWith('--runs=')) result.runs = Number(argument.slice(7));
    else throw new Error(`未知参数：${argument}`);
  }
  if (!Number.isInteger(result.runs) || result.runs < 2 || result.runs > 20) throw new Error('--runs 必须为 2-20 的整数');
  if (!result.caseId && argv.some((value) => value === '--case=')) throw new Error('--case 缺少值');
  return result;
}

export async function sampleEvaluations(options) {
  const { evalCase, assets } = options;
  const provider = options.provider || 'claude';
  const runs = options.runs ?? 3;
  if (!Number.isInteger(runs) || runs < 2 || runs > 20) throw new Error('runs 必须为 2-20 的整数');
  const prompt = buildEvaluationPrompt({ evalCase, promptTemplate: assets.promptTemplate });
  const evaluator = options.evaluator || runAiEvaluation;
  const samples = [];
  for (let index = 0; index < runs; index += 1) {
    const run = await evaluator({ evalCase, provider, model: options.model, cwd: options.cwd, prompt });
    samples.push({
      index: index + 1,
      experienceValueScore: run.evaluation.aiExperienceValueScore,
      gameplaySystemsScore: run.evaluation.aiGameplaySystemsScore,
      contentPresentationScore: run.evaluation.aiContentPresentationScore,
      totalScore: run.evaluation.aiTotalScore,
      requestedModel: run.execution.requestedModel,
      observedModel: run.execution.observedModel,
      startedAt: run.execution.startedAt,
      finishedAt: run.execution.finishedAt,
      durationMs: run.execution.durationMs,
      rawOutputSha256: hashJson(run.execution.rawOutput),
    });
  }
  return {
    schemaVersion: 2,
    createdAt: (options.now || (() => new Date().toISOString()))(),
    case: { id: evalCase.id, title: evalCase.title, revision: evalCase.revision },
    provider,
    requestedModel: requestedModelFor(provider, options.model),
    observedModels: [...new Set(samples.map((sample) => sample.observedModel).filter(Boolean))],
    hashes: { ...assets.hashes },
    samples,
    aggregates: summarizeSamples(samples),
  };
}

async function context(options) {
  const evalCase = options.evalCase || await (options.caseLoader || loadEvalCase)(options.caseId, options.caseOptions);
  const assets = options.assets || await (options.assetLoader || loadEvaluationAssets)(evalCase, options.assetOptions);
  return { evalCase, assets };
}

export async function createScoreBaseline(options = {}) {
  const { evalCase, assets } = await context(options);
  const baseline = await sampleEvaluations({ ...options, evalCase, assets });
  const root = options.baselineRoot || DEFAULT_BASELINE_ROOT;
  const path = baselinePath(root, evalCase.id, baseline.provider, baseline.requestedModel);
  await (options.baselineWriter || writeBaseline)(path, baseline, { force: options.force });
  return { path, baseline };
}

export async function runScoreComparison(options = {}) {
  const { evalCase, assets } = await context(options);
  const provider = options.provider || 'claude';
  const requestedModel = requestedModelFor(provider, options.model);
  const root = options.baselineRoot || DEFAULT_BASELINE_ROOT;
  const path = baselinePath(root, evalCase.id, provider, requestedModel);
  const baseline = await (options.baselineReader || readBaseline)(path);
  const current = await sampleEvaluations({ ...options, evalCase, assets, provider });
  const changes = compareConfiguration(baseline, current);
  return { path, baseline, current, changes, differences: compareAggregates(baseline.aggregates, current.aggregates) };
}

export function formatBaseline(result) {
  const { baseline } = result;
  return `AI BASELINE
Case: ${baseline.case.id}
Runs: ${baseline.samples.length}
Experience Value: ${metric(baseline.aggregates.experienceValue)}
Gameplay Systems: ${metric(baseline.aggregates.gameplaySystems)}
Content Presentation: ${metric(baseline.aggregates.contentPresentation)}
Total: ${metric(baseline.aggregates.total)}
Saved: ${result.path}`;
}

export function formatComparison(result) {
  const row = (name, key) => `${name.padEnd(12)} ${metric(result.baseline.aggregates[key]).padEnd(16)} ${metric(result.current.aggregates[key]).padEnd(16)} ${result.differences[key] > 0 ? '+' : ''}${result.differences[key].toFixed(1)}`;
  return `AI SCORE COMPARISON
Case: ${result.current.case.id}
Runs: ${result.current.samples.length}
Metric       Baseline         Current          Difference
${row('Experience', 'experienceValue')}
${row('Gameplay', 'gameplaySystems')}
${row('Presentation', 'contentPresentation')}
${row('Total', 'total')}
Changes: ${result.changes.length ? result.changes.join(', ') : 'none'}`;
}

export async function runSamplingCli(options = {}) {
  const parsed = parseSamplingOptions(options.argv || []);
  const execute = parsed.mode === 'baseline' ? (options.createBaseline || createScoreBaseline) : (options.compareBaseline || runScoreComparison);
  const result = await execute(parsed);
  (options.write || console.log)(parsed.mode === 'baseline' ? formatBaseline(result) : formatComparison(result));
  return result;
}

async function startCli() {
  try { await runSamplingCli({ argv: process.argv.slice(2) }); }
  catch (error) {
    console.error(`评价采样失败：${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) startCli();
