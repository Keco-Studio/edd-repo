# AI Score Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three-run AI-only baseline creation and comparison commands that report score mean, sample standard deviation, and differences without PASS/FAIL judgments.

**Architecture:** Keep the existing single-run evaluation and human-rating flow untouched. Add isolated statistics, baseline persistence, and sampling CLI modules that reuse Eval Case loading, fixed-asset hashing, Prompt rendering, and `runAiEvaluation`.

**Tech Stack:** Node.js ESM, `node:test`, JSON, SHA-256, local Claude/Codex CLI injection.

---

### Task 1: Score Statistics

**Files:**
- Create: `docs/gdd-edd/player-rating-web/src/eval-statistics.mjs`
- Create: `docs/gdd-edd/player-rating-web/tests/eval-statistics.test.mjs`

- [ ] Write tests asserting `summarizeScores([52, 54, 57])` returns rounded values, mean, sample standard deviation, min, and max.
- [ ] Run `node --test tests/eval-statistics.test.mjs` and verify the test fails because the module is missing.
- [ ] Implement `summarizeScores`, `summarizeSamples`, and `compareAggregates` with one-decimal rounding.
- [ ] Re-run the focused test and verify it passes.

### Task 2: Baseline Persistence

**Files:**
- Create: `docs/gdd-edd/player-rating-web/src/eval-baseline-store.mjs`
- Create: `docs/gdd-edd/player-rating-web/tests/eval-baseline-store.test.mjs`

- [ ] Write tests for safe deterministic paths, atomic JSON roundtrip, overwrite refusal, `force` replacement, and compatibility validation.
- [ ] Run the focused test and verify missing behavior fails.
- [ ] Implement `baselinePath`, `writeBaseline`, `readBaseline`, and `compareConfiguration`.
- [ ] Re-run the focused test and verify it passes.

### Task 3: Sequential Sampling And CLI

**Files:**
- Create: `docs/gdd-edd/player-rating-web/src/eval-sampling.mjs`
- Create: `docs/gdd-edd/player-rating-web/tests/eval-sampling.test.mjs`
- Modify: `docs/gdd-edd/player-rating-web/package.json`

- [ ] Write tests proving default three sequential evaluator calls, stable inputs, sample metadata, output SHA-256, aggregation, and no write after sample failure.
- [ ] Write CLI tests for baseline/compare modes, `--runs 2-20`, `--case`, `--provider`, `--model`, and `--force`.
- [ ] Run the focused test and verify it fails before implementation.
- [ ] Implement sampling orchestration and terminal formatting without PASS/FAIL or regression language.
- [ ] Add `eval:baseline` and `eval:compare` package scripts.
- [ ] Re-run focused tests and verify they pass.

### Task 4: Documentation And Verification

**Files:**
- Modify: `docs/gdd-edd/player-rating-web/README.md`
- Modify: `docs/gdd-edd/README.md`
- Modify: `docs/gdd-edd/player-rating-web/scripts/static-check.mjs`
- Create: `docs/gdd-edd/baselines/.gitkeep`

- [ ] Document the two commands, default run count, storage path, comparison semantics, cost, and one-case limitation.
- [ ] Add static assertions for both scripts and the absence of PASS/FAIL gates.
- [ ] Run `npm run check` and confirm the full suite passes.
- [ ] Run `git diff --check` and confirm no real baseline or AI calls were created during tests.
