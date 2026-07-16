# Debugging Notes — Requirement Deviations & Fixes

Document deviations from [spec.md](./spec.md) or [tasks.md](./tasks.md), and detailed issue investigations encountered during development of the Support Ticket Management System.

**Implementation workflow references:**

- [submission-index.md](./submission-index.md) — assessor entry point
- [tool-workflow.md](./tool-workflow.md) — narrative AI workflow
- [prompt-history.md](./prompt-history.md) — AI prompts that led to fixes documented here
- [api-contract.md](../../implementation-workflow/api-contract.md) — canonical API contract
- [test-strategy.md](../../implementation-workflow/test-strategy.md) — test coverage and gaps
- [acceptance-criteria.md](./acceptance-criteria.md) — definitions of done

---

## Requirement Deviation Log

Log any permanent or temporary deviations from the spec before or when making the change.

| Date | Deviation | Reason | Resolution | Spec Updated? |
|------|-----------|--------|------------|---------------|
| 2026-07-14 | Entity field rename (`displayName`→`name`, `assignee`→`assignedTo`, Comment as separate collection with `message`) | Assessment entity spec alignment | Updated models, routes, UI, tests, `spec.md` | Yes |
| 2026-07-14 | Split status changes into dedicated `PATCH /tickets/:id/status` endpoint | State machine must not be bypassable via generic PATCH | Generic PATCH rejects `status` field with `400`; status endpoint enforces transitions | Yes |
| 2026-07-14 | Evaluation prompt referenced `PUT /api/tickets/:id`; implementation uses `PATCH` + `/api/v1` prefix | REST semantics and API versioning | Documented in [api-contract.md](../../implementation-workflow/api-contract.md) with mapping note | Yes |

### Guidelines

1. If implementation differs from spec, log it here **before** or **when** making the change.
2. If the deviation is permanent, update `spec.md` and link the commit/PR.
3. If temporary (debugging only), note the revert plan.
4. For deep investigations, add a detailed issue entry below using the Issue template.

---

## Issue 1: Entity Field Naming Mismatch with Assessment Spec

### Problem

Early implementation used different field names than the assessment entity specification:

| Assessment spec | Initial implementation |
|-----------------|------------------------|
| `name` | `displayName` |
| `assignedTo` | `assignee` |
| Comment `message` (separate collection) | Embedded subdocument with `body` |

This caused API response shape mismatches between backend routes, frontend `api/client.js`, and integration test assertions. The ticket detail page showed `undefined` for assignee names, and comment creation failed silently in some flows.

### How I Investigated

1. Compared Mongoose model fields in `backend/src/models/` against `spec.md` entity tables.
2. Ran `cd backend && npm test` — entity shape tests in `tickets.test.js` failed on `createdBy.name` and `assignedTo` population.
3. Inspected network tab on ticket detail page — API returned `assignedTo: { name: "..." }` but frontend referenced `ticket.assignee`.
4. Grepped the codebase for `displayName`, `assignee`, and `body` to find all stale references.

### How AI Helped

- Prompted Cursor to align all models, routes, seed script, frontend pages, and tests to the spec entity definitions in a single coordinated pass.
- Asked AI to generate a deviation log entry in this file before making changes (spec-first workflow).
- Used AI to update `spec.md` and cross-linked acceptance criteria after the rename was confirmed.

### What I Validated

- [ ] `npm test` in backend passes with updated entity shape assertions
- [ ] `GET /api/v1/tickets/:id` returns populated `assignedTo` and `createdBy` with `name`, `email`, `role`
- [ ] Frontend detail page displays assignee name correctly
- [ ] Comments use `message` field end-to-end (create form → API → list render)
- [ ] Seed script creates tickets with `assignedTo` references, not `assignee`

### Final Fix

Renamed fields across the full stack:

- `User.displayName` → `User.name`
- `Ticket.assignee` → `Ticket.assignedTo`
- `Comment.body` → `Comment.message` (separate `comments` collection, not embedded)
- Updated `spec.md`, routes, `TicketListPage.jsx`, `TicketDetailPage.jsx`, `CreateTicketPage.jsx`, seed script, and all integration tests.

Logged in deviation table above (2026-07-14, `Spec Updated? Yes`).

---

## Issue 2: Status Changes Bypassing the State Machine

### Problem

Initial ticket update endpoint accepted `status` in the `PATCH /api/v1/tickets/:id` request body, allowing clients to jump directly from `open` to `resolved` or `closed` without enforcing the transition graph.

### How I Investigated

