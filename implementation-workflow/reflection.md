# Reflection

Post-project reflection on building the Support Ticket Management System with AI-assisted development in Cursor.

**Author:** Prashant Baliyan

**Related documents:**

- [implementation-plan.md](./implementation-plan.md) — milestones and AI usage plan
- [code-review-notes.md](./code-review-notes.md) — review findings
- [debugging-notes.md](../tool-specific/cursor-workflow/debugging-notes.md) — deviations and issue investigations

---

## What I Built

A full-stack **Support Ticket Management System** for internal support teams:

- **Backend:** Node.js + Express REST API with Mongoose ODM, session authentication, and a backend-enforced ticket state machine (`open` → `in_progress` → `resolved` → `closed`, with `cancelled` as alternate exit)
- **Frontend:** React 18 SPA with Vite, React Router, native fetch API client, infinite-scroll ticket list, create/detail pages, and dynamic status transition buttons
- **Database:** MongoDB with three collections (users, tickets, comments), Docker Compose for local dev, seed script with 15 sample tickets
- **Tests:** Vitest + Supertest integration tests covering auth, CRUD, filters, pagination, state machine (5 allowed + 11 rejected transitions), and comments
- **Documentation:** Spec-driven workflow docs plus root evaluation artifacts (requirements, API contract, acceptance criteria, test strategy, debugging notes)

The system's defining constraint is that **status transitions are not free-form edits** — they follow a strict directed graph enforced in `ticketStateMachine.js`, with invalid transitions returning HTTP `409` and `allowedTransitions` metadata for the UI.

---

## How I Used AI (across the lifecycle)

| Phase | AI role | Example |
|-------|---------|---------|
| **Planning** | Generated spec-driven workflow docs, entity definitions, API contract, phased tasks | Initial 5-file workflow in `tool-specific/cursor-workflow/` |
| **Scaffolding** | Created Mongoose models, Express routes, React pages, test helpers | Backend M1–M2 milestones |
| **Implementation** | Wrote route handlers, state machine module, frontend API client, infinite scroll | Ticket CRUD, status endpoint, list filters |
| **Testing** | Generated parameterized `it.each` transition tests, pagination tests, validation tests | `stateMachine.test.js`, `tickets.test.js` |
| **Review** | Compared routes against api-contract.md, flagged status smuggling, missing `allowedTransitions` | See [code-review-notes.md](./code-review-notes.md) |
| **Debugging** | Diagnosed Supertest session issues, entity field mismatches, infinite scroll duplicates | See [debugging-notes.md](../tool-specific/cursor-workflow/debugging-notes.md) |
| **Documentation** | Populated evaluation markdown files from actual codebase | Root docs: requirements, API contract, test strategy, reflection |

AI was used as a **pair programmer** throughout — not as a one-shot code generator. Every AI output was validated against the spec, acceptance criteria, and test suite before acceptance.

---

## What AI Helped With Most

1. **Boilerplate velocity** — Mongoose schemas, Express route scaffolding, React page structure, and Vitest test setup were generated quickly with correct project conventions.

2. **State machine test matrix** — AI generated the full `it.each` parameterized test for 5 allowed and 11 rejected transitions from the spec transition table, saving significant manual test authoring time.

3. **Cross-file consistency** — When entity fields were renamed (`displayName` → `name`, `assignee` → `assignedTo`), AI updated models, routes, frontend, tests, and docs in a coordinated pass.

4. **Documentation population** — AI drafted deep, domain-specific content for evaluation markdown files (requirements analysis, API contract, acceptance criteria) grounded in the actual implementation rather than generic templates.

5. **Error message alignment** — AI ensured backend error strings matched api-contract.md exactly (`"Use PATCH /tickets/:id/status to change status"`, `"Cannot move from Open to Resolved..."`).

---

## What AI Got Wrong

1. **Initial entity naming** — First implementation used `displayName`, `assignee`, and embedded comment `body` instead of spec-defined `name`, `assignedTo`, and separate Comment collection with `message`. Required a full-stack rename pass.

2. **Status smuggling** — Early ticket update endpoint accepted `status` in the generic PATCH body, bypassing the state machine. AI did not initially separate concerns into dedicated endpoints.

3. **Supertest session pattern** — Generated tests used bare `request(app)` instead of `request.agent(app)`, causing 401 failures on authenticated endpoints. Required manual diagnosis and helper refactor.

4. **Transition count error in AC-6** — AI once referenced "all 9 transitions" in acceptance criteria when only 5 allowed transitions exist. Caught during review and corrected to 5.

