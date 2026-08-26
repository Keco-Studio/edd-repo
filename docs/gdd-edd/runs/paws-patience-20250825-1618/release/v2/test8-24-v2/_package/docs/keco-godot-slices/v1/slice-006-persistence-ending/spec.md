---
version: 1
sliceId: slice-006-persistence-ending
documentType: spec
createdDate: 2026-08-25
updatedDate: 2026-08-25
status: accepted
latest: true
runId: paws-patience-20260825-1618
sourceDocumentId: b7c65647-36ed-4c73-9634-439755b0ea37
sourceRevision: 2
---

# Slice 006：不可逆时间、存档与羁绊结局

## 目标

把 GDD 中“时间线不可回溯、小猫随时间老去、羁绊满值后跟玩家回家并陪伴到生命结束”收敛为可运行、可保存和可验证的原型闭环。

## 原型规则

- 单一自动存档槽：`user://paws_patience_save.json`。
- 启动时自动读取；每次消耗行动点后的稳定状态、跨日和结局变化后自动覆盖。
- 游戏界面不提供存档选择、手动读取或回退入口；这是正常交互范围内的不可逆，不承诺防止直接篡改本地文件。
- `SAVE_VERSION = 1`，不兼容或损坏的存档不会覆盖默认状态。
- `MAX_CAT_LIFE_DAYS = 12` 是待人工迭代的原型参数；每次跨日减少 1。
- 羁绊上限和回家结局阈值均为 GDD 明确值 `150`。
- 羁绊达到 150 时进入“回家陪伴”；寿命归零时进入“温柔告别”，此后不再允许普通互动。
- 自动运行评估使用独立测试存档，不覆盖玩家正式存档。

## 范围

包含：状态序列化、单槽自动存档、自动读取、向前推进的时间修订号、寿命递减、150 羁绊结局、寿命归零结局、界面状态提示、结构化运行验证和人工评价空位。

不包含：云存档、防篡改、多个存档槽、往生回响随机判定、三只猫独立生命周期、最终数值平衡和数据闭环复审。

## EvalSpec

### eval-601-save-roundtrip

- 类型：state
- 前置条件：独立评估存档不存在；建立 day=4、fish=7、bond=42、life=9 的测试状态。
- 动作：写入独立评估存档，重置内存，再从该文件读取。
- 期望：版本、时间修订号和全部关键状态精确恢复。
- 证据：当前 Godot 进程输出的 `KECO_EVAL`。
- manualRequired: false

### eval-602-forward-only-day

- 类型：flow
- 前置条件：day=4、life=9、timelineRevision=7、行动点耗尽。
- 动作：调用真实跨日逻辑。
- 期望：day=5、life=8、timelineRevision=8。
- 证据：当前 Godot 进程输出的 `KECO_EVAL`。
- manualRequired: false

### eval-603-bond-home-ending

- 类型：flow
- 前置条件：bond=147、fish=1、小猫在世且尚未回家。
- 动作：调用真实喂食交互。
- 期望：bond 封顶为 150、endingState=home、adopted=true，并出现回家文本。
- 证据：当前 Godot 进程输出的 `KECO_EVAL`。
- manualRequired: false

### eval-604-lifetime-farewell

- 类型：flow
- 前置条件：已回家、life=1。
- 动作：调用真实跨日逻辑。
- 期望：life=0、catAlive=false、endingState=farewell，互动被禁止。
- 证据：当前 Godot 进程输出的 `KECO_EVAL`。
- manualRequired: false

### eval-605-ending-presentation

- 类型：experience
- 前置条件：分别查看回家和告别状态。
- 动作：人工体验界面文字、节奏和情绪。
- 期望：状态清楚、文本温和、没有误导性的回档入口。
- 证据：人工评价预留位。
- manualRequired: true

## 人工评价预留

```json
{
  "artStyle": {"score": null, "comment": null, "nextIteration": null},
  "playerFun": {"score": null, "comment": null, "nextIteration": null},
  "tokenEfficiency": {"score": null, "comment": null, "nextIteration": null}
}
```

Claude 可以评价实现符合度、风险和可读性，但不能代填人工分数。寿命 12 天必须作为待调整常量保留。
