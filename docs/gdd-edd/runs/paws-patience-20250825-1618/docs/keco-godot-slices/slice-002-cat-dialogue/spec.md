---
version: 1
sliceId: slice-002-cat-dialogue
documentType: spec
createdDate: 2026-08-25
updatedDate: 2026-08-25
status: accepted
latest: true
runId: paws-patience-20260825-1618
sourceDocumentId: b7c65647-36ed-4c73-9634-439755b0ea37
sourceRevision: 2
---

# Slice 002：病弱猫的回应

## 目标

把 Slice 001 的文字反馈升级为可辨认的分支对话：玩家摸摸和喂食时看到不同的玩家台词、猫咪台词、情绪标签和即时反馈，强化“猫咪正在回应我”的玩家感受。

## 范围

包含：病弱猫的摸摸/喂食分支台词、情绪标签、反应文本、状态颜色变化、对话区可读布局和运行时结构化验证。
不包含：新的猫类型、概率公式、庇护所、天气机制、持久化、人工评分结论和数据闭环复审。

## EvalSpec

### eval-201-dialogue-branches

- metricIds: state.dialogue-branches
- sourceRequirement: GDD-四.1 示例对话、五.2-3
- preconditions: cat view, action points available; feed has one fish
- action: invoke feed and pet handlers
- expected: feed and pet each expose distinct dialogue branch identifiers and exact bond/resource transitions
- evidence: KECO_EVAL with current snapshotHash
- passRule: both real handlers produce their own branch and declared values
- manualRequired: false

### eval-202-emotion-feedback

- metricIds: state.emotion-feedback
- sourceRequirement: GDD-二.1、四.1
- preconditions: each dialogue branch completed
- action: inspect handler-produced mood and reaction state
- expected: feed reaches grateful mood; pet reaches trusting mood; reaction text is non-empty
- evidence: KECO_EVAL with current snapshotHash
- passRule: mood and reaction values are produced by real handlers
- manualRequired: false

### eval-203-dialogue-presentation

- metricIds: visual.dialogue-readability, experience.player-fun
- sourceRequirement: GDD-二.1、四.1
- preconditions: startup and one cat interaction
- action: human review of dialogue presentation
- expected: dialogue is calm, readable, cat-focused, and emotionally legible
- passRule: human reviewer decides; no automated pass
- manualRequired: true

## Fixed acceptance boundaries

- Dialogue content is deterministic for the sickly cat in this slice.
- Feed consumes one fish and one action point, adding five bond; pet consumes one action point, adding three bond.
- Mood labels are presentation state only and do not alter gameplay numbers.
- Human scores for art style, player fun, and token efficiency remain null.
