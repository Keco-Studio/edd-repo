---
version: 1
sliceId: slice-007-visual-assets
documentType: spec
createdDate: 2026-08-26
updatedDate: 2026-08-26
status: accepted
latest: true
runId: paws-patience-20260826-visual-assets
sourceDocumentId: b7c65647-36ed-4c73-9634-439755b0ea37
sourceRevision: 2
---

# Slice 007：同款视觉资源接入

## 目标

复用同款游戏 newPaws 已存在的像素地图背景和病弱猫正面图，让当前 paws_patience 从纯代码剪影升级为有实际图片的可玩界面，同时保持六个既有 Slice 的玩法和存档行为不变。

## 来源与范围

- 用户指令：newPaws 的图片可以作为同款游戏的参考和资源来源。
- 地图源文件：C:/Users/lenovo/Desktop/newPaws/assets/generated/day1/map-background.png
  - 400 x 224
  - sha256:a1bf531672631d8c09434b152f66d2cd905c7a41c69abc1e1f5b1d9cfb0668cd
- 病弱猫源文件：C:/Users/lenovo/Desktop/newPaws/assets/generated/day1/sick-cat/south.png
  - 136 x 136
  - sha256:3a3f4c25ad8eb0b94615b3da3ba9113d3747fe04eea8af39073095497f167bd5
- 包含：Keco 资产登记、哈希验证、本地 Godot 投影、背景覆盖绘制、病弱猫图片展示、运行回归。
- 不包含：重新调用 PixelLab、生成新图片、迁移完整 newPaws UI、添加新玩法、接入尚未实际展示的另外两只猫。

## 资源演进

~~~yaml
evolution:
  strategy: reuse_exact
  targetTableId: null
  targetResourcePaths:
    - res://assets/backgrounds/neighborhood.png
    - res://assets/cats/sick-cat.png
  stableMatchKey: Asset Key
  discoveryEvidence:
    - Keco 项目 test8-24 当前 tables 为空，没有兼容资产表
    - 当前 Godot 项目 assets 数量为 0，没有可扩展纹理资源
  noCompatibleTarget: true
  reason: 首次建立项目级视觉资产登记；图片字节直接复用同款游戏现有文件
~~~

PixelLab operationProfile 为 not_required：本 Slice 不生成、不编辑图片，不产生 PixelLab 费用。

## EvalSpec

### eval-701-visual-assets-loaded

- 类型：asset_integrity
- 前置条件：从 Keco 回读已就绪的两个资产记录并物化到目标路径。
- 动作：Godot 启动时读取两个纹理，检查文件哈希和纹理尺寸。
- 期望：背景为 400 x 224 且哈希精确匹配；猫图为 136 x 136 且哈希精确匹配。
- 证据：当前 Godot 进程输出的 KECO_EVAL，携带当前 Keco 快照哈希。
- manualRequired: false

### eval-702-visual-presentation

- 类型：visual
- 前置条件：打开地图视图和病弱猫互动视图。
- 动作：人工查看背景裁切、卡片可读性、猫图清晰度和整体风格。
- 期望：背景不拉伸变形，文字和按钮保持可读，猫图不模糊或遮挡交互。
- 证据：人工评价预留位。
- manualRequired: true

### 既有回归

Slice 001-006 的客观 KECO_EVAL 必须在同一次运行中继续通过；已有人工项目继续保持 manual_required。

## 人工评价预留

~~~json
{
  "artStyle": {"score": null, "comment": null, "nextIteration": null},
  "playerFun": {"score": null, "comment": null, "nextIteration": null},
  "tokenEfficiency": {"score": null, "comment": null, "nextIteration": null}
}
~~~
