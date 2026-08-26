---
sliceId: slice-v2-version-control
documentType: plan
createdDate: 2026-08-26
updatedDate: 2026-08-27
status: accepted
latest: true
---

# V2 Version Control Plan

Authoritative Keco document: `20b696a7-f31c-4524-bdac-67275ea87e51`.

- [x] task-01: Create the complete V1/V2 local directory layout
  - Files: `progress/`, `planning/`, `result/`, `data/keco/`, `docs/keco-godot-slices/`, `review-dashboard/`, `release/`
  - Depends on: none
- [x] task-02: Write the V2 ledger and preserve V1 evidence
  - Files: `progress/v2/**`, `result/v2/**`, `data/keco/v2/**`, `docs/keco-godot-slices/v2/**`
  - Depends on: task-01
- [x] task-03: Package and verify the V2 handoff
  - Files: `release/v1/**`, `release/v2/**`
  - Depends on: task-02

The executable local plan is `planning/v2/slice-v2-version-control.plan.json`.
