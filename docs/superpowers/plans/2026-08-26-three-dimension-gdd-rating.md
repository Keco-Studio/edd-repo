# GDD Three-Dimension Rating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two-dimension AI and player rating model with the fixed 30/40/30 GDD model and a shorter evidence-only prompt.

**Architecture:** Keep the current AI JSON -> Node documents -> player Web flow. Change the shared dimension contract end to end, normalize AI and human values before combining at 70/30, and version the rubric/template/baseline data without rewriting historical outputs.

**Tech Stack:** Node.js ESM, JSON Schema, native `node:test`, static HTML/CSS/JavaScript, Markdown.

---

### Task 1: Define failing three-dimension contracts

**Files:**
- Modify: `docs/gdd-edd/player-rating-web/tests/ai-evaluator.test.mjs`
- Modify: `docs/gdd-edd/player-rating-web/tests/scoring.test.mjs`
- Modify: `docs/gdd-edd/player-rating-web/tests/validation.test.mjs`
- Modify: `docs/gdd-edd/player-rating-web/tests/ui-contract.test.mjs`

- [ ] Replace two-dimension fixtures and assertions with `experienceValue`, `gameplaySystems`, and `contentPresentation`.
- [ ] Run the four tests and confirm failures reference missing three-dimension behavior.

### Task 2: Implement core three-dimension model

**Files:**
- Modify: `docs/gdd-edd/player-rating-web/src/ai-evaluation.schema.json`
- Modify: `docs/gdd-edd/player-rating-web/src/ai-evaluator.mjs`
- Modify: `docs/gdd-edd/player-rating-web/src/scoring.mjs`
- Modify: `docs/gdd-edd/player-rating-web/src/validation.mjs`

- [ ] Validate AI limits at 30/40/30 and derive a 100-point total.
- [ ] Validate three required human 1-5 scores and dimension-specific reasons.
- [ ] Aggregate three dimensions and combine AI 70% with human 30%, then weight 30/40/30.
- [ ] Run the core tests until green.

### Task 3: Update Web and API flow

**Files:**
- Modify: `docs/gdd-edd/player-rating-web/public/index.html`
- Modify: `docs/gdd-edd/player-rating-web/public/player.js`
- Modify: `docs/gdd-edd/player-rating-web/src/server.mjs`
- Modify: `docs/gdd-edd/player-rating-web/tests/server.test.mjs`
- Modify: `docs/gdd-edd/player-rating-web/tests/e2e.test.mjs`

- [ ] Render three stable five-point groups and require all three before submission.
- [ ] Create sessions with three AI scores and expose only public aggregates.
- [ ] Submit, aggregate, and persist three human scores.
- [ ] Run API and end-to-end tests until green.

### Task 4: Version prompt, rubric, and generated documents

**Files:**
- Create: `docs/gdd-edd/rubrics/three-dimension-v2.md`
- Create: `docs/gdd-edd/result/评价模板-v7.md`
- Modify: `docs/gdd-edd/prompts/gdd-evaluation-v1.md`
- Modify: `docs/gdd-edd/eval-cases/paws-patience-r97.json`
- Modify: `docs/gdd-edd/player-rating-web/src/document-renderer.mjs`
- Modify: `docs/gdd-edd/player-rating-web/src/markdown-sync.mjs`
- Modify: relevant renderer and Markdown tests

- [ ] Keep the AI prompt short and enforce evidence-only, no completion, no duplicate attribution, and no runtime speculation.
- [ ] Render three AI sections, three human sections, and the 30/40/30 total formula.
- [ ] Keep Progression score-free and Problem evidence-backed.
- [ ] Run document tests until green.

### Task 5: Migrate score sampling and documentation

**Files:**
- Modify: `docs/gdd-edd/player-rating-web/src/eval-statistics.mjs`
- Modify: `docs/gdd-edd/player-rating-web/src/eval-sampling.mjs`
- Modify: sampling/statistics tests
- Modify: `docs/gdd-edd/player-rating-web/scripts/static-check.mjs`
- Modify: active README files

- [ ] Store and compare three dimension samples, set baseline schemaVersion to 2, and print three rows plus total.
- [ ] Update active instructions and static contracts while preserving historical run documents.
- [ ] Run `npm test`, `npm run check`, and `git diff --check`.
