# GDD EDD Evaluation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the coupled GDD rating Web/baseline workflow with a controlled CLI that creates one fixed Run directory, records exact Cloud evidence, renders a user-facing Result, and finalizes `AI 40% + human 60%` scores from Markdown.

**Architecture:** Keep the existing dependency-free Node.js CLI foundation, rename it from `player-rating-web` to `runner`, and split fixed contracts, isolation validation, Cloud execution, artifact rendering, and human finalization into focused modules. The evaluated Agent remains outside the scoring runner; the runner requires a launcher-produced isolation manifest and rejects runs that are not fresh, empty-context, and Keco-only.

**Tech Stack:** Node.js ESM, built-in `node:test`, JSON Schema passed to Codex/Claude CLIs, Markdown run artifacts, SHA-256 evidence hashes.

**Spec:** `docs/superpowers/specs/2026-08-27-gdd-edd-evaluation-design.md`

## Global Constraints

- Evaluate GDD artifacts only; do not evaluate game builds or runtime playability.
- The evaluated Agent never receives dimensions, rubric, evaluator prompt, schema, historical failures, prior results, Superpowers, or unrelated plugins.
- Every Cloud evaluation uses exactly three dimensions with maxima `30`, `40`, and `30`.
- AI and human use the same dimension scale; final dimensions use `AI * 0.40 + human * 0.60` and round to one decimal place.
- `result.md` is the only user-facing result; `progress.md` owns full scoring criteria and technical inputs.
- `problem.md` is generated only for an operational blocker.
- Every Run owns `progress.md`, `result.md`, `evidence/request.json`, and available `evidence/response.json` in one directory.
- Human scoring is entered in Markdown and finalized by CLI; no Web server is used.
- Existing untracked user artifacts under `docs/gdd-edd/baselines/` must not be deleted or committed.
- Use atomic file replacement and verify the evaluation ID after readback.

## File Map

- `docs/gdd-edd/runner/package.json`: exposes only `eval`, `finalize`, `test`, and `check` commands.
- `docs/gdd-edd/runner/src/contracts.mjs`: fixed dimensions, AI response validation, human score validation, and weighted calculation.
- `docs/gdd-edd/runner/src/isolation.mjs`: validates the launcher-produced clean-session manifest.
- `docs/gdd-edd/runner/src/eval-case.mjs`: loads one explicit repository-local GDD case and its isolation manifest.
- `docs/gdd-edd/runner/src/evaluator.mjs`: constructs the exact Cloud message, invokes Codex or Claude, and returns raw structured output plus observable execution metadata.
- `docs/gdd-edd/runner/src/artifacts.mjs`: atomic JSON/Markdown writes, SHA-256 hashes, readback, and fixed Run paths.
- `docs/gdd-edd/runner/src/renderer.mjs`: renders technical Progress, user Result, and optional Problem Markdown.
- `docs/gdd-edd/runner/src/run.mjs`: evaluation CLI and success/failure orchestration.
- `docs/gdd-edd/runner/src/finalize.mjs`: parses human Markdown fields, validates them, computes weighted scores, and replaces only the final result block.
- `docs/gdd-edd/runner/tests/*.test.mjs`: focused unit and integration tests for each module.
- `docs/gdd-edd/rubrics/gdd-v1.md`: sole active three-dimension rubric.
- `docs/gdd-edd/prompts/evaluator-v1.md`: detailed Cloud scoring instructions and inline GDD/rubric placeholders.
- `docs/gdd-edd/schemas/evaluation-v1.schema.json`: exact three-dimension Cloud output contract.
- `docs/gdd-edd/eval-cases/paws-patience-r97.json`: sample case pointing to active contracts and a required isolation manifest.
- `docs/gdd-edd/isolation/paws-patience-r97.json`: explicit sample launcher manifest for the checked-in case.
- `docs/gdd-edd/README.md`: clean-session prerequisites, evaluation, human edit, finalize, and output contract.

