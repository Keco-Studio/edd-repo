---
version: 1
sliceId: slice-007-visual-assets
documentType: plan
createdDate: 2026-08-26
updatedDate: 2026-08-26
status: accepted
latest: true
runId: paws-patience-20260826-visual-assets
specDocumentId: 8cff675e-529a-471f-8d9c-46bbc534a78f
---

# Slice 007 实施计划

## Allowed files

- paws_patience/assets/backgrounds/neighborhood.png
- paws_patience/assets/backgrounds/neighborhood.png.import
- paws_patience/assets/cats/sick-cat.png
- paws_patience/assets/cats/sick-cat.png.import
- paws_patience/main.gd
- paws_patience/main.gd.uid
- data/keco/paws-patience-visual-assets-snapshot/manifest.json
- data/keco/paws-patience-visual-assets-snapshot/tables/visual-assets.json
- planning/slice-007-visual-assets.plan.json
- progress/paws-patience-20260825-1618.jsonl
- result/paws-patience-20260825-1618.json
- docs/development-index.md
- docs/keco-godot-slices/slice-007-visual-assets/spec.md
- docs/keco-godot-slices/slice-007-visual-assets/plan.md
- docs/keco-godot-slices/slice-007-visual-assets/plan.validation.json
- docs/keco-godot-slices/slice-007-visual-assets/run-context.json
- docs/keco-godot-slices/slice-007-visual-assets/status.json
- docs/keco-godot-slices/slice-007-visual-assets/eval-report.json
- docs/keco-godot-slices/paws-patience-20260825-roadmap/roadmap.md

## Task checklist

- [ ] task-701: 在 Keco 登记并物化同款图片
  - Files: paws_patience/assets/backgrounds/neighborhood.png, paws_patience/assets/backgrounds/neighborhood.png.import, paws_patience/assets/cats/sick-cat.png, paws_patience/assets/cats/sick-cat.png.import, data/keco/paws-patience-visual-assets-snapshot/manifest.json, data/keco/paws-patience-visual-assets-snapshot/tables/visual-assets.json
  - Depends on: none
  - Evaluations: eval-701-visual-assets-loaded
  - RED: Test-Path paws_patience/assets/backgrounds/neighborhood.png; Test-Path paws_patience/assets/cats/sick-cat.png 均返回 false。
  - Minimal implementation: 创建首个兼容资产登记表，以 Asset Key 稳定键写入两条 planned 记录；上传并回读图片对象、哈希和尺寸后标记 ready，再把精确字节物化到目标路径并导出确定性快照。
  - GREEN: Get-FileHash 与规格中的两个 SHA-256 精确匹配，Keco 两条记录均为 ready，快照校验通过。
  - Review: 规格符合性和资源来源质量复查均必需。

- [ ] task-702: 接入地图背景和病弱猫图片
  - Files: paws_patience/main.gd, paws_patience/main.gd.uid
  - Depends on: task-701
  - Evaluations: eval-701-visual-assets-loaded, eval-702-visual-presentation
  - RED: rg "MAP_BACKGROUND|SICK_CAT_TEXTURE|_draw_background_cover|cat_portrait" paws_patience/main.gd 无匹配并以退出码 1 结束。
  - Minimal implementation: 预加载已验证纹理，以保持宽高比的 cover 裁切绘制地图，增加暗色可读性遮罩，在病弱猫卡片内显示最近邻采样图片，并增加中文注释。
  - GREEN: 静态检索找到四个集成点；Godot 无界面启动无脚本错误；运行输出 eval-701 passed，eval-702 保持 manual_required。
  - Review: 规格符合性必查；视觉层级、裁切和回归风险质量复查必需。

- [ ] task-703: 完成运行回归、文档回读和人工评价空位
  - Files: planning/slice-007-visual-assets.plan.json, progress/paws-patience-20260825-1618.jsonl, result/paws-patience-20260825-1618.json, docs/development-index.md, docs/keco-godot-slices/slice-007-visual-assets/spec.md, docs/keco-godot-slices/slice-007-visual-assets/plan.md, docs/keco-godot-slices/slice-007-visual-assets/plan.validation.json, docs/keco-godot-slices/slice-007-visual-assets/run-context.json, docs/keco-godot-slices/slice-007-visual-assets/status.json, docs/keco-godot-slices/slice-007-visual-assets/eval-report.json, docs/keco-godot-slices/paws-patience-20260825-roadmap/roadmap.md
  - Depends on: task-702
  - Evaluations: eval-701-visual-assets-loaded, eval-702-visual-presentation, Slice 001-006 objective regressions
  - RED: Test-Path docs/keco-godot-slices/slice-007-visual-assets/eval-report.json 返回 false。
  - Minimal implementation: 执行一次有界 Godot 运行批次，记录全部客观回归和手工边界，创建并回读 status/eval-report，更新路线图和可读 Progress，三项人工评价全部保持 null。
  - GREEN: 计划、运行上下文、Slice 文档、EvalReport 和快照校验器通过；Keco 文档回读一致；运行日志无脚本错误。
  - Review: 规格符合性和最终回归风险复查均必需。

## Review gates

- PlanReview：JSON 计划校验器通过；文件范围只覆盖资源、视觉接入、证据和既有进度。
- RuntimeEval：只使用 run_project -> get_debug_output -> stop_project。
- FinalVerify：检查需求符合度与回归风险；当前环境若无 Claude 工具，记录为不可用，不伪造评价；人工评分不代填。
