---
version: 1
sliceId: slice-005-encounter-probability
documentType: plan
createdDate: 2026-08-25
updatedDate: 2026-08-25
status: accepted
latest: true
runId: paws-patience-20260825-1618
specDocumentId: 5dad9391-58e6-467b-94d0-2e09cfd89411
---

# Slice 005 实施计划

## Allowed files

- `paws_patience/main.gd`
- `progress/v1/paws-patience-20260825-1618.jsonl`
- `result/v1/paws-patience-20260825-1618.json`
- `docs/keco-godot-slices/v1/slice-005-encounter-probability/spec.md`
- `docs/keco-godot-slices/v1/slice-005-encounter-probability/plan.md`
- `docs/keco-godot-slices/v1/slice-005-encounter-probability/plan.validation.json`
- `docs/keco-godot-slices/v1/slice-005-encounter-probability/status.json`
- `docs/keco-godot-slices/v1/slice-005-encounter-probability/eval-report.json`
- `docs/keco-godot-slices/v1/paws-patience-20260825-roadmap/roadmap.md`

## Task checklist

- [x] task-501: 增加猫类型/地点权重与概率计算
  - Files: `paws_patience/main.gd`
  - Evaluations: eval-501-probability-bounds, eval-502-bond-shelter-modifier
- [x] task-502: 将概率预览接入地图 UI 和真实状态
  - Files: `paws_patience/main.gd`
  - Depends on: task-501
  - Evaluations: eval-501-probability-bounds, eval-502-bond-shelter-modifier
- [x] task-503: 运行复核并保留人工评分空位
  - Files: progress, result, docs mirrors
  - Depends on: task-502
  - Evaluations: eval-501-probability-bounds, eval-502-bond-shelter-modifier, eval-503-probability-presentation

## Review gates

- RuntimeEval: `run_project -> get_debug_output -> stop_project`.
- FinalVerify: fresh Claude review and null human scores.
