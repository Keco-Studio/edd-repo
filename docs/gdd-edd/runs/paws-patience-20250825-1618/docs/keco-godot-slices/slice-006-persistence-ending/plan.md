---
version: 1
sliceId: slice-006-persistence-ending
documentType: plan
createdDate: 2026-08-25
updatedDate: 2026-08-25
status: accepted
latest: true
runId: paws-patience-20260825-1618
specDocumentId: 0b47897b-b9d5-42c7-a4a3-40ced08b1a77
---

# Slice 006 实施计划

## Allowed files

- `paws_patience/main.gd`
- `progress/paws-patience-20260825-1618.jsonl`
- `result/paws-patience-20260825-1618.json`
- `docs/development-index.md`
- `docs/keco-godot-slices/slice-006-persistence-ending/spec.md`
- `docs/keco-godot-slices/slice-006-persistence-ending/plan.md`
- `docs/keco-godot-slices/slice-006-persistence-ending/plan.validation.json`
- `docs/keco-godot-slices/slice-006-persistence-ending/run-context.json`
- `docs/keco-godot-slices/slice-006-persistence-ending/status.json`
- `docs/keco-godot-slices/slice-006-persistence-ending/eval-report.json`
- `docs/keco-godot-slices/paws-patience-20260825-roadmap/roadmap.md`

## Task checklist

- [ ] task-601: 建立单槽自动存档与安全读取
  - Files: `paws_patience/main.gd`
  - Depends on: none
  - Evaluations: eval-601-save-roundtrip
  - RED: `rg "SAVE_PATH|_save_game|_load_game" paws_patience/main.gd` 无匹配并以退出码 1 结束。
  - Minimal implementation: 增加版本化状态字典、写入、读取和字段校验；评估存档使用独立路径。
  - GREEN: 同一检索找到常量和函数，随后 Godot 运行输出 eval-601 passed。
  - Review: 规格符合性必查；质量复查可合并至 task-602。

- [ ] task-602: 接入不可逆跨日、寿命和两阶段结局
  - Files: `paws_patience/main.gd`
  - Depends on: task-601
  - Evaluations: eval-602-forward-only-day, eval-603-bond-home-ending, eval-604-lifetime-farewell, eval-605-ending-presentation
  - RED: `rg "MAX_CAT_LIFE_DAYS|timeline_revision|ending_state|_update_ending_state" paws_patience/main.gd` 无匹配并以退出码 1 结束。
  - Minimal implementation: 在真实互动与跨日路径中封顶羁绊、推进修订号和寿命、触发回家/告别状态，并在 UI 中显示寿命和结局。
  - GREEN: 检索找到全部状态入口，Godot 运行输出 eval-602、603、604 passed；eval-605 保持 manual_required。
  - Review: 规格和高风险持久化/结局质量复查均必需。

- [ ] task-603: 扩展结构化运行评估且隔离玩家存档
  - Files: `paws_patience/main.gd`
  - Depends on: task-602
  - Evaluations: eval-601-save-roundtrip, eval-602-forward-only-day, eval-603-bond-home-ending, eval-604-lifetime-farewell, eval-605-ending-presentation
  - RED: `rg "eval-601-save-roundtrip|eval-604-lifetime-farewell" paws_patience/main.gd` 无匹配并以退出码 1 结束。
  - Minimal implementation: 保存并恢复内存状态，使用独立评估存档验证磁盘往返，清理评估文件，不触碰正式存档。
  - GREEN: 执行一次 `run_project -> get_debug_output -> stop_project`，解析五条 Slice 006 KECO_EVAL 且无脚本错误。
  - Review: 规格符合性必查；评估隔离作为质量复查项。

- [ ] task-604: 完成文档回读、Claude 独立评价与人工迭代空位
  - Files: `progress/paws-patience-20260825-1618.jsonl`, `result/paws-patience-20260825-1618.json`, `docs/development-index.md`, `docs/keco-godot-slices/slice-006-persistence-ending/spec.md`, `docs/keco-godot-slices/slice-006-persistence-ending/plan.md`, `docs/keco-godot-slices/slice-006-persistence-ending/plan.validation.json`, `docs/keco-godot-slices/slice-006-persistence-ending/run-context.json`, `docs/keco-godot-slices/slice-006-persistence-ending/status.json`, `docs/keco-godot-slices/slice-006-persistence-ending/eval-report.json`, `docs/keco-godot-slices/paws-patience-20260825-roadmap/roadmap.md`
  - Depends on: task-603
  - Evaluations: eval-601-save-roundtrip, eval-602-forward-only-day, eval-603-bond-home-ending, eval-604-lifetime-farewell, eval-605-ending-presentation
  - RED: `Test-Path docs/keco-godot-slices/slice-006-persistence-ending/eval-report.json` 返回 false。
  - Minimal implementation: 记录文件名与文档名、创建 EvalReport、运行 Claude 完成复审、保留三项人工评价为空、更新并回读路线图。
  - GREEN: JSON 解析、计划/运行上下文/Slice 文档/EvalReport 校验器全部通过，Keco 文档名称与 ID 已写入中文索引。
  - Review: 规格和最终质量复查均必需。

## Review gates

- PlanReview：计划校验器通过，并检查每个文件都服务于明确 Eval ID。
- RuntimeEval：只使用 `run_project -> get_debug_output -> stop_project`。
- FinalVerify：Claude 独立评价需求符合度与回归风险；人工评分不代填。
