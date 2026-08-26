# Concise Progression Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Progression a concise, score-free, reproducible execution audit with sidecar AI evidence and failure persistence.

**Architecture:** Add a focused `progress-audit.mjs` module that owns audit events, AI JSON evidence, success/failure rendering, atomic writes, and readback checks. `evaluate-case.mjs` appends real orchestration events and finalizes the audit; `document-renderer.mjs` only renders Problem and Result plus a provisional Progression. Human rating synchronization records only synchronization facts in Progression.

**Tech Stack:** Node.js ESM, `node:test`, Markdown, JSON sidecar evidence, SHA-256.

---

### Task 1: Lock The Score-Free Progression Contract

**Files:**
- Modify: `docs/gdd-edd/player-rating-web/tests/document-renderer.test.mjs`
- Modify: `docs/gdd-edd/player-rating-web/src/document-renderer.mjs`
- Modify: `docs/gdd-edd/player-rating-web/tests/markdown-sync.test.mjs`
- Modify: `docs/gdd-edd/player-rating-web/tests/e2e.test.mjs`
- Modify: `docs/gdd-edd/player-rating-web/src/markdown-sync.mjs`

- [ ] Add failing assertions that Progression contains the exact Prompt, hashes, ordered facts, evidence reference, output paths, and next action.
- [ ] Add failing assertions that Progression and its human-sync section contain no AI, player, combined, dimension, or final scores and no embedded raw JSON.
- [ ] Run the focused renderer/sync/E2E tests and confirm contract failures.
- [ ] Make the smallest renderer and sync changes that satisfy the new contract.
- [ ] Re-run the focused tests and confirm they pass.

### Task 2: Persist AI Evidence And Successful Audit Facts

**Files:**
- Create: `docs/gdd-edd/player-rating-web/src/progress-audit.mjs`
- Create: `docs/gdd-edd/player-rating-web/tests/progress-audit.test.mjs`
- Modify: `docs/gdd-edd/player-rating-web/src/evaluate-case.mjs`
- Modify: `docs/gdd-edd/player-rating-web/tests/evaluate-case.test.mjs`

- [ ] Add a failing test for atomically writing and reading back `progress/evidence/<evaluation-id>-ai-output.json` with a SHA-256 reference.
- [ ] Implement evidence persistence and verification.
- [ ] Add a failing orchestration test for ordered case/assets, AI, schema, evidence, document-write/readback, and session events.
- [ ] Implement append-only audit events in `evaluateCase`, write documents, verify Problem/Result identifiers, create the session, and finalize Progression.
- [ ] Re-run focused audit and orchestration tests.

### Task 3: Persist Failure Progression

**Files:**
- Modify: `docs/gdd-edd/player-rating-web/src/progress-audit.mjs`
- Modify: `docs/gdd-edd/player-rating-web/tests/progress-audit.test.mjs`
- Modify: `docs/gdd-edd/player-rating-web/src/evaluate-case.mjs`
- Modify: `docs/gdd-edd/player-rating-web/tests/evaluate-case.test.mjs`

- [ ] Add a failing test where the evaluator throws after an evaluation id is allocated and assert a failure Progression remains.
- [ ] Add redacted failure rendering with failed step, completed outputs, incomplete items, and exact retry command.
- [ ] Ensure a failed session is closed and deleted when applicable, without masking the original error.
- [ ] Re-run focused failure tests.

### Task 4: Align Documentation And Existing Run

**Files:**
- Modify: `docs/gdd-edd/progress/README.md`
- Modify: `docs/gdd-edd/player-rating-web/README.md`
- Modify: `docs/gdd-edd/README.md`
- Modify: `docs/gdd-edd/player-rating-web/scripts/static-check.mjs`
- Modify: `docs/gdd-edd/progress/paws-patience-gdd-r97-run3-Progression.md`
- Create: `docs/gdd-edd/progress/evidence/paws-patience-gdd-r97-run3-ai-output.json`

- [ ] Rewrite the Progression requirements to the approved concise audit contract.
- [ ] Update workflow documentation and static checks to state that scores live only in Result.
- [ ] Extract the existing run3 embedded JSON into its sidecar, record its SHA-256, remove duplicated scores, and retain the existing Result link and synchronization fact.
- [ ] Run `npm run check` and confirm all tests and static checks pass.
- [ ] Run `git diff --check` and verify the run3 evidence JSON parses.
