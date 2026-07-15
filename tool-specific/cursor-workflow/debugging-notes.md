# Debugging Notes — Requirement Deviations & Fixes

Document any deviations from [spec.md](./spec.md) or [tasks.md](./tasks.md), why they occurred, and how they were resolved.

## Format

| Date | Deviation | Reason | Resolution | Spec Updated? |
|------|-----------|--------|------------|-----------------|
| — | — | — | — | — |

---

## Entries

| Date | Deviation | Reason | Resolution | Spec Updated? |
|------|-----------|--------|------------|---------------|
| 2026-07-14 | Entity field rename (`displayName`→`name`, `assignee`→`assignedTo`, Comment as separate collection with `message`) | Assessment entity spec alignment | Updated models, routes, UI, tests, `spec.md` | Yes |

---

## Guidelines

1. If implementation differs from spec, log it here **before** or **when** making the change.
2. If the deviation is permanent, update `spec.md` and link the commit/PR.
3. If temporary (debugging only), note the revert plan.
