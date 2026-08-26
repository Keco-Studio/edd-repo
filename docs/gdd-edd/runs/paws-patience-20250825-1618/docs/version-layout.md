# test8-24 本地版本布局

V1 是只读基线，V2 是当前开发版本。所有运行产物按相同范式分开：

```text
progress/v1/                         V1 Markdown + JSONL
progress/v2/                         V2 Markdown + JSONL
planning/v1/                         V1 Slice 计划
planning/v2/                         V2 Slice 计划
result/v1/                           V1 汇总结果
result/v2/                           V2 汇总结果
data/keco/v1/                        V1 权威资源快照
data/keco/v2/                        V2 reuse_exact 来源记录
docs/keco-godot-slices/v1/           V1 roadmap + Slice 001-007
docs/keco-godot-slices/v2/           V2 roadmap + 版本控制 Slice + Slice 008
review-dashboard/v1/                 V1 人工评价界面
review-dashboard/v2/                 V2 人工评价状态说明
release/v1/                          V1 未单独打包的说明
release/v2/test8-24-v2/              V2 发布包与 manifest
```

以下路径是共享运行源，不复制成两个会分叉的版本：

- `paws_patience/`：当前可运行 Godot 项目；版本变化由 progress、result、Keco revision 和 SHA256 记录。
- `data/keco/v1/paws-patience-visual-assets-snapshot/`：V1 创建的已验证 Keco 资源快照。
- `data/keco/v2/resource-provenance.json`：V2 对 V1 快照的 `reuse_exact` 引用，不复制资源字节。

Keco 中的权威版本边界：

- V1 Folder：`Resources Folder` (`5dbc8b49-0e2b-4f70-bb7d-970b49d25dd7`)
- V2 Folder：`V2` (`0059bc39-8d53-4252-b239-395935947901`)

`release/archive/test8-24-v2-flat-before-versioning/` 保存本次整理前的旧扁平 staging，仅用于追溯，不是当前发布源。
