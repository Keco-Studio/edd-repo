# test8-24 V2 Handoff

This package contains versioned development records for Keco project `test8-24`.

- `AGENTS.md` is the project-level Codex delivery constraint and final handoff checklist.

- `progress/v1/` is a read-only copy of the V1 progress evidence.
- `progress/v2/` contains the V2 Markdown and JSONL progress ledgers, aligned with V1.
- `planning/v1/` and `planning/v2/` contain their respective accepted Slice plans.
- `result/v1/` and `result/v2/` contain their respective run summaries.
- `docs/keco-game-evaluations/test8-24-v2-slice-008/` contains the locked profile, Claude raw review, normalized evidence, validated report, and evaluation progress.
- `data/keco/v1/` contains the verified V1 resource snapshot; `data/keco/v2/` records the V2 `reuse_exact` provenance without duplicating image bytes.
- `docs/keco-godot-slices/v1/` and `docs/keco-godot-slices/v2/` contain version-separated roadmap and Slice mirrors.
- `source/paws_patience/main.gd` contains the reviewed Slice 008 implementation and is identified by SHA256 in `manifest.json`.
- `baseline/project-files.sha256` identifies the unchanged Godot V1 project files.

The V2 Slice quick evaluation was performed by Claude Code CLI 2.1.152. Coverage is 7/8, so the validated report intentionally keeps the complete 100-point score null; human review remains null and separate.

The full Godot project and runtime assets remain at the canonical local path recorded in `docs/keco-godot-slices/v2/test8-24-v2/run-context.json`; this handoff package includes the changed gameplay source for review.
