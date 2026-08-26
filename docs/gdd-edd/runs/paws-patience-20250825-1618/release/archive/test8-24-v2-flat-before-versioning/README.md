# test8-24 V2 Handoff

This package contains versioned development records for Keco project `test8-24`.

- `progress/v1/` is a read-only copy of the V1 progress evidence.
- `progress/v2/` contains the V2 Markdown and JSONL progress ledgers, aligned with V1.
- `docs/` contains local mirrors of the V2 roadmap and Slice documents, including workflow support records under `supporting/`.
- `source/paws_patience/main.gd` contains the reviewed Slice 008 implementation and is identified by SHA256 in `manifest.json`.
- `baseline/project-files.sha256` identifies the unchanged Godot V1 project files.

The full Godot project and runtime assets remain at the canonical local path recorded in `progress/v2/run-context.json`; this handoff package includes the changed gameplay source for review.
