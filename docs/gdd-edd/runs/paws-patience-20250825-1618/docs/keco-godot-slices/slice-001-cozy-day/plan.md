---
version: 1
sliceId: slice-001-cozy-day
documentType: plan
createdDate: 2026-08-25
updatedDate: 2026-08-25
status: accepted
latest: true
runId: paws-patience-20260825-1618
specDocumentId: 9d3f11ff-fa60-40d6-9225-d181f967be29
---

# Slice 001 实施计划

## Allowed files

- `paws_patience/project.godot`
- `paws_patience/main.tscn`
- `paws_patience/main.gd`
- `progress/paws-patience-20260825-1618.jsonl`
- `result/paws-patience-20260825-1618.json`
- `docs/keco-godot-slices/paws-patience-20260825-roadmap/roadmap.md`
- `docs/keco-godot-slices/slice-001-cozy-day/spec.md`
- `docs/keco-godot-slices/slice-001-cozy-day/plan.md`
- `docs/keco-godot-slices/slice-001-cozy-day/status.json`
- `docs/keco-godot-slices/slice-001-cozy-day/eval-report.json`

## Task checklist

- [ ] task-001: 创建 Godot 4 项目壳和主场景
  - Files: `paws_patience/project.godot`, `paws_patience/main.tscn`, `paws_patience/main.gd`
  - Depends on: none
  - RED: `Test-Path paws_patience/project.godot` 返回 False
  - GREEN: `get_project_info(projectPath=paws_patience)` 返回项目名和主场景；Godot headless 启动不报解析错误
- [ ] task-002: 实现天气、行动点、公司和地图状态
  - Files: `paws_patience/main.gd`, `paws_patience/main.tscn`
  - Depends on: task-001
  - RED: 状态字段和 KECO_EVAL 记录不存在
  - GREEN: 运行并得到 eval-001-startup、eval-002-work-and-feed 的 fresh KECO_EVAL
- [ ] task-003: 实现病弱猫交互、反馈和日终过渡
  - Files: `paws_patience/main.gd`, `paws_patience/main.tscn`
  - Depends on: task-002
  - RED: 猫交互按钮和日终 KECO_EVAL 不存在
  - GREEN: 运行并得到 eval-003-cat-interaction、eval-004-day-rollover 的 fresh KECO_EVAL
- [ ] task-004: 独立完成审查和人工评分留空
  - Files: `progress/paws-patience-20260825-1618.jsonl`, `result/paws-patience-20260825-1618.json`, `docs/keco-godot-slices/slice-001-cozy-day/eval-report.json`
  - Depends on: task-003
  - RED: 过程和结果文件不存在
  - GREEN: visual/experience 标记 manual_required，人工评分字段为空；校验脚本通过

## Review gates

- PlanReview：检查文件、依赖、RED/GREEN 和 EvalSpec。
- ExecutionPreflight：Godot 4.7 identity、项目路径、主场景和快照确认。
- RuntimeEval：`run_project -> get_debug_output -> stop_project`。
- FinalVerify：检查当前 snapshotHash、KECO_EVAL 覆盖、人工评分为空、过程可追溯。
