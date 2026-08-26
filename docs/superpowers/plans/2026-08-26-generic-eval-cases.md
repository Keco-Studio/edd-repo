# Generic Eval Cases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hard-coded Paws evaluation command with a reusable `--case` workflow while preserving the v6 three-document and human-rating flow.

**Architecture:** A new Case Loader owns JSON discovery, validation, and repository-safe path resolution. The AI evaluator receives a validated Case instead of a Paws constant, and a generic evaluation command selects the Case, allocates document names, starts the existing rating server, and prints numeric scores plus the player URL.

**Tech Stack:** Node.js 20 ESM, Node test runner, JSON configuration, existing Claude/Codex CLI integration.

---

### Task 1: Add the Case Loader

**Files:**
- Create: `docs/gdd-edd/eval-cases/paws-patience-r97.json`
- Create: `docs/gdd-edd/player-rating-web/src/eval-case.mjs`
- Create: `docs/gdd-edd/player-rating-web/tests/eval-case.test.mjs`

- [ ] **Step 1: Write failing tests**

Cover sorted discovery, loading the default and explicit Case, frozen normalized output, unknown IDs, invalid JSON, filename/ID mismatch, unsafe paths, missing files, and invalid revision/type.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/eval-case.test.mjs`

Expected: FAIL because `src/eval-case.mjs` does not exist.

- [ ] **Step 3: Implement the fixed Case and loader**

Expose this API:

```js
export const DEFAULT_CASE_ID = 'paws-patience-r97';
export async function listEvalCaseIds(options = {}) {}
export async function loadEvalCase(id = DEFAULT_CASE_ID, options = {}) {}
```

The loader accepts injectable `casesRoot` and `repositoryRoot`, validates all manifest fields, confirms both files exist inside the repository, and returns `Object.freeze()` output.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/eval-case.test.mjs`

Expected: all Case Loader tests pass.

### Task 2: Make AI evaluation Case-driven

**Files:**
- Modify: `docs/gdd-edd/player-rating-web/tests/ai-evaluator.test.mjs`
- Modify: `docs/gdd-edd/player-rating-web/src/ai-evaluator.mjs`

- [ ] **Step 1: Change tests to pass a Case**

Require `buildEvaluationPrompt({ evalCase, evaluationId, documents })`, `validateAiEvaluation(raw, evalCase)`, and `runAiEvaluation({ evalCase, ... })`. Add a second synthetic Case to prove prompt and source validation are not tied to Paws.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/ai-evaluator.test.mjs`

Expected: FAIL because the evaluator still exports and uses `PAWS_SOURCE`.

- [ ] **Step 3: Remove hard-coded Paws metadata**

Delete `PAWS_SOURCE`; build paths and title from `evalCase`; compare returned project ID, document ID, revision, and title exactly with the selected Case.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/ai-evaluator.test.mjs`

Expected: all AI evaluator tests pass.

### Task 3: Replace the Paws command with a generic command

**Files:**
- Delete: `docs/gdd-edd/player-rating-web/src/evaluate-paws.mjs`
- Delete: `docs/gdd-edd/player-rating-web/tests/evaluate-paws.test.mjs`
- Create: `docs/gdd-edd/player-rating-web/src/evaluate-case.mjs`
- Create: `docs/gdd-edd/player-rating-web/tests/evaluate-case.test.mjs`
- Modify: `docs/gdd-edd/player-rating-web/package.json`

- [ ] **Step 1: Write generic command tests**

Require `nextEvaluationId(resultRoot, outputStem)`, `evaluateCase({ evalCase, ... })`, score formatting, parsing `--case`/`--provider`/`--list-cases`, unknown-option errors, and list-only behavior without starting AI or Web services.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/evaluate-case.test.mjs`

Expected: FAIL because `src/evaluate-case.mjs` does not exist.

- [ ] **Step 3: Implement the generic command**

Load the default Case when `--case` is absent. Use the Case `outputStem` for document naming, pass the Case to the evaluator, preserve run suffix allocation and human-rating session creation, and point `npm run eval` to `src/evaluate-case.mjs`.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/evaluate-case.test.mjs`

Expected: all generic command tests pass.

### Task 4: Align documentation and static checks

**Files:**
- Modify: `docs/gdd-edd/README.md`
- Modify: `docs/gdd-edd/gdd/README.md`
- Modify: `docs/gdd-edd/player-rating-web/README.md`
- Modify: `docs/gdd-edd/player-rating-web/scripts/static-check.mjs`

- [ ] **Step 1: Make the static check require the generic entry point and Gold Case**

Require `packageJson.scripts.eval === 'node src/evaluate-case.mjs'`, require the manifest to contain `type: gold`, and reject Paws source constants in production evaluator code.

- [ ] **Step 2: Verify RED**

Run: `node scripts/static-check.mjs`

Expected: FAIL until package scripts and documentation use the generic Case workflow.

- [ ] **Step 3: Update documentation**

Document `npm run eval`, `--case paws-patience-r97`, `--list-cases`, Case manifest responsibilities, and the unchanged three-document/human-rating data flow.

- [ ] **Step 4: Verify GREEN**

Run: `node scripts/static-check.mjs`

Expected: static check passes.

### Task 5: Full verification

**Files:**
- Verify only.

- [ ] Run `npm run check` and require zero failures.
- [ ] Run `npm run eval -- --list-cases` and require `paws-patience-r97`.
- [ ] Run `git diff --check` and require no whitespace errors.
- [ ] Search production code for `PAWS_SOURCE` and `evaluate-paws`; require no matches.
- [ ] Confirm the existing player-rating URL still returns HTTP 200.
- [ ] Inspect the final diff without reverting unrelated user changes.
