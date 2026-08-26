---
version: 1
sliceId: slice-003-weather-season
documentType: plan
createdDate: 2026-08-25
updatedDate: 2026-08-25
status: accepted
latest: true
runId: paws-patience-20260825-1618
specDocumentId: ede397bb-9602-472e-a14e-7186ee07e216
---

# Slice 003 实施计划

## Allowed files

- `paws_patience/main.gd`
- `progress/v1/paws-patience-20260825-1618.jsonl`
- `result/v1/paws-patience-20260825-1618.json`
- `docs/keco-godot-slices/v1/slice-003-weather-season/spec.md`
- `docs/keco-godot-slices/v1/slice-003-weather-season/plan.md`
- `docs/keco-godot-slices/v1/slice-003-weather-season/plan.validation.json`
- `docs/keco-godot-slices/v1/slice-003-weather-season/status.json`
- `docs/keco-godot-slices/v1/slice-003-weather-season/eval-report.json`
- `docs/keco-godot-slices/v1/paws-patience-20260825-roadmap/roadmap.md`

## Task checklist

- [x] task-301: 定义季节天气序列和严重天气 AP 规则
  - Files: `paws_patience/main.gd`
  - Evaluations: eval-301-weather-startup, eval-302-severe-weather-ap
- [x] task-302: 将真实日终切换接入季节天气和 AP
  - Files: `paws_patience/main.gd`
  - Depends on: task-301
  - Evaluations: eval-302-severe-weather-ap, eval-303-day-weather-advance
- [x] task-303: 运行复核并保留人工评分空位
  - Files: progress, result, docs mirrors
  - Depends on: task-302
  - Evaluations: eval-301-weather-startup, eval-302-severe-weather-ap, eval-303-day-weather-advance, eval-304-weather-presentation

## Review gates

- PlanReview: validate exact files, dependencies, RED/GREEN commands, and fixed EvalSpec.
- RuntimeEval: `run_project -> get_debug_output -> stop_project`.
- FinalVerify: fresh Claude review, snapshot hash, and null human scores.
