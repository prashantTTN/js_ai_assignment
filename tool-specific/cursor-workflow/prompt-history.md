# Prompt History — Support Ticket Management System

Chronological log of prompts used during AI-assisted development in Cursor. Each entry records **context, intent, prompt, outcome, refinement, and validation** for assessment traceability.

**Related documents:**

- [submission-index.md](./submission-index.md) — assessor entry point and doc map
- [tool-workflow.md](./tool-workflow.md) — narrative AI workflow across all phases
- [debugging-notes.md](./debugging-notes.md) — detailed issue investigations linked from refinement entries
- [code-review-notes.md](../../implementation-workflow/code-review-notes.md) — review prompts and findings
- [implementation-plan.md](../../implementation-workflow/implementation-plan.md) — milestones M0–M5 and AI usage plan
- [reflection.md](../../implementation-workflow/reflection.md) — lessons learned and reusable prompt templates

---

## Entry Format

Each entry includes:

| Field | Description |
|-------|-------------|
| **Date** | When the prompt was used |
| **Phase** | Planning, Backend, Frontend, Testing, Review, Debugging, or Docs |
| **Context** | What existed before the prompt |
| **Intent** | What you wanted to achieve |
| **Prompt** | Summary or quoted prompt text |
| **Outcome** | Files created or changed |
| **Refinement** | Follow-up prompt if AI output was wrong (or "None") |
| **Validation** | How the result was verified |

---

## Entries (Chronological)

### 2026-07-14 — Initial Planning & Spec Setup

**Phase:** Planning  
**Context:** Empty repo; assessment brief for Support Ticket Management System with state machine.  
**Intent:** Establish spec-driven workflow before writing application code.  
**Prompt:** Build Support Ticket Management System mini-project workflow configuration — create 5 spec files in `tool-specific/cursor-workflow/` covering stack, entities, API, tasks, and acceptance criteria.  
**Outcome:** Created `project-context.md`, `spec.md`, `tasks.md`, `acceptance-criteria.md`, `cursor-rules-or-instructions.md`.  
**Refinement:** None — first prompt in the project.  
**Validation:** Reviewed spec files against assessment entity requirements; confirmed state machine transition table matches brief.

---

### 2026-07-14 — Backend Foundation (M1)

**Phase:** Backend  
**Context:** Spec docs complete; no application code yet.  
**Intent:** Scaffold MongoDB models, Express app, seed script, and Docker Compose for local dev.  
**Prompt:** Implement Milestone M1 per `tasks.md` — Mongoose models for User, Ticket, Comment; `db.js` connection; Express `app.js`/`server.js`; idempotent `seed.js` with 15 sample tickets; `docker-compose.yml`.  
**Outcome:** `backend/src/models/*.js`, `backend/src/config/db.js`, `backend/src/app.js`, `backend/src/server.js`, `backend/src/scripts/seed.js`, `docker-compose.yml`, `backend/.env.example`.  
**Refinement:** First pass used `displayName`, embedded comments with `body` — corrected in entity rename entry below.  
**Validation:** `npm run seed` idempotent; `npm run dev` starts on port 3001; `GET /health` returns `{ status: "ok" }`.

---

### 2026-07-14 — API Routes & State Machine (M2)

**Phase:** Backend  
**Context:** Models and seed exist; no REST routes or state machine enforcement.  
**Intent:** Full REST API under `/api/v1` with session auth, validation middleware, and centralized transition logic.  
**Prompt:** Implement M2 — auth routes, users list, ticket CRUD, `ticketStateMachine.js` with transition map and `assertValidTransition`, express-validator chains, mount at `/api/v1`. Follow `spec.md` entity shapes.  
**Outcome:** `backend/src/routes/auth.routes.js`, `tickets.routes.js`, `users.routes.js`; `backend/src/middleware/auth.js`, `validate.js`; `backend/src/services/ticketStateMachine.js`.  
**Refinement:** Initial combined PATCH handler accepted `status` in body — fixed in status smuggling entry below.  
**Validation:** Manual curl/Postman for login, create ticket, list; state machine module exports transition helpers.

---

### 2026-07-14 — Entity Field Rename (Spec Alignment)

