---
version: 1
sliceId: slice-004-shelter
documentType: spec
createdDate: 2026-08-25
updatedDate: 2026-08-25
status: accepted
latest: true
runId: paws-patience-20260825-1618
sourceDocumentId: b7c65647-36ed-4c73-9634-439755b0ea37
sourceRevision: 2
---

# Slice 004：给它一个窝

## 目标

实现四种庇护所的可选择建造动作，让玩家看到“为它留下一个地方”的长期意图，并按 GDD 为建造增加羁绊。

## 范围

包含：纸箱、厚外套、旧毛衣、废弃轮胎四种类型；建造消耗 1 AP、羁绊 +20；当前庇护所显示和即时猫咪反馈；真实 handler 结构化验证。
不包含：庇护所耐候计算、猫留存概率、材料随机掉落、存档和人工评分结论。

## EvalSpec

### eval-401-shelter-options
- metricIds: state.shelter-options
- expected: all four shelter types are declared and selectable
- evidence: KECO_EVAL with current snapshotHash
- manualRequired: false

### eval-402-shelter-build
- metricIds: flow.shelter-build
- expected: building one shelter consumes 1 AP and adds 20 bond
- evidence: KECO_EVAL with current snapshotHash
- manualRequired: false

### eval-403-shelter-feedback
- metricIds: state.shelter-feedback
- expected: real build handler changes current shelter and reaction text
- evidence: KECO_EVAL with current snapshotHash
- manualRequired: false

### eval-404-shelter-presentation
- metricIds: visual.shelter-readability, experience.player-fun
- expected: human review of shelter choice and feedback
- manualRequired: true

## Fixed acceptance boundaries

- Shelters are stateful presentation plus bond/AP transition only.
- Weather resistance and encounter probability remain deferred.
- Human scores artStyle/playerFun/tokenEfficiencyReview remain null.
