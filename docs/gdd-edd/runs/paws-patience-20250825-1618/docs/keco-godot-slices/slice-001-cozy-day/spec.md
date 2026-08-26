---
version: 1
sliceId: slice-001-cozy-day
documentType: spec
createdDate: 2026-08-25
updatedDate: 2026-08-25
status: accepted
latest: true
runId: paws-patience-20260825-1618
sourceDocumentId: b7c65647-36ed-4c73-9634-439755b0ea37
sourceRevision: 2
---

# Slice 001：安静的一天

## 目标

完成一个可运行的最小 Paws & Patience 日循环，让玩家看到天气、获取鱼干、前往地点、遇见病弱猫、选择摸摸或喂食、看到羁绊的情绪反馈，并在行动点用尽后平和地进入下一天。

## 范围

包含四个行动点、早/中/晚/凌晨时段、今日与次日天气、地图地点按钮、公司取鱼干、确定性病弱猫事件、摸摸和喂食、羁绊/鱼干/行动点状态、日终转场和柔和治愈视觉。

不包含完整概率公式、三只猫、搭建庇护所、四季变化、长期存档、寿命、结局、数据闭环复审和玩家趣味性结论。

## EvalSpec

### eval-001-startup

- metricIds: state.startup
- sourceRequirement: GDD-一、二
- preconditions: project launches from main scene
- action: launch the project
- expected: title, map, four action points, season, today/tomorrow weather are visible
- evidence: KECO_EVAL record with current snapshotHash, Godot debug output
- passRule: all expected UI state is present and no startup error blocks the scene
- manualRequired: false

### eval-002-work-and-feed

- metricIds: flow.company-fish
- sourceRequirement: GDD-三.2、五.1-2
- preconditions: action points are available
- action: click company
- expected: starting with 2 fish, fish becomes 4 and action points decrease by one; a readable confirmation appears
- evidence: KECO_EVAL record with current snapshotHash
- passRule: fish and action point values match the declared transition
- manualRequired: false

### eval-003-cat-interaction

- metricIds: flow.cat-interaction, state.bond-feedback
- sourceRequirement: GDD-三.3-5、四.1、五.2-3、六.1
- preconditions: player has reached a cat location and has at least one action point
- action: choose pet or feed
- expected: sickly cat appears; pet adds 3 bond and feed adds 5 bond while consuming one fish; action point decreases; cat response text changes
- evidence: KECO_EVAL record with current snapshotHash
- passRule: both branches are available when their resources permit and each exact transition is shown
- manualRequired: false

### eval-004-day-rollover

- metricIds: flow.day-rollover, state.next-day
- sourceRequirement: GDD-五.1、五.7
- preconditions: action points reach zero
- action: finish the current day
- expected: a gentle transition appears, day increments, action points reset to four, and the forecast remains within the declared clear/cloudy set
- evidence: KECO_EVAL record with current snapshotHash
- passRule: rollover state matches the declared transition and no second playable day is required for this slice
- manualRequired: false

### eval-005-visual-experience

- metricIds: visual.cozy-style, experience.player-fun
- sourceRequirement: GDD-一.3-5、二.1
- preconditions: complete startup and one cat interaction
- action: human visual/play experience review
- expected: calm, readable, cat-focused presentation
- passRule: human reviewer decides; no automated pass
- manualRequired: true

## Fixed acceptance boundaries

- The feed path is made exercisable by starting with 2 fish; the company action remains available and grants 2 fish for later repetition.
- Company, pet, feed, and location search each consume exactly 1 action point.
- The first cat encounter is deterministic for this slice; probabilistic encounters are deferred.
- Weather display is deterministic: spring, clear today, cloudy tomorrow; mechanical weather effects are deferred.
- Bond feedback is a short cat reaction and a visible counter change, not future-encounter logic.
