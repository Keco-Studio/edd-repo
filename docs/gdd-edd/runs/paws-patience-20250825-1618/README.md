# test8-24 V1/V2 EDD 运行归档

这是 Keco 项目 `test8-24` 的版本化开发归档。V1 是只读基线和记录范式，V2 是当前开发版本。

## 内容

- `progress/v1/`、`progress/v2/`：Markdown 可读记录和 JSONL 机器事件。
- `planning/v1/`、`planning/v2/`：对应版本的 Slice 计划。
- `result/v1/`、`result/v2/`：运行汇总、Claude 评价和人工评分空位。
- `docs/keco-godot-slices/v1/`、`docs/keco-godot-slices/v2/`：路线图、规格、计划、状态和 EvalReport。
- `docs/keco-game-evaluations/`：锁定 profile、Claude 原始评价、规范化证据和已校验高层报告。
- `data/keco/v1/`、`data/keco/v2/`：资源快照和 V2 provenance。
- `paws_patience/`：共享 Godot 项目源代码与资源。
- `release/v2/test8-24-v2/`：包含 V1/V2 记录和评价证据的 V2 发布包。
- `AGENTS.md`：后续 Codex 必须遵守的项目级交付约束。

## 当前评价边界

V2 Slice 008 的机器评价由 Claude Code CLI 2.1.152 实际执行，覆盖率为 `7/8`，报告状态为 `partial`；由于一个固定子项 `not_evaluated` 且视觉展示仍需人工确认，不生成完整 100 分总分。人工评价字段保持 `null`，不与 Claude 评价合并。