**Phase:** Debugging  
**Context:** Backend and frontend used `displayName`, `assignee`, embedded comment `body`; spec requires `name`, `assignedTo`, separate Comment collection with `message`.  
**Intent:** Align full stack to assessment entity spec in one coordinated pass.  
**Prompt:** Align all models, routes, seed script, frontend pages, and tests to entity definitions in `spec.md`. Log deviation in `debugging-notes.md` before changing.  
**Outcome:** Renamed fields across `backend/src/models/`, routes, `frontend/src/pages/*.jsx`, `seed.js`, integration tests; updated `spec.md`.  
**Refinement:** First AI pass missed frontend `ticket.assignee` references — grepped codebase and prompted second pass for stale `displayName`, `assignee`, `body`.  
**Validation:** `cd backend && npm test` — entity shape tests pass; ticket detail page shows assignee name; comments use `message` end-to-end. See [debugging-notes.md Issue 1](./debugging-notes.md#issue-1-entity-field-naming-mismatch-with-assessment-spec).

---

### 2026-07-14 — Status Smuggling Fix (Dedicated Status Endpoint)

**Phase:** Debugging  
**Context:** Generic `PATCH /api/v1/tickets/:id` accepted `status` in body, allowing `open` → `closed` bypass.  
**Intent:** Enforce AC-6 — all status changes through valid transitions only.  
**Prompt:** Split update endpoint: generic PATCH for fields only; dedicated `PATCH /api/v1/tickets/:id/status` calling `assertValidTransition`. Reject `status` in generic PATCH with `400` and redirect message.  
**Outcome:** Updated `tickets.routes.js`; documented split in `api-contract.md`; added `stateMachine.test.js`.  
**Refinement:** AI initially suggested merging status logic into generic PATCH with conditionals — rejected per separation-of-concerns; kept dedicated endpoint.  
**Validation:** Manual `PATCH` with `{ "status": "closed" }` returns 400; status endpoint enforces graph; all 5 allowed + 11 rejected transitions tested. See [debugging-notes.md Issue 2](./debugging-notes.md#issue-2-status-changes-bypassing-the-state-machine).

---

### 2026-07-14 — Integration Tests & Supertest Session Fix (M3)

**Phase:** Testing  
**Context:** Route handlers implemented; no automated tests; first test run returned 401 on authenticated endpoints.  
**Intent:** Integration test suite as mandatory gate; fix session cookie persistence in tests.  
**Prompt:** Set up Vitest + Supertest + mongodb-memory-server. Create helpers (`createUser`, `login`, `createTicket`, `setTicketStatus`). Fix 401 failures on ticket tests after login.  
**Outcome:** `backend/tests/setup.js`, `helpers.js`, `integration/tickets.test.js`; standardized `request.agent(app)` pattern.  
**Refinement:** AI generated bare `request(app)` — diagnosed 401 by comparing passing login test vs failing ticket test; prompted refactor to agent pattern.  
**Validation:** `cd backend && npm test` — auth and ticket CRUD tests pass. See [debugging-notes.md Issue 3](./debugging-notes.md#issue-3-supertest-session-not-persisting-across-requests).

---

### 2026-07-14 — State Machine Test Matrix

**Phase:** Testing  
**Context:** `stateMachine.test.js` scaffolded; transition matrix not fully parameterized.  
**Intent:** Cover every allowed and rejected transition from `spec.md` with `it.each` — no copy-paste gaps.  
**Prompt:** Write integration tests in `stateMachine.test.js` for all 5 allowed and 11 rejected transitions from the spec transition table. Assert 409 with `details.allowedTransitions` on rejections; assert status smuggling blocked on generic PATCH.  
**Outcome:** Parameterized `it.each` blocks in `stateMachine.test.js`; status smuggling test added.  
**Refinement:** None — matrix generated correctly from spec table.  
**Validation:** `cd backend && npm test` — all transition matrix entries pass; AC-6 Strict State Validation satisfied.

---

### 2026-07-14 — Frontend Application (M4)

**Phase:** Frontend  
**Context:** Stable API with passing integration tests; no UI yet.  
**Intent:** React SPA with auth, ticket list, create, detail pages; API client with session cookies.  
**Prompt:** Implement M4 per `tasks.md` — `api/client.js` with `credentials: 'include'`, AuthContext, ProtectedRoute, LoginPage, TicketListPage, CreateTicketPage, TicketDetailPage with dynamic status buttons from `meta.allowedTransitions`.  
**Outcome:** `frontend/src/api/client.js`, `context/AuthContext.jsx`, `pages/*.jsx`, `components/*.jsx`, `App.jsx` routing.  
**Refinement:** First pass hardcoded status buttons — review prompt flagged; refactored to render from `allowedTransitions`.  
**Validation:** Manual walkthrough: login → list → create → detail → edit → transition → comment → logout.

---

### 2026-07-14 — List UX Enhancements (Priority Filter & Infinite Scroll)

**Phase:** Frontend  
**Context:** Basic ticket list working; post-MVP feedback for filters and pagination UX.  
**Intent:** Add priority filter, infinite scroll (10 per page), backend default `limit=10`.  
**Prompt:** Add priority filter next to status dropdown; infinite scroll with 10 items per page; update spec docs and run tests.  
**Outcome:** Backend `priority` query filter in `tickets.routes.js`; default `limit=10`; frontend infinite scroll + priority dropdown in `TicketListPage.jsx`; spec/acceptance-criteria updated; pagination integration test added.  
**Refinement:** None for this feature — built cleanly on existing list API.  
**Validation:** `cd backend && npm test` — pagination test passes; manual scroll loads page 2 without duplicates (after scroll fix below).

---

### 2026-07-14 — Infinite Scroll Duplicate Pages Fix

**Phase:** Debugging  
**Context:** Infinite scroll appended duplicate tickets on rapid scroll; backend pagination correct.  
**Intent:** Prevent duplicate page fetches from `IntersectionObserver` race with React state.  
**Prompt:** Ticket list duplicates tickets on fast scroll. `IntersectionObserver` fires before `loading` state updates. Add synchronous guard and stop when all results loaded.  
**Outcome:** Added `loadingRef` guard and early return when `data.length >= meta.total` in `TicketListPage.jsx`.  
**Refinement:** AI first suggested debouncing observer only — insufficient; second pass added ref guard plus total-count check.  
**Validation:** Manual repro with 15+ seeded tickets — no duplicates on rapid scroll; pagination integration test confirms API correctness. See [debugging-notes.md Issue 4](./debugging-notes.md#issue-4-infinite-scroll-loading-duplicate-pages).

---

### 2026-07-14 — Code Review Against API Contract

**Phase:** Review  
**Context:** Core features implemented; need spec alignment check before sign-off.  
**Intent:** Find mismatches in status codes, error messages, and response shapes vs `api-contract.md`.  
**Prompt:** Review `backend/src/routes/tickets.routes.js` against api-contract.md. List mismatches in status codes, error messages, or response shapes. Verify ticketStateMachine.js is the only module determining allowed transitions.  
**Outcome:** Findings logged in [code-review-notes.md](../../implementation-workflow/code-review-notes.md); fixes applied for status smuggling, `allowedTransitions` in 409 responses, dynamic status buttons, comment `createdBy` population.  
**Refinement:** AI suggested JWT, Redis sessions, Zod, axios — all rejected as out of scope (documented in code-review-notes).  
**Validation:** Spec comparison checklist; `npm test` after each accepted fix.

---

### 2026-07-16 — Evaluation Documentation (Plan + Implement)

**Phase:** Docs  
**Context:** Working app; evaluation markdown files needed for assessment submission.  
**Intent:** Populate 5 root evaluation docs with full technical content — no placeholders.  
**Prompt:** Generate 5 root evaluation markdown files (`candidate-info.md`, `requirements-analysis.md`, `acceptance-criteria.md`, `implementation-plan.md`, `api-contract.md`) with full technical content for the MongoDB ticket state machine app.  
**Outcome:** 5 files populated at repo root; `api-contract.md` documents actual `PATCH /api/v1` API; README updated with Evaluation Documentation links.  
**Refinement:** None — content generated from actual codebase.  
**Validation:** Cross-link check; no placeholder tokens; requirements trace to existing tests.

---

### 2026-07-16 — Author Metadata

**Phase:** Docs  
**Context:** Evaluation docs created; author attribution missing from package files.  
**Intent:** Add author name consistently across project metadata.  
**Prompt:** Add author `Prashant Baliyan` to all applicable `package.json` and README files.  
**Outcome:** `author` set in `backend/package.json` and `frontend/package.json`; **Author** line added to `README.md`.  
**Refinement:** None.  
**Validation:** Visual check of README and package.json files.

---

### 2026-07-16 — Merge Acceptance Criteria

**Phase:** Docs  
**Context:** Duplicate acceptance criteria at repo root and in `tool-specific/cursor-workflow/`.  
**Intent:** Single canonical acceptance criteria file in cursor-workflow directory.  
**Prompt:** Move `acceptance-criteria.md` to `tool-specific/cursor-workflow/` and merge with the existing file.  
**Outcome:** Root file deleted; merged AC-1–AC-11 (Given/When/Then) with detailed checkbox groups, transition matrix, and traceability table; references updated across repo.  
**Refinement:** None.  
**Validation:** Grep for stale root paths; verify AC-6 references state machine tests.

---

### 2026-07-16 — Additional Evaluation Docs

**Phase:** Docs  
**Context:** Core 5 eval docs exist; supplementary docs needed for testing, debugging, review, reflection.  
**Intent:** Create test strategy, debugging notes, code review notes, reflection, and PR description.  
**Prompt:** Create root markdown files: `test-strategy.md`, `debugging-notes.md`, `code-review-notes.md`, `reflection.md`, `pr-description.md` — each with specified section headers, populated for this project.  
**Outcome:** 5 new docs with test scope, 4 debugging issues, review notes, reflection, and PR template; README and `candidate-info.md` updated.  
**Refinement:** None — content sourced from actual implementation and debugging sessions.  
**Validation:** Each doc cross-links to related files; debugging entries match prompt-history refinement entries above.

---

### 2026-07-16 — Merge Debugging Notes

**Phase:** Docs  
**Context:** Debugging notes duplicated at root and in cursor-workflow.  
**Intent:** Consolidate deviation log and issue investigations in one location.  
**Prompt:** Move `debugging-notes.md` to `tool-specific/cursor-workflow/` and merge with existing file.  
**Outcome:** Root file deleted; merged deviation log with 4 detailed issue entries; references updated.  
**Refinement:** None.  
**Validation:** All 4 issues link to corresponding prompt-history entries (entity rename, status smuggling, Supertest, infinite scroll).

---

### 2026-07-16 — Implementation Workflow Directory

**Phase:** Docs  
**Context:** Evaluation docs scattered at repo root.  
**Intent:** Organize implementation docs into dedicated directory with updated cross-links.  
**Prompt:** Move `api-contract.md`, `implementation-plan.md`, `requirements-analysis.md`, `test-strategy.md`, `code-review-notes.md`, `pr-description.md`, `reflection.md` into `implementation-workflow/` and update all references.  
**Outcome:** `implementation-workflow/` created with 7 files; cross-links updated in README, workflow docs, and implementation-workflow files.  
**Refinement:** None.  
**Validation:** Link check across README, candidate-info, acceptance-criteria.

---

### 2026-07-16 — Move Candidate Info & Reference Fixes

**Phase:** Docs  
**Context:** `candidate-info.md` at repo root; stale paths after directory restructure.  
**Intent:** Relocate candidate metadata to cursor-workflow; fix all broken links.  
**Prompt:** Move `candidate-info.md` to `tool-specific/cursor-workflow/` and update all references. Fix README structure and internal doc index paths.  
**Outcome:** File relocated; README doc tables and project tree updated; `candidate-info.md` internal links fixed.  
**Refinement:** Follow-up prompt to fix remaining stale root paths after manual move.  
**Validation:** Grep for old paths; README structure matches actual file layout.

---

### 2026-07-16 — Prompt History Enrichment (Workstream 2)

**Phase:** Docs  
**Context:** `prompt-history.md` had 12 entries focused on doc restructuring; missing implementation lifecycle and full entry format.  
**Intent:** Complete Workstream 2 — enrich format with Context/Intent/Refinement/Validation; backfill M1–M4 and debugging prompts from project history.  
**Prompt:** Execute improvement plan Workstream 2 — expand prompt-history with implementation entries, refinement on 3+ fixes, validation on 2+ entries; update cross-links in related docs.  
**Outcome:** This file updated with 20 entries covering planning through documentation; related docs cross-linked.  
**Refinement:** N/A — current session.  
**Validation:** Entry count ≥12; 4+ Refinement entries; 6+ Validation entries reference `npm test` or manual walkthrough.

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total entries | 21 |
| Implementation phase (Backend/Frontend/Testing) | 8 |
| Debugging with Refinement | 4 |
| Review | 1 |
| Documentation | 10 |
| Entries validating with `npm test` | 8 |

---

## Prompt Index by Phase

| Phase | Entries |
|-------|---------|
| Planning | Initial Planning & Spec Setup |
| Backend | Backend Foundation (M1), API Routes & State Machine (M2) |
| Frontend | Frontend Application (M4), List UX Enhancements |
| Testing | Integration Tests & Supertest Fix (M3), State Machine Test Matrix |
| Debugging | Entity Field Rename, Status Smuggling Fix, Infinite Scroll Duplicate Fix |
| Review | Code Review Against API Contract |
| Docs | All 2026-07-16 documentation entries + Prompt History Enrichment + Tool Workflow Document |

---

### 2026-07-16 — Tool Workflow Document (Workstream 1)

**Phase:** Docs  
**Context:** Assessment flagged missing `tool-workflow.md`; `prompt-history.md` and `submission-index.md` complete from Workstreams 2 and 4.  
**Intent:** Create narrative AI workflow document describing how Cursor was used across all lifecycle phases.  
**Prompt:** Execute improvement plan Workstream 1 — create `tool-workflow.md` with phase map, decision log, validation gates, prompt templates; update cross-links.  
**Outcome:** Created `tool-specific/cursor-workflow/tool-workflow.md`; updated submission-index, README, candidate-info, and related docs.  
**Refinement:** None.  
**Validation:** Cross-link check; submission-index improvement status updated; tool-workflow linked as #3 in assessor reading order.

---

_Add new entries below as development continues. Link to [tool-workflow.md](./tool-workflow.md) for the narrative workflow overview._
