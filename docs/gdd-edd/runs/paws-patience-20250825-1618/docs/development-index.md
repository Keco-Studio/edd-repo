# Paws & Patience 开发索引

这份文件把 Keco 返回的 UUID、开发阶段和本地文件对应起来。阅读进度时先看“可读名称”，只有排查冲突或继续自动化时才需要 UUID。

## 项目入口

后续 Codex 开发与交付必须先阅读根目录 `AGENTS.md`；其中定义了 V1/V2 版本边界、Claude 评价真实性、记录配对、发布包和最终自检门禁。

| 可读名称 | Keco ID / 本地路径 | 用途 |
| --- | --- | --- |
| Keco 项目：test8-24 | `26dec3f7-19a0-4596-b7c5-0eceb1cd98cb` | 本次开发的权威项目 |
| Keco V1 资源文件夹 | `5dbc8b49-0e2b-4f70-bb7d-970b49d25dd7` | 存放 V1 路线图和 Slice 001-007 文档 |
| Keco V2 文件夹 | `0059bc39-8d53-4252-b239-395935947901` | 存放 V2 路线图、版本控制 Slice 和 Slice 008 文档 |
| 原始 GDD：game-gdd | `b7c65647-36ed-4c73-9634-439755b0ea37` | 游戏设计权威来源，当前 revision 2 |
| 开发路线图 | `56a2e34c-a197-4148-96d3-3659a68d2a51` | 七个 Slice 的顺序、依赖和完成状态 |
| 视觉资源表：Visual Assets | `e431f55e-93f6-443c-9d79-ceff078e2f1e` | 登记图片来源、哈希、尺寸、目标路径和 Keco 图片对象 |
| Godot 项目 | `paws_patience/` | 可运行游戏原型 |
| V1 运行过程记录 | `progress/v1/paws-patience-20260825-1618.jsonl` | V1 工具、参数、目的和结果 |
| V2 运行过程记录 | `progress/v2/paws-patience-20260827-cat-type.jsonl` | V2 守护猫猫开发事件 |
| V1 实施计划 | `planning/v1/slice-007-visual-assets.plan.json` | V1 最终 Slice 的独立任务计划 |
| V2 实施计划 | `planning/v2/slice-008-new-cat-type.plan.json` | V2 守护猫猫任务计划 |
| V1 汇总结果 | `result/v1/paws-patience-20260825-1618.json` | V1 评分空位、Token 消耗和最终结论 |
| V2 汇总结果 | `result/v2/paws-patience-20260827-cat-type.json` | V2 Slice 008 实现、运行和人工空位 |
| V2 发布包 | `release/v2/test8-24-v2/test8-24-v2.zip` | 按 V1/V2 分层的交付包 |

## Godot 文件

| 文件名 | 作用 | 当前内容 |
| --- | --- | --- |
| `paws_patience/project.godot` | 项目配置 | 主场景、窗口尺寸和渲染器 |
| `paws_patience/main.tscn` | 主场景 | 挂载 `main.gd` 的根节点 |
| `paws_patience/main.gd` | 游戏主体 | UI、行动点、互动、天气、庇护所、相遇概率和运行时评估 |
| `paws_patience/assets/backgrounds/neighborhood.png` | 地图背景 | 复用 `newPaws` 的 400 x 224 像素地图，按比例裁切填满窗口 |
| `paws_patience/assets/cats/sick-cat.png` | 病弱猫图片 | 复用 `newPaws` 的 136 x 136 正面图，显示在猫咪互动卡片 |
| `data/keco/v1/paws-patience-visual-assets-snapshot/manifest.json` | V1 资源快照清单 | 记录 Keco 表 revision、文件哈希和聚合快照哈希 |
| `data/keco/v2/resource-provenance.json` | V2 资源来源 | 记录 Slice 008 对 V1 猫咪图片的 `reuse_exact` 引用 |

## V1 Slice 文档映射

