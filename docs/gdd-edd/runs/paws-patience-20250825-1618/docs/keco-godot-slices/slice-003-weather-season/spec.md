---
version: 1
sliceId: slice-003-weather-season
documentType: spec
createdDate: 2026-08-25
updatedDate: 2026-08-25
status: accepted
latest: true
runId: paws-patience-20260825-1618
sourceDocumentId: b7c65647-36ed-4c73-9634-439755b0ea37
sourceRevision: 2
---

# Slice 003：会变化的天气

## 目标

让天气与季节影响一个游戏日的行动点，并在每天开始明确展示今日与次日预报。

## 范围

包含：春夏秋冬季节标签、晴/多云/阴雨/暴雨/雪天气序列、暴雨和雪将行动点降到 3、日终后切换天气与季节、天气影响的结构化验证。
不包含：庇护所效果、概率公式、长期存档、人工评分和数据闭环复审。

## EvalSpec

### eval-301-weather-startup
- metricIds: state.weather-season
- expected: season, today weather, next weather are declared and visible
- evidence: KECO_EVAL with current snapshotHash
- manualRequired: false

### eval-302-severe-weather-ap
- metricIds: flow.weather-action-points
- expected: clear/cloudy = 4 AP; storm/snow = 3 AP
- evidence: KECO_EVAL with current snapshotHash
- manualRequired: false

### eval-303-day-weather-advance
- metricIds: flow.weather-rollover
- expected: real rollover promotes forecast and applies severe-weather AP
- evidence: KECO_EVAL with current snapshotHash
- manualRequired: false

### eval-304-weather-presentation
- metricIds: visual.weather-readability, experience.player-fun
- expected: human review of readable forecast and weather change
- manualRequired: true

## Fixed acceptance boundaries

- Deterministic weather sequence only; shelter and encounter probability are deferred.
- Human scores artStyle/playerFun/tokenEfficiencyReview remain null.
