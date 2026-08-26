---
sliceId: slice-008-new-cat-type
documentType: plan
createdDate: 2026-08-27
updatedDate: 2026-08-27
status: accepted
latest: true
---

# Slice 008 Plan

- [ ] task-801: Add Guardian Stray state and profile
  - Files: `paws_patience/main.gd`
  - Depends on: none
  - Serves evaluations: `eval-801-cat-profile`
  - RED: source assertion fails before `guardian_stray` and `cat_type` exist.
  - Minimal implementation: add stable profile constants and display helpers without changing V1 defaults.
  - GREEN: source assertion passes and the default profile remains sickly.
  - Review: required
- [ ] task-802: Integrate Guardian Stray encounter and interaction modifiers
  - Files: `paws_patience/main.gd`
  - Depends on: task-801
  - Serves evaluations: `eval-802-guardian-interaction`, `eval-803-guardian-probability`
  - RED: source assertion fails before the third-Street gate exists.
  - Minimal implementation: count daily Street visits, isolate the Guardian gate, and use explicit deltas and dialogue.
  - GREEN: runtime `KECO_EVAL` passes Guardian encounter, bond, dialogue, and probability checks.
  - Review: required
- [ ] task-803: Persist Guardian Stray and protect V1 regressions
  - Files: `paws_patience/main.gd`, `progress/v2/**`, `planning/v2/**`, `result/v2/**`, `docs/keco-godot-slices/v2/slice-008-new-cat-type/**`
  - Depends on: task-802
  - Serves evaluations: `eval-804-guardian-save`, `eval-805-v1-regression`
  - RED: save-state assertion fails before `catType` migration exists.
  - Minimal implementation: persist the type and location counter, add V2 evidence, and update mirrors.
  - GREEN: save roundtrip and all prior objective `KECO_EVAL` records pass.
  - Review: required

## Local Version Layout

The accepted plan mirror is `planning/v2/slice-008-new-cat-type.plan.json`. V1 and V2 planning, progress, result, and Slice documents use matching version folders. This revision changes artifact paths only; tasks and acceptance behavior are unchanged.