| Slice | 文档类型 | 可读名称 | Keco 文档 ID | 本地文件 |
| --- | --- | --- | --- | --- |
| Slice 001 基础日循环 | 规格 | `slice-001-cozy-day-spec` | `9d3f11ff-fa60-40d6-9225-d181f967be29` | `docs/keco-godot-slices/v1/slice-001-cozy-day/spec.md` |
| Slice 001 基础日循环 | 计划 | `slice-001-cozy-day-plan` | `70fb366b-c18d-4376-ae51-59bba3e71845` | `docs/keco-godot-slices/v1/slice-001-cozy-day/plan.md` |
| Slice 001 基础日循环 | 状态 | `slice-001-cozy-day-status` | `4bee80c6-013b-41ff-99ee-3558761cd3f4` | `docs/keco-godot-slices/v1/slice-001-cozy-day/status.json` |
| Slice 001 基础日循环 | 评估 | `slice-001-cozy-day-eval-report` | `375e6741-5984-45f3-a8ff-3569797c3267` | `docs/keco-godot-slices/v1/slice-001-cozy-day/eval-report.json` |
| Slice 002 猫咪对话 | 规格 | `slice-002-cat-dialogue-spec` | `0f2e0261-a681-49be-b9af-02df93454393` | `docs/keco-godot-slices/v1/slice-002-cat-dialogue/spec.md` |
| Slice 002 猫咪对话 | 计划 | `slice-002-cat-dialogue-plan` | `c789514e-c373-4f7d-974c-48b116329d65` | `docs/keco-godot-slices/v1/slice-002-cat-dialogue/plan.md` |
| Slice 002 猫咪对话 | 状态 | `slice-002-cat-dialogue-status` | `190daf1a-8791-4fbf-8550-486fb2b67427` | `docs/keco-godot-slices/v1/slice-002-cat-dialogue/status.json` |
| Slice 002 猫咪对话 | 评估 | `slice-002-cat-dialogue-eval-report` | `d1ebd28d-9283-4164-a8a2-27af10d0bbcc` | `docs/keco-godot-slices/v1/slice-002-cat-dialogue/eval-report.json` |
| Slice 003 天气与季节 | 规格 | `slice-003-weather-season-spec` | `ede397bb-9602-472e-a14e-7186ee07e216` | `docs/keco-godot-slices/v1/slice-003-weather-season/spec.md` |
| Slice 003 天气与季节 | 计划 | `slice-003-weather-season-plan` | `bc0187f0-e193-4010-ad67-e34f4c5f40cd` | `docs/keco-godot-slices/v1/slice-003-weather-season/plan.md` |
| Slice 003 天气与季节 | 状态 | `slice-003-weather-season-status` | `3d126f74-cb0d-4dca-b07f-b097470d14f6` | `docs/keco-godot-slices/v1/slice-003-weather-season/status.json` |
| Slice 003 天气与季节 | 评估 | `slice-003-weather-season-eval-report` | `df323c06-81e3-45a4-a711-841bfeddbbe0` | `docs/keco-godot-slices/v1/slice-003-weather-season/eval-report.json` |
| Slice 004 庇护所 | 规格 | `slice-004-shelter-spec` | `6fc89510-6a6f-42f6-97af-9b6f70bfb86a` | `docs/keco-godot-slices/v1/slice-004-shelter/spec.md` |
| Slice 004 庇护所 | 计划 | `slice-004-shelter-plan` | `d5316e89-2ca9-4191-9879-02867d959717` | `docs/keco-godot-slices/v1/slice-004-shelter/plan.md` |
| Slice 004 庇护所 | 状态 | `slice-004-shelter-status` | `878db311-20f1-4415-aa33-f152e9a9591a` | `docs/keco-godot-slices/v1/slice-004-shelter/status.json` |
| Slice 004 庇护所 | 评估 | `slice-004-shelter-eval-report` | `05ec3306-77d5-4930-9246-092ca67e8ea3` | `docs/keco-godot-slices/v1/slice-004-shelter/eval-report.json` |
| Slice 005 相遇概率 | 规格 | `slice-005-encounter-probability-spec` | `5dad9391-58e6-467b-94d0-2e09cfd89411` | `docs/keco-godot-slices/v1/slice-005-encounter-probability/spec.md` |
| Slice 005 相遇概率 | 计划 | `slice-005-encounter-probability-plan` | `6026b743-a3df-4caf-8209-733f35a24095` | `docs/keco-godot-slices/v1/slice-005-encounter-probability/plan.md` |
| Slice 005 相遇概率 | 状态 | `slice-005-encounter-probability-status` | `49503c15-56cf-4969-861f-9e07e072a91c` | `docs/keco-godot-slices/v1/slice-005-encounter-probability/status.json` |
| Slice 005 相遇概率 | 评估 | `slice-005-encounter-probability-eval-report` | `51a35ccc-4474-4e29-affb-e4bf17f3461e` | `docs/keco-godot-slices/v1/slice-005-encounter-probability/eval-report.json` |
| Slice 006 存档与结局 | 规格 | `slice-006-persistence-ending-spec` | `0b47897b-b9d5-42c7-a4a3-40ced08b1a77` | `docs/keco-godot-slices/v1/slice-006-persistence-ending/spec.md` |
| Slice 006 存档与结局 | 计划 | `slice-006-persistence-ending-plan` | `6264a3b6-4728-4791-807f-472164e7a759` | `docs/keco-godot-slices/v1/slice-006-persistence-ending/plan.md` |
| Slice 006 存档与结局 | 状态 | `slice-006-persistence-ending-status` | `a7f5c377-51c1-412a-b8ca-1d1354e7ea39` | `docs/keco-godot-slices/v1/slice-006-persistence-ending/status.json` |
| Slice 006 存档与结局 | 评估 | `slice-006-persistence-ending-eval-report` | `c7344e8d-81bd-46a3-8ecd-e7f65bad270e` | `docs/keco-godot-slices/v1/slice-006-persistence-ending/eval-report.json` |
| Slice 007 同款视觉资源 | 规格 | `slice-007-visual-assets-spec` | `8cff675e-529a-471f-8d9c-46bbc534a78f` | `docs/keco-godot-slices/v1/slice-007-visual-assets/spec.md` |
| Slice 007 同款视觉资源 | 计划 | `slice-007-visual-assets-plan` | `d2d7e158-b0ed-47ef-b0e2-509708567f2f` | `docs/keco-godot-slices/v1/slice-007-visual-assets/plan.md` |
| Slice 007 同款视觉资源 | 状态 | `slice-007-visual-assets-status` | `bd93dddd-1c98-4113-b878-7ae14ce6cd92` | `docs/keco-godot-slices/v1/slice-007-visual-assets/status.json` |
| Slice 007 同款视觉资源 | 评估 | `slice-007-visual-assets-eval-report` | `18337013-8d03-4e6e-9884-8440ee9114dc` | `docs/keco-godot-slices/v1/slice-007-visual-assets/eval-report.json` |