---

### Task 1: Rename The Runner And Establish Fixed Contracts

**Files:**
- Move: `docs/gdd-edd/player-rating-web/` -> `docs/gdd-edd/runner/`
- Modify: `docs/gdd-edd/runner/package.json`
- Modify: `docs/gdd-edd/runner/package-lock.json`
- Create: `docs/gdd-edd/runner/src/contracts.mjs`
- Create: `docs/gdd-edd/runner/tests/contracts.test.mjs`
- Create: `docs/gdd-edd/rubrics/gdd-v1.md`
- Create: `docs/gdd-edd/prompts/evaluator-v1.md`
- Create: `docs/gdd-edd/schemas/evaluation-v1.schema.json`

**Interfaces:**
- Produces: `DIMENSIONS`, `validateAiEvaluation(raw, evalCase)`, `validateHumanScores(input)`, and `combineScores(ai, human)` from `contracts.mjs`.
- Produces: a schema with `source`, `dimensions.experienceValue`, `dimensions.gameplaySystems`, `dimensions.contentPresentation`, and optional `additionalFindings`.
- Consumes: no earlier task interfaces.

- [ ] **Step 1: Move tracked package files without moving ignored local data**

Run:

```bash
runner_preserve_dir=$(mktemp -d)
mv docs/gdd-edd/player-rating-web/node_modules "$runner_preserve_dir/node_modules"
mv docs/gdd-edd/player-rating-web/data/store.json "$runner_preserve_dir/store.json"
git mv docs/gdd-edd/player-rating-web docs/gdd-edd/runner
mkdir -p docs/gdd-edd/player-rating-web/data
mv "$runner_preserve_dir/node_modules" docs/gdd-edd/player-rating-web/node_modules
mv "$runner_preserve_dir/store.json" docs/gdd-edd/player-rating-web/data/store.json
rmdir "$runner_preserve_dir"
```

Expected: Git records tracked file moves, `docs/gdd-edd/runner/package.json` exists, and the ignored local `node_modules/` and `data/store.json` remain at their original inactive path.

- [ ] **Step 2: Write failing fixed-contract tests**

Create `tests/contracts.test.mjs` with tests equivalent to:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { combineScores, DIMENSIONS, validateAiEvaluation, validateHumanScores } from '../src/contracts.mjs';

const evalCase = { projectId: 'p1', documentId: 'd1', revision: 1, title: 'Demo' };
const raw = {
  source: { projectId: 'p1', documentId: 'd1', revision: 1, title: 'Demo' },
  dimensions: {
    experienceValue: { score: 24, observations: [{ statement: '目标明确', evidence: '第 1 节' }], rationale: '证据充分', evidenceGaps: [] },
    gameplaySystems: { score: 32, observations: [{ statement: '循环完整', evidence: '第 2 节' }], rationale: '规则清楚', evidenceGaps: [] },
    contentPresentation: { score: 18, observations: [{ statement: '叙事存在', evidence: '第 3 节' }], rationale: '呈现不足', evidenceGaps: ['音频未定义'] },
  },
  additionalFindings: [{ evidence: '第 4 节', description: '术语不一致' }],
};

test('fixed dimensions are 30/40/30', () => {
  assert.deepEqual(DIMENSIONS.map(({ key, maximum }) => [key, maximum]), [
    ['experienceValue', 30], ['gameplaySystems', 40], ['contentPresentation', 30],
  ]);
});

test('AI validation rejects missing and extra dimensions', () => {
  assert.throws(() => validateAiEvaluation({ ...raw, dimensions: { experienceValue: raw.dimensions.experienceValue } }, evalCase), /三个固定维度/);
  assert.throws(() => validateAiEvaluation({ ...raw, dimensions: { ...raw.dimensions, engineering: raw.dimensions.experienceValue } }, evalCase), /三个固定维度/);
});

