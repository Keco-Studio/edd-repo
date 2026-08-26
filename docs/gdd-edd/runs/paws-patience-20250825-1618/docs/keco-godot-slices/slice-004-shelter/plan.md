---
version: 1
sliceId: slice-004-shelter
documentType: plan
createdDate: 2026-08-25
updatedDate: 2026-08-25
status: accepted
latest: true
runId: paws-patience-20260825-1618
specDocumentId: 6fc89510-6a6f-42f6-97af-9b6f70bfb86a
---

# Slice 004 实施计划

## Allowed files

- `paws_patience/main.gd`
- `progress/paws-patience-20260825-1618.jsonl`
- `result/paws-patience-20260825-1618.json`
- `docs/keco-godot-slices/slice-004-shelter/spec.md`
- `docs/keco-godot-slices/slice-004-shelter/plan.md`
- `docs/keco-godot-slices/slice-004-shelter/plan.validation.json`
- `docs/keco-godot-slices/slice-004-shelter/status.json`
- `docs/keco-godot-slices/slice-004-shelter/eval-report.json`
- `docs/keco-godot-slices/paws-patience-20260825-roadmap/roadmap.md`

## Task checklist

- [x] task-401: 增加庇护所类型和建造状态
  - Files: `paws_patience/main.gd`
  - Evaluations: eval-401-shelter-options
- [x] task-402: 将真实建造 handler 接入交互和反馈
  - Files: `paws_patience/main.gd`
  - Depends on: task-401
  - Evaluations: eval-402-shelter-build, eval-403-shelter-feedback
- [x] task-403: 运行复核并保留人工评分空位
  - Files: progress, result, docs mirrors
  - Depends on: task-402
  - Evaluations: eval-401-shelter-options, eval-402-shelter-build, eval-403-shelter-feedback, eval-404-shelter-presentation

## Review gates

- PlanReview: validate exact files and fixed EvalSpec.
- RuntimeEval: `run_project -> get_debug_output -> stop_project`.
- FinalVerify: fresh Claude review and null human scores.
