# GDD EDD Local Orchestration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create Progression, Problem, Result, and a player-rating link from one admin submission without writing outside `docs/gdd-edd/`.

**Architecture:** A pure orchestration module validates workflow input and renders three linked Markdown documents. The existing Node server exposes one authenticated endpoint that writes those documents atomically enough to avoid partial overwrite, then creates the existing rating session bound to the new result file.

**Tech Stack:** Node.js ESM, built-in `fs`, Node test runner, existing HTML/CSS/JavaScript.

---

### Task 1: Document Orchestrator

**Files:**
- Create: `src/workflow.mjs`
- Create: `tests/workflow.test.mjs`

- [ ] Write tests for validation, stable filenames, all three document bodies, issue numbering, path confinement, and duplicate rejection.
- [ ] Run the focused test and verify failure because `src/workflow.mjs` is missing.
- [ ] Implement `validateWorkflowInput`, `renderWorkflowDocuments`, and `createWorkflowDocuments` using temporary writes and rename.
- [ ] Re-run the focused test and verify it passes.

### Task 2: Workflow API And Link Creation

**Files:**
- Modify: `src/server.mjs`
- Modify: `tests/server.test.mjs`

- [ ] Add a failing HTTP test for `POST /api/admin/workflows` that verifies three files, cross-links, session creation, and returned public token.
- [ ] Implement the authenticated endpoint with configurable progress/problem/result roots.
- [ ] Ensure document creation completes before session creation and the session binds only to the new result filename.
- [ ] Run server tests and verify they pass.

### Task 3: Minimal Admin Workflow Form

**Files:**
- Modify: `public/admin.html`
- Modify: `public/admin.js`
- Modify: `public/styles.css`
- Modify: `tests/ui-contract.test.mjs`

- [ ] Add failing UI contract checks for execution ID, GDD reference, AI issue rows, and one-click workflow creation.
- [ ] Replace manual result selection with the workflow fields while keeping expiry and AI scores.
- [ ] Submit to `/api/admin/workflows`, copy the returned player link, and list generated document paths.
- [ ] Run UI and full tests.

### Task 4: Regression And Documentation

**Files:**
- Modify: `tests/markdown-sync.test.mjs`
- Modify: `README.md`
- Modify: `../README.md`

- [ ] Add a regression test that permits independent session marker blocks when necessary.
- [ ] Update usage documentation with the one-click workflow and strict directory boundary.
- [ ] Run `npm run check`, restart the server, and verify the endpoint on temporary roots.