test('human scores use the same maxima', () => {
  assert.deepEqual(validateHumanScores({ evaluator: 'Li', evaluatedAt: '2026-08-27', rationale: '人工复核', experienceValue: 20, gameplaySystems: 35, contentPresentation: 25 }).scores,
    { experienceValue: 20, gameplaySystems: 35, contentPresentation: 25 });
  assert.throws(() => validateHumanScores({ evaluator: 'Li', evaluatedAt: '2026-08-27', rationale: '人工复核', experienceValue: 31, gameplaySystems: 35, contentPresentation: 25 }), /体验价值/);
});

test('combined score uses 40/60 and one-decimal rounding', () => {
  assert.deepEqual(combineScores(
    { experienceValue: 24, gameplaySystems: 32, contentPresentation: 18 },
    { experienceValue: 20, gameplaySystems: 35, contentPresentation: 25 },
  ), { dimensions: { experienceValue: 21.6, gameplaySystems: 33.8, contentPresentation: 22.2 }, aiTotal: 74, humanTotal: 80, finalTotal: 77.6 });
});
```

- [ ] **Step 3: Run the contract test and verify failure**

Run: `cd docs/gdd-edd/runner && node --test tests/contracts.test.mjs`

Expected: FAIL because `src/contracts.mjs` does not exist.

- [ ] **Step 4: Implement fixed contracts and active static files**

Implement `contracts.mjs` with exact dimension metadata, strict object-key checks, existing observation/rationale length limits, optional unscored findings, same-scale human validation, and the tested calculation. Create `gdd-v1.md` with the approved dimension definitions, five score bands, GDD-only evidence rules, and no workflow/file instructions. Create `evaluator-v1.md` with `{{title}}`, `{{gdd}}`, and `{{rubric}}` placeholders and the detailed rules from spec section 7. Move the JSON schema out of `src`, replace scored `issues` with optional unscored `additionalFindings`, set `additionalProperties: false`, and require exactly the three dimensions.

Change package metadata to:

```json
{
  "name": "gdd-edd-runner",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "eval": "node src/run.mjs",
    "finalize": "node src/finalize.mjs",
    "test": "node --test",
    "check": "npm test && node scripts/static-check.mjs"
  }
}
```

Regenerate the lockfile without dependencies using `npm install --package-lock-only --ignore-scripts`.

- [ ] **Step 5: Run focused tests**

Run: `cd docs/gdd-edd/runner && node --test tests/contracts.test.mjs`

Expected: 4 tests pass.

- [ ] **Step 6: Commit Task 1**

```bash
git add docs/gdd-edd/runner docs/gdd-edd/rubrics/gdd-v1.md docs/gdd-edd/prompts/evaluator-v1.md docs/gdd-edd/schemas/evaluation-v1.schema.json
git commit -m "refactor: establish fixed GDD evaluation contracts"
```

### Task 2: Enforce Isolation And Record Exact Cloud Requests

**Files:**
- Create: `docs/gdd-edd/runner/src/isolation.mjs`
- Modify: `docs/gdd-edd/runner/src/eval-case.mjs`
- Replace: `docs/gdd-edd/runner/src/ai-evaluator.mjs` -> `docs/gdd-edd/runner/src/evaluator.mjs`
- Create: `docs/gdd-edd/runner/tests/isolation.test.mjs`
- Create: `docs/gdd-edd/runner/tests/evaluator.test.mjs`
- Modify: `docs/gdd-edd/eval-cases/paws-patience-r97.json`
- Create: `docs/gdd-edd/isolation/paws-patience-r97.json`

**Interfaces:**
- Consumes: `validateAiEvaluation(raw, evalCase)` from Task 1.
- Produces: `validateIsolationManifest(raw) -> frozen manifest` and `loadIsolationManifest(path)`.
- Produces: `buildEvaluationMessages({ evalCase, gdd, rubric, promptTemplate }) -> [{ role: 'user', content }]`.
- Produces: `runCloudEvaluation(options) -> { rawResponse, evaluation, execution, request }`.

- [ ] **Step 1: Write failing isolation tests**

Create `tests/isolation.test.mjs` covering this accepted manifest:

```js
const valid = {
  sessionId: 'gdd-run-20260827-001',
  freshSession: true,
  contextSources: [],
  enabledPlugins: ['keco'],
  createdAt: '2026-08-27T10:00:00.000Z',
};
```

Assert rejection when `freshSession` is false, `contextSources` is non-empty, `enabledPlugins` contains `superpowers` or `atlassian-rovo`, the plugin list is empty, or a plugin does not equal `keco` and does not start with `keco:`.

- [ ] **Step 2: Write failing Cloud-request tests**

Create `tests/evaluator.test.mjs` asserting:

```js
const messages = buildEvaluationMessages({
  evalCase: { title: 'Demo' },
  gdd: '# Demo\nOnly current GDD',
  rubric: '# Fixed rubric',
  promptTemplate: '评价 {{title}}\n<GDD>\n{{gdd}}\n</GDD>\n<RUBRIC>\n{{rubric}}\n</RUBRIC>',
});
assert.equal(messages.length, 1);
assert.equal(messages[0].role, 'user');
assert.match(messages[0].content, /Only current GDD/);
assert.match(messages[0].content, /Fixed rubric/);
assert.doesNotMatch(messages[0].content, /run2|run3|历史失败/);
```

Stub the process runner and assert `runCloudEvaluation` returns the exact `messages`, provider/model parameters, validated raw response, and no hidden reasoning events.

- [ ] **Step 3: Run focused tests and verify failure**

Run: `cd docs/gdd-edd/runner && node --test tests/isolation.test.mjs tests/evaluator.test.mjs`

Expected: FAIL because `isolation.mjs` and `evaluator.mjs` do not exist.

- [ ] **Step 4: Implement isolation and evaluator modules**

Implement strict manifest validation with allowed plugin rule:

```js
const isApprovedPlugin = (name) => name === 'keco' || name.startsWith('keco:');
```

Require a non-empty session ID, `freshSession === true`, exactly zero context sources, at least one enabled plugin, only approved plugin names, and a valid ISO timestamp. Extend the case manifest with repository-local `isolationManifestPath`; remove `resultTemplatePath` because Result is code-rendered from the fixed contract.

Build one explicit user message containing the detailed evaluator instructions, the complete current GDD, and complete fixed rubric. Preserve the existing Codex/Claude structured-output invocation behavior, but rename the public entry point to `runCloudEvaluation` and use `docs/gdd-edd/schemas/evaluation-v1.schema.json`. Record only observable status/tool events and exclude thinking/reasoning blocks.

Create the checked-in sample isolation manifest using `freshSession: true`, empty `contextSources`, and `enabledPlugins: ["keco"]`; document it as a fixture that a real launcher replaces for each new experiment.

- [ ] **Step 5: Run focused tests**

Run: `cd docs/gdd-edd/runner && node --test tests/isolation.test.mjs tests/evaluator.test.mjs tests/contracts.test.mjs`

Expected: all focused tests pass.

- [ ] **Step 6: Commit Task 2**

```bash
git add docs/gdd-edd/runner/src docs/gdd-edd/runner/tests docs/gdd-edd/eval-cases/paws-patience-r97.json docs/gdd-edd/isolation/paws-patience-r97.json
git commit -m "feat: enforce clean GDD evaluation inputs"
```

### Task 3: Generate The Fixed Run Directory And User Result

**Files:**
- Create: `docs/gdd-edd/runner/src/artifacts.mjs`
- Replace: `docs/gdd-edd/runner/src/document-renderer.mjs` -> `docs/gdd-edd/runner/src/renderer.mjs`
- Replace: `docs/gdd-edd/runner/src/evaluate-case.mjs` -> `docs/gdd-edd/runner/src/run.mjs`
- Create: `docs/gdd-edd/runner/tests/artifacts.test.mjs`
- Create: `docs/gdd-edd/runner/tests/renderer.test.mjs`
- Create: `docs/gdd-edd/runner/tests/run.test.mjs`

**Interfaces:**
- Consumes: Task 1 contracts and Task 2 isolation/evaluator interfaces.
- Produces: `createRunPaths(runsRoot, evaluationId)`, `writeAtomic(path, content)`, `writeJsonEvidence(path, value)`, and `verifyArtifact(path, evaluationId)`.
- Produces: `renderProgress(input)`, `renderResult(input)`, and `renderProblem(input)`.
- Produces: `evaluateCase(options)` and CLI options `--case`, `--provider`, `--model`, `--runs-root`.

- [ ] **Step 1: Write failing artifact and renderer tests**

Assert `createRunPaths(root, 'demo-run1')` returns exactly:

```js
{
  root: join(root, 'demo-run1'),
  progress: join(root, 'demo-run1', 'progress.md'),
  result: join(root, 'demo-run1', 'result.md'),
  problem: join(root, 'demo-run1', 'problem.md'),
  evidenceRoot: join(root, 'demo-run1', 'evidence'),
  request: join(root, 'demo-run1', 'evidence', 'request.json'),
  response: join(root, 'demo-run1', 'evidence', 'response.json'),
};
```

Assert `renderProgress` includes the exact dimension criteria, `40%`/`60%`, isolation validation, complete Cloud message, model parameters, hashes, and event list. Assert `renderResult` includes a concise summary, provisional AI scores, evidence/rationale/gaps, additional findings, exact human fields, and no full prompt or full rubric.

- [ ] **Step 2: Write failing success/failure integration tests**

Use temporary directories and a stub evaluator. On success assert exactly these required paths exist and `problem.md` does not:

```text
<run>/progress.md
<run>/result.md
<run>/evidence/request.json
<run>/evidence/response.json
```

On evaluator failure assert `progress.md`, incomplete `result.md`, `problem.md`, and `evidence/request.json` exist; assert no final score appears. On invalid structured output assert the Problem names `Schema 校验` and gives a retry command.

- [ ] **Step 3: Run focused tests and verify failure**

Run: `cd docs/gdd-edd/runner && node --test tests/artifacts.test.mjs tests/renderer.test.mjs tests/run.test.mjs`

Expected: FAIL because the new artifact, renderer, and run modules do not exist.

- [ ] **Step 4: Implement atomic artifacts and fixed rendering**

Use `mkdir`, a same-directory random `.tmp` file, `writeFile`, and `rename` for atomic writes. Serialize JSON with two-space indentation and a trailing newline, read it back byte-for-byte, parse it, and return its SHA-256. Validate evaluation IDs with `/^[a-z0-9]+(?:-[a-z0-9]+)*$/` before constructing paths.

Render Result with fixed parseable human fields:

```markdown
## 人工评分

