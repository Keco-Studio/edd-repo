# Auditable AI Evaluation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the AI return one evidence-based JSON result while Node generates concise, consistent Progression, Problem, and Result documents with a real observable execution record.

**Architecture:** Versioned Prompt and Rubric files are selected by each Eval Case. The evaluator captures provider JSON events and validated output; a dedicated renderer turns that one result into all three Markdown documents before the existing rating server creates a session.

**Tech Stack:** Node.js 20 ESM, Node test runner, JSON Schema, Codex JSONL, Claude stream-json, Markdown templates.

---

### Task 1: Fix the evaluation contract

**Files:**
- Create: `docs/gdd-edd/prompts/gdd-evaluation-v1.md`
- Create: `docs/gdd-edd/rubrics/two-dimension-v1.md`
- Modify: `docs/gdd-edd/eval-cases/paws-patience-r97.json`
- Modify: `docs/gdd-edd/result/评价模板-v6.md`
- Modify: `docs/gdd-edd/player-rating-web/src/ai-evaluation.schema.json`
- Modify: `docs/gdd-edd/player-rating-web/tests/eval-case.test.mjs`
- Modify: `docs/gdd-edd/player-rating-web/tests/ai-evaluator.test.mjs`

- [ ] Write failing tests requiring `promptPath`, `rubricPath`, `resultTemplatePath`, two dimension objects, evidence-backed observations, rationales, evidence gaps, and no AI-provided model or metrics.
- [ ] Run `node --test tests/eval-case.test.mjs tests/ai-evaluator.test.mjs` and confirm contract failures.
- [ ] Add the concise Prompt, shared score bands, manifest fields, minimal Result template, and matching JSON Schema.
- [ ] Update validation so Node computes `aiCoreScore`, `aiExperienceScore`, and `aiTotalScore` from `dimensions`.
- [ ] Re-run the focused tests and require zero failures.

### Task 2: Capture observable provider execution

**Files:**
- Modify: `docs/gdd-edd/player-rating-web/src/ai-evaluator.mjs`
- Modify: `docs/gdd-edd/player-rating-web/tests/ai-evaluator.test.mjs`

- [ ] Write failing tests requiring Codex `--json`, Claude `stream-json`, provider/requested/observed model fields, timestamps, duration, prompt, validated raw output, and normalized events without reasoning content.
- [ ] Run the AI evaluator tests and confirm failures come from missing trace capture.
- [ ] Parse Codex JSONL and Claude stream-json, extract final structured output, summarize only observable status/tool events, and discard thinking/reasoning content.
- [ ] Return `{ evaluation, execution }` from `runAiEvaluation` and preserve useful provider error details.
- [ ] Re-run the focused tests and require zero failures.

### Task 3: Generate all three documents in Node

**Files:**
- Create: `docs/gdd-edd/player-rating-web/src/document-renderer.mjs`
- Create: `docs/gdd-edd/player-rating-web/tests/document-renderer.test.mjs`
- Modify: `docs/gdd-edd/player-rating-web/src/evaluate-case.mjs`
- Modify: `docs/gdd-edd/player-rating-web/tests/evaluate-case.test.mjs`

- [ ] Write failing tests for Node-rendered Progression, Problem, and Result using one evaluation result and execution trace.
- [ ] Require Progression to contain hashes, prompt, structured output, event summaries, timing and generated paths without repeated rubric prose or hidden reasoning.
- [ ] Require Result to contain two scored dimensions and only a Problem summary/link; require Problem to own the complete issue table.
- [ ] Implement asset loading, SHA-256 calculation, strict template replacement, atomic three-document writes, and evaluation orchestration before rating-session creation.
- [ ] Run the renderer and command tests and require zero failures.

### Task 4: Simplify player synchronization and documentation

**Files:**
- Modify: `docs/gdd-edd/player-rating-web/src/markdown-sync.mjs`
- Modify: `docs/gdd-edd/player-rating-web/tests/markdown-sync.test.mjs`
- Modify: `docs/gdd-edd/player-rating-web/tests/e2e.test.mjs`
- Modify: `docs/gdd-edd/README.md`
- Modify: `docs/gdd-edd/player-rating-web/README.md`
- Modify: `docs/gdd-edd/result/README.md`
- Modify: `docs/gdd-edd/player-rating-web/scripts/static-check.mjs`

- [ ] Write failing tests requiring the Progression player block to show only sync time, sample count, final scores and Result path.
- [ ] Replace the verbose input/output/writeback block with the concise player status block.
- [ ] Document AI-only JSON, Node-only Markdown, fixed score bands and observable execution records.
- [ ] Update static checks to reject AI file-writing instructions, AI-provided model fields, metrics, and verbose Progression contracts.
- [ ] Run focused tests and the static check with zero failures.

### Task 5: Verify the full workflow

**Files:**
- Verify only.

- [ ] Run `npm run check` and require all tests and static checks to pass.
- [ ] Run `npm run eval -- --list-cases` and require `paws-patience-r97`.
- [ ] Run `git diff --check` and require no whitespace errors.
- [ ] Confirm production Prompt contains no Markdown-writing request and production event normalization contains no reasoning/thinking content.
- [ ] Confirm the existing player URL still returns HTTP 200.
- [ ] Inspect final changes without rewriting historical run2 documents or reverting unrelated worktree changes.