1. Read AC-6 in acceptance criteria: "Status changes only through valid transitions."
2. Manually sent `PATCH /api/v1/tickets/:id` with `{ "status": "closed" }` — ticket closed successfully from `open` state.
3. Reviewed `ticketStateMachine.js` — module existed but was only called from a combined update handler, not enforced as a gate.

### How AI Helped

- Prompted Cursor to split the update endpoint: generic PATCH for fields only, dedicated `PATCH /api/v1/tickets/:id/status` for transitions.
- Asked AI to add an explicit guard: if `'status' in req.body` on generic PATCH, return `400` with redirect message.
- Generated `stateMachine.test.js` with `it.each` parameterized allowed and rejected transition matrices from `spec.md`.

### What I Validated

- [ ] `PATCH /api/v1/tickets/:id` with `status` field returns `400`: `"Use PATCH /tickets/:id/status to change status"`
- [ ] No fields modified when status smuggling attempted
- [ ] All 5 allowed transitions return `200` via status endpoint
- [ ] All 11 rejected transitions in test matrix return `409` with `details.allowedTransitions`
- [ ] Frontend `TicketDetailPage.jsx` calls `ticketsApi.updateStatus`, not `ticketsApi.update`, for status buttons
- [ ] `meta.allowedTransitions` returned on detail and status responses

### Final Fix

- Added early rejection in `tickets.routes.js` when `status` appears in generic PATCH body.
- Created dedicated `PATCH /:id/status` route calling `assertValidTransition` before save.
- Updated `api-contract.md` to document the split.
- Added `stateMachine.test.js` as mandatory integration test gate.

Logged in deviation table above (2026-07-14, `Spec Updated? Yes`).

---

## Issue 3: Supertest Session Not Persisting Across Requests

### Problem

Integration tests for authenticated ticket endpoints returned `401 Authentication required` even after a successful login call in the same test.

### How I Investigated

1. Ran `tickets.test.js` — `creates a ticket` failed with 401.
2. Compared login test (which passed) with ticket test — login test used `request.agent(app)`, ticket test used bare `request(app)`.
3. Read Supertest docs — `request.agent()` maintains cookies (session) across chained requests; bare `request()` does not.

### How AI Helped

- Described the 401 failure and test setup; AI identified the missing agent pattern.
- AI refactored `backend/tests/helpers.js` to export a consistent `login(agent, ...)` pattern and updated all integration test `beforeEach` blocks to use `request.agent(app)`.

### What I Validated

- [ ] `beforeEach` creates `agent = request.agent(app)` then calls `login(agent, ...)`
- [ ] Subsequent `agent.get('/api/v1/tickets')` and `agent.post(...)` share the session cookie
- [ ] All auth and ticket integration tests pass

### Final Fix

Standardized on `request.agent(app)` for all authenticated test flows. Documented the pattern in [test-strategy.md](../../implementation-workflow/test-strategy.md) under "Session-aware requests."

---

## Issue 4: Infinite Scroll Loading Duplicate Pages

### Problem

Ticket list infinite scroll occasionally appended duplicate tickets when the user scrolled quickly near the bottom of the list.

### How I Investigated

1. Reproduced manually with 15+ seeded tickets — duplicates appeared in the list.
2. Inspected `TicketListPage.jsx` — `IntersectionObserver` callback fired multiple times before `loading` state was set.
3. Checked `page` state increment — race between observer callback and React state update allowed duplicate fetches for the same page number.

### How AI Helped

- Shared the component code and described duplicate behavior; AI suggested guarding the observer callback with a `loading` ref (synchronous) in addition to `loading` state.
- AI added a check: do not fetch if `data.length >= meta.total` (all pages loaded).

### What I Validated

- [ ] Scroll to bottom loads page 2 without duplicating page 1 items
- [ ] Rapid scrolling does not trigger duplicate requests for the same page
- [ ] List stops fetching when all tickets loaded (`data.length === meta.total`)
- [ ] `GET /api/v1/tickets?limit=10&page=2` integration test passes

### Final Fix

Added a `loadingRef` guard in the `IntersectionObserver` callback and an early return when all results are loaded. Backend pagination test (`paginates tickets with limit 10`) confirms API correctness; frontend guard prevents duplicate client-side fetches.

---

## Debugging Workflow Template

For future issues, use this structure:

```
## Issue N: <title>
### Problem
### How I Investigated
### How AI Helped
### What I Validated
### Final Fix
```

Add a row to the **Requirement Deviation Log** table if the fix permanently changes spec behavior.
