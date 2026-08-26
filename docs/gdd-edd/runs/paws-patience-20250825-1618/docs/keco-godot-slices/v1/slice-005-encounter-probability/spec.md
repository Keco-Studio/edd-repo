---
version: 1
sliceId: slice-005-encounter-probability
documentType: spec
createdDate: 2026-08-25
updatedDate: 2026-08-25
status: accepted
latest: true
runId: paws-patience-20260825-1618
sourceDocumentId: b7c65647-36ed-4c73-9634-439755b0ea37
sourceRevision: 2
---

# Slice 005：缘分预览

## 目标

把 GDD 的猫类型、地点和羁绊公式收敛为一个可解释的相遇概率预览。

## 范围

包含三种猫类型权重、三处地点权重、天气/季节修正、羁绊和庇护所加成、1%-95%封顶、地图预览文字和结构化验证。
不包含随机抽样、三只猫同时存在、重逢衰减、寿命、存档和人工评分结论。

## EvalSpec

### eval-501-probability-bounds
- metricIds: state.encounter-probability
- expected: probability is clamped to 1%-95%
- manualRequired: false

### eval-502-bond-shelter-modifier
- metricIds: state.encounter-modifiers
- expected: higher bond and shelter increase preview probability
- manualRequired: false

### eval-503-probability-presentation
- metricIds: visual.probability-readability, experience.player-fun
- expected: human review
- manualRequired: true

## Fixed acceptance boundaries

- Preview is deterministic and informational; encounter remains deterministic.
- No random number generator or persistence is introduced.
- Human scores remain null.