- 评分人：`__`
- 评分时间：`__`
- 体验价值（0-30）：`__`
- 玩法与系统（0-40）：`__`
- 内容与呈现（0-30）：`__`
- 评分理由：`__`

<!-- EDD_FINAL_START -->
## 最终评分

人工评分尚未完成，当前没有最终分。
<!-- EDD_FINAL_END -->
```

Do not put historical cases or internal execution events in Result.

- [ ] **Step 5: Implement orchestration and failure artifacts**

The run sequence is: load case -> validate isolation -> load/hash contracts -> create/write/read request -> invoke evaluator -> write/read response -> validate -> render/write/read Progress and Result. Any error after Run creation writes an incomplete Result and Problem using the same evaluation ID. `nextEvaluationId` scans Run directory names and appends `-run2`, `-run3`, without examining historical result content.

- [ ] **Step 6: Run focused tests**

Run: `cd docs/gdd-edd/runner && node --test tests/artifacts.test.mjs tests/renderer.test.mjs tests/run.test.mjs tests/evaluator.test.mjs tests/isolation.test.mjs tests/contracts.test.mjs`

Expected: all focused tests pass.

- [ ] **Step 7: Commit Task 3**

```bash
git add docs/gdd-edd/runner/src docs/gdd-edd/runner/tests
git commit -m "feat: write fixed GDD evaluation runs"
```

### Task 4: Finalize Human Markdown Scores

**Files:**
- Create: `docs/gdd-edd/runner/src/finalize.mjs`
- Create: `docs/gdd-edd/runner/tests/finalize.test.mjs`
- Modify: `docs/gdd-edd/runner/src/renderer.mjs`

**Interfaces:**
- Consumes: `validateHumanScores`, `combineScores`, `writeAtomic`, and fixed Result markers.
- Produces: `parseHumanSection(markdown)`, `renderFinalSection(input)`, `finalizeRun(options)`, and CLI option `--run <evaluation-id>`.

- [ ] **Step 1: Write failing finalization tests**

Test parsing this exact edited Markdown:

```markdown
- 评分人：`Li`
- 评分时间：`2026-08-27T18:00:00+08:00`
- 体验价值（0-30）：`20`
- 玩法与系统（0-40）：`35`
- 内容与呈现（0-30）：`25`
- 评分理由：`核心循环明确，但体验目标仍需收紧。`
```

Assert finalization writes combined dimensions `21.6`, `33.8`, `22.2`, AI total `74.0`, human total `80.0`, and final total `77.6`. Assert all text outside `<!-- EDD_FINAL_START -->` and `<!-- EDD_FINAL_END -->` is byte-identical.

Add rejection tests for `__`, non-numeric values, values above `30/40/30`, duplicate final markers, missing evaluator/rationale, and a Run ID mismatch. Assert rejected input leaves Result unchanged and creates or updates `problem.md` with the failure stage `人工评分终结`.

- [ ] **Step 2: Run finalization tests and verify failure**

Run: `cd docs/gdd-edd/runner && node --test tests/finalize.test.mjs`

Expected: FAIL because `src/finalize.mjs` does not exist.

- [ ] **Step 3: Implement strict Markdown parsing and final block replacement**

Use anchored line patterns for the six fixed human fields. Require exactly one match for each field and exactly one pair of final markers. Parse scores as finite numbers and pass them to `validateHumanScores`. Render a table with AI, human, and combined values plus the final formula and human rationale. Replace only the bytes between the two final markers and write atomically after all validation succeeds.

On failure, preserve Result and write a user-readable Problem with evaluation ID, failed stage, error summary, and retry command:

```text
npm run finalize -- --run <evaluation-id>
```

- [ ] **Step 4: Run focused and full tests**

Run: `cd docs/gdd-edd/runner && node --test tests/finalize.test.mjs tests/contracts.test.mjs tests/renderer.test.mjs`

Expected: focused tests pass.

Run: `cd docs/gdd-edd/runner && npm test`

Expected: all current Runner tests pass.

- [ ] **Step 5: Commit Task 4**

```bash
git add docs/gdd-edd/runner/src/finalize.mjs docs/gdd-edd/runner/src/renderer.mjs docs/gdd-edd/runner/tests/finalize.test.mjs
git commit -m "feat: finalize human GDD scores from Markdown"
```

### Task 5: Remove Legacy Paths And Document The Controlled Workflow

**Files:**
- Delete: `docs/gdd-edd/runner/public/`
- Delete: `docs/gdd-edd/runner/data/`
- Delete: legacy Web, store, rate-limit, markdown-sync, baseline, sampling, statistics, and progress-sync modules and their tests under `docs/gdd-edd/runner/`
- Delete: all Git-tracked `docs/gdd-edd/player-rating-web/` references after the move; leave ignored local data at that path untouched
- Delete: `docs/gdd-edd/rubrics/two-dimension-v1.md`
- Delete: `docs/gdd-edd/rubrics/three-dimension-v2.md`
- Delete: `docs/gdd-edd/prompts/gdd-evaluation-v2.md`
- Delete: `docs/gdd-edd/result/评价模板-v6.md`
- Delete: `docs/gdd-edd/result/评价模板-v7.md`
- Delete: tracked sample files under `docs/gdd-edd/progress/`, `docs/gdd-edd/problem/`, and `docs/gdd-edd/result/` after their information is represented by tests and Git history
- Modify: `docs/gdd-edd/runner/scripts/static-check.mjs`
- Modify: `docs/gdd-edd/README.md`
- Modify: `docs/gdd-edd/gdd/README.md`

**Interfaces:**
- Consumes: completed evaluation and finalization CLIs.
- Produces: one documented active workflow with no runnable Web or baseline command.

- [ ] **Step 1: Write the static contract checks**

Change `scripts/static-check.mjs` to fail unless:

- package scripts are exactly `eval`, `finalize`, `test`, and `check`;
- active Rubric, Prompt, and Schema paths exist;
- no source import contains `server`, `store`, `ngrok`, `baseline`, `sampling`, or `player-rating-web`;
- Result human/final markers are covered by tests;
- README documents clean session, Keco-only plugins, direct Markdown scoring, and `40/60` finalization.

- [ ] **Step 2: Run the static check and verify failure**

Run: `cd docs/gdd-edd/runner && node scripts/static-check.mjs`

Expected: FAIL while legacy scripts, imports, and documentation remain.

- [ ] **Step 3: Remove tracked legacy code and obsolete active artifacts**

Delete only Git-tracked Web, baseline, old template, old run, and obsolete scoring files. Do not delete or stage `docs/gdd-edd/baselines/paws-patience-r97/`, `docs/gdd-edd/player-rating-web/data/store.json`, or `docs/gdd-edd/player-rating-web/node_modules/` because they are untracked or ignored local data. Confirm with:

```bash
git status --short docs/gdd-edd/baselines
git status --short --ignored docs/gdd-edd/player-rating-web/data docs/gdd-edd/player-rating-web/node_modules
```

Expected: the pre-existing untracked baseline remains visible and unstaged; the local store and dependencies remain ignored at the inactive original path.

- [ ] **Step 4: Rewrite user documentation**

Document this exact workflow:

```bash
cd docs/gdd-edd/runner
npm install
npm run eval -- --case paws-patience-r97 --provider codex
# edit ../runs/<evaluation-id>/result.md
npm run finalize -- --run <evaluation-id>
```

Explain the four allowed Cloud inputs, fixed dimensions, provisional AI status, direct human fields, `40/60` formula, optional Problem behavior, Run file tree, and isolation manifest responsibility. State that the checked-in isolation manifest is a fixture and formal experiments must replace it with launcher-generated evidence.

- [ ] **Step 5: Run complete verification**

Run:

```bash
cd docs/gdd-edd/runner
npm install --ignore-scripts
npm run check
```

Expected: all Node tests and static checks pass.

Run from repository root:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; only intended tracked changes are staged or modified; `docs/gdd-edd/baselines/paws-patience-r97/` remains untracked.

- [ ] **Step 6: Commit Task 5**

```bash
git add -u docs/gdd-edd
git add docs/gdd-edd/README.md docs/gdd-edd/gdd/README.md docs/gdd-edd/runner/scripts/static-check.mjs
git commit -m "docs: publish controlled GDD EDD workflow"
```

- [ ] **Step 7: Verify the committed workflow**

Run:

```bash
cd docs/gdd-edd/runner
npm run check
git -C /home/ltt/project/edd-repo status --short
```

Expected: test/check exits `0`; the only remaining worktree entry is the pre-existing untracked baseline directory.