## V2 Slice 文档映射

| Slice | 文档类型 | 可读名称 | Keco 文档 ID | 本地文件 |
| --- | --- | --- | --- | --- |
| V2 版本控制 | 状态 | `slice-v2-version-control-status` | Keco V2 Folder 内权威文档 | `docs/keco-godot-slices/v2/slice-v2-version-control/status.json` |
| V2 版本控制 | 计划 | `slice-v2-version-control-plan` | `20b696a7-f31c-4524-bdac-67275ea87e51` | `planning/v2/slice-v2-version-control.plan.json` |
| Slice 008 守护猫猫 | 规格 | `slice-008-new-cat-type-spec` | `dbdc4f3d-1817-4bb1-b24d-e6fcb37ba904` | `docs/keco-godot-slices/v2/slice-008-new-cat-type/spec.md` |
| Slice 008 守护猫猫 | 计划 | `slice-008-new-cat-type-plan` | `f0eaa3da-005a-4f2e-855d-9c87c1c9dd4d` | `docs/keco-godot-slices/v2/slice-008-new-cat-type/plan.md` |
| Slice 008 守护猫猫 | 状态 | `slice-008-new-cat-type-status` | `0e98a4a8-105b-468e-8dbc-5d1867b54974` | `docs/keco-godot-slices/v2/slice-008-new-cat-type/status.json` |
| Slice 008 守护猫猫 | 评估 | `slice-008-new-cat-type-eval-report` | `601cbe7d-011f-4603-bf25-0002fe8844c5` | `docs/keco-godot-slices/v2/slice-008-new-cat-type/eval-report.json` |

## 评价字段

每轮 Claude 评价记录 `verdict`、`findings`、`risks` 和实际 Token 使用量。以下人工字段始终由人填写，自动流程保持空值：

```json
{
  "artStyle": {"score": null, "comment": null, "nextIteration": null},
  "playerFun": {"score": null, "comment": null, "nextIteration": null},
  "tokenEfficiency": {"score": null, "comment": null, "nextIteration": null}
}
```
