# GDD EDD Player Rating Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-contained public player-rating service that aggregates anonymous 1-5 ratings with AI scores and safely writes the result into an EDD Markdown document.

**Architecture:** A dependency-light Node HTTP server serves static admin/player pages, persists sessions and ratings in an atomic JSON store, and updates a bounded marker block in `docs/gdd-edd/result/*.md`. Pure scoring, validation, aggregation, and Markdown functions remain separate from HTTP and filesystem adapters so they can be tested with Node's built-in test runner.

**Tech Stack:** Node.js ESM, Node `http`/`fs`/`crypto`, browser HTML/CSS/JavaScript, optional `ngrok` package, Node test runner.

---

### Task 1: Project Scaffold And Scoring Contract

**Files:**
- Create: `docs/gdd-edd/player-rating-web/package.json`
- Create: `docs/gdd-edd/player-rating-web/src/scoring.mjs`
- Create: `docs/gdd-edd/player-rating-web/tests/scoring.test.mjs`

- [ ] **Step 1: Write failing scoring tests** for 1-5 averages, complete distributions, AI 60% / player 40% dimension scores, equal dimension weighting, and the empty-sample state.
- [ ] **Step 2: Run `npm test -- tests/scoring.test.mjs`** and verify failure because `src/scoring.mjs` does not exist.
- [ ] **Step 3: Implement pure exports** `distribution(scores)`, `aggregateRatings(ratings)`, and `combineScores({ aiCoreScore, aiExperienceScore, aggregate })`. Clamp AI inputs to 0-50, preserve one decimal place, and return `final: null` when there are no player ratings.
- [ ] **Step 4: Re-run the focused tests** and verify all scoring cases pass.

### Task 2: Validation, Anonymous Identity, And Session Storage

**Files:**
- Create: `docs/gdd-edd/player-rating-web/src/validation.mjs`
- Create: `docs/gdd-edd/player-rating-web/src/store.mjs`
- Create: `docs/gdd-edd/player-rating-web/tests/validation.test.mjs`
- Create: `docs/gdd-edd/player-rating-web/tests/store.test.mjs`

- [ ] **Step 1: Write failing validation tests** covering scores outside 1-5, unknown reason values, comments over 300 characters, invalid expiry/minimum sample values, and result paths outside `../result/*.md`.
- [ ] **Step 2: Write failing store tests** covering session creation, cryptographically unique public tokens, respondent hashing, one rating per session/respondent, update-without-count-growth, close/expiry behavior, and atomic persistence after reload.
- [ ] **Step 3: Run the focused tests** and verify failures are caused by missing modules.
- [ ] **Step 4: Implement validation functions** with fixed reason enums and a resolver that accepts only basenames returned from the result directory.
- [ ] **Step 5: Implement `JsonStore`** with an in-process promise queue, temp-file write plus rename, stable sessions, and upserted anonymous ratings.
- [ ] **Step 6: Re-run both focused suites** and verify they pass.

### Task 3: Markdown Result Synchronization

**Files:**
- Create: `docs/gdd-edd/player-rating-web/src/markdown-sync.mjs`
- Create: `docs/gdd-edd/player-rating-web/tests/markdown-sync.test.mjs`

- [ ] **Step 1: Write failing tests** for first append, exact marker replacement, preservation of surrounding edits, rejection of mismatched markers, full rating distributions, top reason counts, provisional output below five samples, and final combined output at or above five samples.
- [ ] **Step 2: Run the focused test** and verify it fails because the module is missing.
- [ ] **Step 3: Implement** `renderRatingSection(session, aggregate, combined, syncedAt)`, `replaceRatingSection(markdown, sessionId, section)`, and `syncResultDocument(path, section)` using temp-file atomic replacement.
- [ ] **Step 4: Re-run the focused suite** and verify it passes.

### Task 4: HTTP API And Share-Link Server

**Files:**
- Create: `docs/gdd-edd/player-rating-web/src/server.mjs`
- Create: `docs/gdd-edd/player-rating-web/src/rate-limit.mjs`
- Create: `docs/gdd-edd/player-rating-web/tests/server.test.mjs`