5. **Over-engineering suggestions** — AI proposed JWT auth, Redis sessions, Zod validation, and axios — all correctly rejected as unnecessary for project scope (see [code-review-notes.md](./code-review-notes.md)).

6. **Infinite scroll race** — AI's first `IntersectionObserver` implementation did not guard against duplicate page fetches on rapid scroll. Required adding a synchronous `loadingRef` guard.

---

## How I Validated AI Output

| Validation method | What it caught |
|-------------------|----------------|
| **`cd backend && npm test`** | Route handler bugs, validation gaps, state machine errors, entity shape mismatches |
| **Manual API testing** | Status smuggling, error response shapes, session cookie behavior |
| **Spec comparison** | Entity field names, enum values, transition graph, error messages vs api-contract.md |
| **Frontend manual walkthrough** | Infinite scroll duplicates, status button visibility, error display via ErrorAlert |
| **Acceptance criteria checklist** | AC-1 through AC-11 coverage gaps |
| **git grep for secrets** | Ensured no `.env` or hardcoded credentials committed |
| **Code review prompts** | AI false positives (JWT, Redis) and real issues (status bypass) |

**Rule applied:** Never merge AI-generated code without at least one automated test or manual verification step. Integration tests were the primary gate.

---

## What I Would Improve Next

1. **Frontend page tests** — Add RTL tests for `TicketListPage`, `CreateTicketPage`, and `TicketDetailPage` (currently only `ErrorAlert.test.jsx` exists).

2. **Missing edge case tests** — Comment on non-existent ticket (404), invalid assignee (400), empty PATCH body (400).

3. **Optimistic concurrency** — Add a `version` field on tickets to prevent last-write-wins race conditions on concurrent status transitions (EC-1).

4. **E2E automation** — Playwright tests for the full login → create → transition → comment flow.

5. **MongoDB text search** — Replace regex with `$text` index queries for better search performance at scale.

6. **Global error boundary** — React error boundary to catch unhandled render errors gracefully.

7. **Rate limiting** — Add login rate limiting for production hardening.

8. **CI pipeline** — GitHub Actions running `npm test` in both backend and frontend on every PR.

---

## Reusable Workflow (prompts, rules, specs, templates)

### Prompt templates that worked well

**Spec-first implementation:**
> Implement `PATCH /api/v1/tickets/:id/status` per api-contract.md. Use `assertValidTransition` from ticketStateMachine.js. Return 409 with details.allowedTransitions on invalid transitions.

**Cross-file alignment:**
> Align all models, routes, frontend pages, and tests to the entity definitions in spec.md. Update debugging-notes.md with any deviations.

**Test generation:**
> Write integration tests in stateMachine.test.js for all rejected transitions in requirements-analysis.md EC-5. Each test must assert 409 and details.allowedTransitions.

**Review:**
> Review backend/src/routes/tickets.routes.js against api-contract.md. List mismatches in status codes, error messages, or response shapes.

### Rules and guardrails

- [tool-specific/cursor-workflow/cursor-rules-or-instructions.md](tool-specific/cursor-workflow/cursor-rules-or-instructions.md) — no secrets, minimal diffs, update docs when behavior changes
- Spec-first: update `api-contract.md` before changing API behavior
- Integration tests mandatory for state machine changes
- Log deviations in `debugging-notes.md`

### Document templates

| File | Purpose |
|------|---------|
| `candidate-info.md` | Metadata, tools, setup (`tool-specific/cursor-workflow/`) |
| `requirements-analysis.md` | Domain, FR/NFR, edge cases (`implementation-workflow/`) |
| `api-contract.md` | REST schemas and errors (`implementation-workflow/`) |
| `acceptance-criteria.md` | In `tool-specific/cursor-workflow/` — AC-1 through AC-11 |
| `implementation-plan.md` | Milestones + AI usage plan (`implementation-workflow/`) |
| `test-strategy.md` | Test scope, coverage, gaps (`implementation-workflow/`) |
| `debugging-notes.md` | In `tool-specific/cursor-workflow/` — deviation log and issue investigations |
| `code-review-notes.md` | Review findings (`implementation-workflow/`) |
| `reflection.md` | This file (`implementation-workflow/`) |
| `pr-description.md` | PR summary template (`implementation-workflow/`) |

### Recommended workflow for similar projects

1. Generate spec + API contract + acceptance criteria **before** code
2. Implement backend + integration tests **before** frontend
3. Use AI for scaffolding and test generation; validate with `npm test`
4. Manual walkthrough against acceptance criteria checklist
5. Populate evaluation docs from actual codebase (not aspirational designs)
6. Log every spec deviation and debugging session for traceability
