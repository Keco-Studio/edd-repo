---
version: 1
sliceId: slice-002-cat-dialogue
documentType: plan
createdDate: 2026-08-25
updatedDate: 2026-08-25
status: accepted
latest: true
runId: paws-patience-20260825-1618
specDocumentId: 0f2e0261-a681-49be-b9af-02df93454393
---

# Slice 002 实施计划

## Allowed files

- `paws_patience/main.gd`
- `progress/paws-patience-20260825-1618.jsonl`
- `result/paws-patience-20260825-1618.json`
- `docs/keco-godot-slices/slice-002-cat-dialogue/spec.md`
- `docs/keco-godot-slices/slice-002-cat-dialogue/plan.md`
- `docs/keco-godot-slices/slice-002-cat-dialogue/status.json`
- `docs/keco-godot-slices/slice-002-cat-dialogue/eval-report.json`
- `docs/keco-godot-slices/slice-002-cat-dialogue/plan.validation.json`
- `docs/keco-godot-slices/paws-patience-20260825-roadmap/roadmap.md`

## Task checklist

- [x] task-201: 增加对话与情绪状态字段
  - Files: `paws_patience/main.gd`
  - RED: `rg "dialogue_line|cat_mood|eval-201-dialogue-branches" paws_patience/main.gd` returns no matches
  - GREEN: fields and branch evaluator identifiers exist
  - Evaluations: eval-201-dialogue-branches, eval-202-emotion-feedback
- [x] task-202: 将真实摸摸/喂食 handler 接入分支反馈
  - Files: `paws_patience/main.gd`
  - Depends on: task-201
  - RED: handler output has no branch id or mood
  - GREEN: runtime KECO_EVAL reports distinct feed/pet dialogue branches from real handlers
  - Evaluations: eval-201-dialogue-branches, eval-202-emotion-feedback
- [x] task-203: 增加对话区视觉层级
  - Files: `paws_patience/main.gd`
  - Depends on: task-202
  - RED: cat card has no dialogue label or mood label
  - GREEN: cat card renders dialogue label, mood label, and reaction text; manual visual review remains required
  - Evaluations: eval-203-dialogue-presentation
- [x] task-204: 运行复核、记录结果并保留人工评分空位
  - Files: progress, result, docs mirrors
  - Depends on: task-203
  - RED: no Slice 002 runtime report
  - GREEN: runtime batch records eval-201/202 plus manual eval-203; scores remain null
  - Evaluations: eval-201-dialogue-branches, eval-202-emotion-feedback, eval-203-dialogue-presentation

## Review gates

- PlanReview: validate exact files, dependencies, RED/GREEN commands, and fixed EvalSpec.
- ExecutionPreflight: verify Godot 4.7 identity and canonical project path.
- RuntimeEval: `run_project -> get_debug_output -> stop_project`.
- FinalVerify: fresh Claude completion review, snapshot hash, structured evidence, and null human score fields.