- [ ] **Step 1: Write failing HTTP tests** for admin authentication, result-document listing, session creation, public session reads, valid submissions, invalid/expired/closed submissions, duplicate respondent updates, manual close, and retry sync.
- [ ] **Step 2: Run the focused suite** and verify expected missing-server failures.
- [ ] **Step 3: Implement a Node HTTP router** with bounded JSON bodies and endpoints: `GET /api/admin/documents`, `POST /api/admin/sessions`, `GET /api/admin/sessions`, `POST /api/admin/sessions/:id/close`, `POST /api/admin/sessions/:id/sync`, `GET /api/public/sessions/:token`, and `POST /api/public/sessions/:token/ratings`.
- [ ] **Step 4: Add per-IP/session rate limiting**, response security headers, no-store headers for admin/public API responses, and automatic document sync after a successful rating upsert.
- [ ] **Step 5: Add optional share mode** that imports `ngrok`, opens a tunnel, prints the public player link base, and closes the tunnel on shutdown.
- [ ] **Step 6: Re-run server and all unit tests** and verify they pass.

### Task 5: Player And Admin Pages

**Files:**
- Create: `docs/gdd-edd/player-rating-web/public/index.html`
- Create: `docs/gdd-edd/player-rating-web/public/admin.html`
- Create: `docs/gdd-edd/player-rating-web/public/styles.css`
- Create: `docs/gdd-edd/player-rating-web/public/player.js`
- Create: `docs/gdd-edd/player-rating-web/public/admin.js`
- Create: `docs/gdd-edd/player-rating-web/public/assets/rating-header.png`
- Create: `docs/gdd-edd/player-rating-web/tests/ui-contract.test.mjs`

- [ ] **Step 1: Write a failing UI contract test** checking two labelled radiogroups, five stable options per group, reason checkboxes, 300-character feedback, disabled submit until complete, keyboard focus styles, responsive viewport metadata, admin session fields, and no inline secrets.
- [ ] **Step 2: Run the focused test** and verify failure because pages are missing.
- [ ] **Step 3: Build the player page** as the first screen, with a narrow game-art header, two unframed rating sections, five fixed-size radio choices, conditional reason checkboxes, optional comment, loading/error/closed/expired/submitted states, local anonymous ID, and edit-resubmission behavior.
- [ ] **Step 4: Build the admin page** with result-document selector, AI scores, expiry control, session table, public-link copy action, close and sync actions, and aggregate status.
- [ ] **Step 5: Add restrained responsive styling** using white, charcoal, leaf green, warm yellow, and coral; preserve 44px targets, visible focus, reduced motion, and non-overlapping mobile layouts.
- [ ] **Step 6: Re-run UI contract and all tests** and verify they pass.

### Task 6: EDD Template V5 And Operator Documentation

**Files:**
- Create: `docs/gdd-edd/result/评价模板-v5.md`
- Modify: `docs/gdd-edd/README.md`
- Modify: `docs/gdd-edd/result/README.md`
- Create: `docs/gdd-edd/player-rating-web/README.md`
- Create: `docs/gdd-edd/player-rating-web/.gitignore`

- [ ] **Step 1: Update the active template** so AI starts each dimension at 50, freely deducts per evidence-backed issue, lists every issue and exact deduction, and combines AI 60% with player 40% after the minimum sample threshold.
- [ ] **Step 2: Document setup and commands**: Node prerequisite, `npm install`, `npm start`, secure ngrok configuration, `npm run share`, admin link handling, result-file selection, closing sessions, data backup, and recovery after sync failure.
- [ ] **Step 3: Ignore runtime data and secrets** while retaining an empty `data/.gitkeep` if needed.
- [ ] **Step 4: Run placeholder and scope scans** to verify no secrets, no fixed AI deduction amounts, exactly two evaluation dimensions, and correct 60/40 plus 50/50 formulas.

### Task 7: End-To-End Verification

**Files:**
- Create: `docs/gdd-edd/player-rating-web/tests/e2e.mjs`

- [ ] **Step 1: Write an end-to-end test** that starts the server in a temporary data/result root, creates a session, submits and updates one respondent, checks sample count remains one, and verifies the final Markdown marker block and combined score.
- [ ] **Step 2: Run `npm test`** and verify every test passes without warnings.
- [ ] **Step 3: Start the real local server** and create a disposable session against a temporary result Markdown, then submit from the browser and verify writeback.
- [ ] **Step 4: Capture desktop and mobile screenshots** with Playwright, inspect them for clipping, overlap, unreadable controls, missing image pixels, and keyboard focus.
- [ ] **Step 5: Run `npm run check`** for tests plus static validation, and record the local/LAN URL and optional public share URL in the handoff.
