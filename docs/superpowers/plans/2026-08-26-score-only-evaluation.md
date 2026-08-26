# Scored Evaluation With Human Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run one GDD evaluation that creates three audit documents, collects two human ratings through the existing Web, and presents numeric scores without regression or pass/fail decisions.

**Architecture:** The AI reads the fixed GDD and v6 template, creates Progression, Problem, and Result, and returns schema-constrained JSON. Node verifies the documents, creates the existing human-rating session, combines AI 60% with human 40%, and writes numeric results back to Result and Progression without producing a process verdict.

**Tech Stack:** Node.js 20, Node test runner, JSON Schema, Codex/Claude CLI, existing local player-rating Web.

---

### Task 1: Restore the required workflow contract

**Files:**
- Modify: `docs/gdd-edd/player-rating-web/tests/ai-evaluator.test.mjs`
- Modify: `docs/gdd-edd/player-rating-web/tests/evaluate-paws.test.mjs`
- Modify: `docs/gdd-edd/player-rating-web/tests/markdown-sync.test.mjs`

- [ ] Require the AI prompt to create Progression, Problem, and Result while returning structured scores.
- [ ] Require `evaluatePaws` to verify those documents, start the existing rating server, and return the human-rating URL.
- [ ] Require terminal formatting to show the AI scores and human-rating URL without baseline, regression, or pass/fail text.
- [ ] Require player Markdown synchronization to write numeric inputs and outputs without a conclusion.
- [ ] Run the focused tests and confirm failures occur because the current score-only command omits these behaviors.

### Task 2: Restore orchestration

**Files:**
- Modify: `docs/gdd-edd/player-rating-web/src/ai-evaluator.mjs`
- Modify: `docs/gdd-edd/player-rating-web/src/evaluate-paws.mjs`
- Modify: `docs/gdd-edd/player-rating-web/src/markdown-sync.mjs`

- [ ] Pass stable document paths to the AI prompt and allow bounded writes only for the three outputs.
- [ ] Restore evaluation identifiers, document verification, rating-session creation, server startup, and returned player URL.
- [ ] Keep `aiTotalScore` and concise numeric terminal output.
- [ ] Remove generated conclusion fields while preserving AI, human, and combined scores.
- [ ] Run the focused tests and require all of them to pass.

### Task 3: Align the active template and documentation

**Files:**
- Modify: `docs/gdd-edd/result/评价模板-v6.md`
- Modify: `docs/gdd-edd/README.md`
- Modify: `docs/gdd-edd/player-rating-web/README.md`
- Modify: `docs/gdd-edd/result/README.md`
- Modify: `docs/gdd-edd/player-rating-web/scripts/static-check.mjs`

- [ ] Restore AI 60% and human 40% scoring for the two dimensions.
- [ ] Define the three required documents and human-rating writeback.
- [ ] Exclude baselines, regression comparisons, thresholds, and pass/fail conclusions.
- [ ] Keep the active v6 evaluation documents and player data intact.

### Task 4: Verify the complete flow

**Files:**
- Verify only; no planned production changes.

- [ ] Run `npm run check` and require zero failures.
- [ ] Run `git diff --check` and require no whitespace errors.
- [ ] Run an injected end-to-end evaluation proving three documents and a human-rating URL are created without changing real historical data.
- [ ] Inspect the final diff and preserve unrelated user changes.
