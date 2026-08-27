# Paws & Patience V2 地图探索开发记录

## 目标

把当前“背景图 + 地点按钮”的入口改为可移动的俯视地图探索：玩家在地图上移动，靠近公司、巷尾、街道、公园后执行交互，并继续复用现有猫咪互动、天气、羁绊、庇护所、存档与结局逻辑。

## 权威来源

- Keco 项目：test8-24（Project ID 26dec3f7-19a0-4596-b7c5-0eceb1cd98cb）
- Keco V2 Folder：0059bc39-8d53-4252-b239-395935947901
- GDD：game-gdd revision 2
- 用户确认：2026-08-27，先完成地图探索并提供可玩效果
- Godot 项目：paws_patience/，Godot 4.7
- 开始时 main.gd：sha256:195f7fadbecc5c359c2072559da309625ea800f54a242dc19f6c7a187e815266

## 范围

- 新增地图探索场景与玩家控制器。
- 复用现有 400 x 224 社区地图，不调用 PixelLab，不产生费用。
- 地图移动不消耗行动点；地点确认继续调用现有公司/地点逻辑。
- 本 Slice 不调整相遇概率、互动行动点和猫咪数值。
- 保存并迁移玩家地图位置，旧存档使用默认出生点。

## 成功标准

- 玩家可用方向键或 WASD 在地图中移动。
- 靠近四个地点时出现提示，按 E/Enter/Space 触发对应现有逻辑。
- 地图状态、地点触发和存档迁移有新的结构化 KECO_EVAL。
- 现有 V1/V2 客观评估全部回归通过，视觉体验保留人工确认。
- planning、progress、result、Slice 文档、Keco read-back 和 V2 发布包同步。

## 当前状态

- 当前 Slice：slice-009-map-exploration
- 状态：实现中；task-901 独立场景已通过，task-902 RED 已确认
- PixelLab：not_required
- 运行记录：task-901 第一次遇到新 class_name 类型缓存错误，第二次遇到 Variant 类型推断错误；两次修复后第三次场景运行无错误。
- 下一步：把探索地图接入主场景，重排 HUD 与相遇面板，并运行新旧评估。
