# Test Strategy

Testing approach for the Support Ticket Management System — a MongoDB-backed full-stack app with a backend-enforced ticket state machine, session authentication, and React SPA frontend.

**Related documents:**

- [acceptance-criteria.md](../tool-specific/cursor-workflow/acceptance-criteria.md) — definitions of done (AC-1 through AC-11)
- [api-contract.md](./api-contract.md) — REST API schemas and error responses
- [requirements-analysis.md](./requirements-analysis.md) — edge cases and assumptions

---

## Test Scope

### In Scope

| Layer | What is tested | Priority |
|-------|----------------|----------|
| **Backend API** | Auth, ticket CRUD, filters, pagination, validation, state machine, comments | **Mandatory** |
| **State machine** | All 5 allowed transitions; 11+ rejected transitions; status smuggling blocked | **Mandatory** |
| **Frontend components** | `ErrorAlert` rendering and empty-state behavior | Low (starter coverage) |
| **Manual E2E** | Login → list → create → detail → edit → transition → comment → logout | Required for AC sign-off |

### Out of Scope (documented below)

- Browser E2E automation (Playwright/Cypress)
- Load/performance testing
- Concurrent transition race conditions
- Role-based access control (admin vs agent permissions are identical)
- Visual regression testing

### Test Pyramid

```
        ┌─────────────┐
        │  Manual E2E │  Login flows, infinite scroll, UI transitions
        ├─────────────┤
        │ Integration │  Supertest + mongodb-memory-server (primary gate)
        ├─────────────┤
        │  Component  │  ErrorAlert.test.jsx (minimal)
        ├─────────────┤
        │    Unit     │  ticketStateMachine.js (tested via integration)
        └─────────────┘
```

### Test Runners and Infrastructure

| Package | Location | Command |
|---------|----------|---------|
| Backend | `backend/` | `npm test` (Vitest + Supertest) |
| Frontend | `frontend/` | `npm test` (Vitest + React Testing Library + jsdom) |
| Test DB | `backend/tests/setup.js` | `mongodb-memory-server` — isolated per run, collections cleared after each test |

---

## Unit Tests

Pure logic unit tests are minimal in this project. Business-critical logic lives in `backend/src/services/ticketStateMachine.js` and is exercised indirectly through integration tests rather than isolated unit test files.

### Candidates for Future Unit Tests

| Module | Functions | Why not isolated yet |
|--------|-----------|----------------------|
| `ticketStateMachine.js` | `getAllowedTransitions`, `isValidTransition`, `assertValidTransition`, `buildTransitionErrorMessage` | Covered exhaustively by `stateMachine.test.js` via HTTP layer |
| `validate.js` | `handleValidation`, `errorHandler` | Tested implicitly through route validation failures |

### Rationale

Integration tests provide higher confidence for this mini-project because they verify the full request → middleware → state machine → Mongoose → response chain. Adding isolated unit tests for `ticketStateMachine.js` would be redundant unless the module grows in complexity (e.g., role-based transition rules).

---

## Component Tests

Frontend component tests use **Vitest** and **React Testing Library** with **jsdom**.

### Current Coverage

| File | Tests | Assertions |
|------|-------|------------|
| `frontend/src/components/ErrorAlert.test.jsx` | Renders error message with `role="alert"` | Message text visible |
| `frontend/src/components/ErrorAlert.test.jsx` | Empty message | Component renders nothing |

### Planned but Not Yet Implemented

| File | Planned coverage |
|------|------------------|
| `TicketListPage.test.jsx` | Search input debounce, filter dropdowns, empty state |
| `CreateTicketPage.test.jsx` | Form validation, submit handler, error display |
| `TicketDetailPage.test.jsx` | Status buttons from `allowedTransitions`, comment form |
| `StatusBadge.test.jsx` | Correct CSS class per status enum |
| `ProtectedRoute.test.jsx` | Redirect to `/login` when unauthenticated |

### Component Test Conventions

- Mock `fetch` or the `api/client.js` module — do not hit the real backend
- Use `AuthContext` provider wrapper for pages that depend on session state
- Assert user-visible behavior (text, buttons, alerts), not implementation details

---

## API / Integration Tests

Integration tests are the **mandatory verification gate** for this project. They run against an in-memory MongoDB instance and exercise the full Express application via Supertest.

### Test Files

| File | Describe blocks | Coverage |
|------|-----------------|----------|
| `backend/tests/integration/tickets.test.js` | Auth integration, Tickets integration | 401 without session, login success/failure, create, list, update, priority filter, invalid priority filter, entity shape, pagination |
| `backend/tests/integration/stateMachine.test.js` | State machine integration | 5 allowed transitions (`it.each`), 11 rejected transitions (`it.each`), meaningful error message, status smuggling via generic PATCH |
| `backend/tests/integration/comments.test.js` | Comments integration | Add comment (201), reject empty message (400) |

### Test Helpers (`backend/tests/helpers.js`)

| Helper | Purpose |
|--------|---------|
| `createUser(email, password, name, role)` | Insert user with bcrypt-hashed password |
| `login(agent, email, password)` | Authenticate via Supertest agent (preserves session cookie) |
| `createTicket(agent, overrides)` | POST `/api/v1/tickets` with default valid payload |
| `setTicketStatus(ticketId, status)` | Direct Mongoose update to seed a ticket into a specific status before transition tests |

### Key Integration Test Patterns

**Session-aware requests:** Use `request.agent(app)` instead of bare `request(app)` so the session cookie persists across requests in a test.

**Parameterized transitions:** `it.each(allowed)` and `it.each(rejected)` in `stateMachine.test.js` ensure every edge of the transition graph is covered without copy-paste.

**Entity shape assertions:** Tests verify `passwordHash` is never returned, `id` is exposed (not `_id`), and populated references include `name`, `email`, `role`.

**Pagination:** Creates 12 tickets, asserts page 1 returns exactly 10 items and `meta.total >= 12`, page 2 returns remaining items.

### Running Integration Tests

```bash
cd backend
npm test          # single run
npm run test:watch  # watch mode
```

Expected result: all tests pass, exit code 0.

---

## Edge Case Tests

Edge cases from [requirements-analysis.md](./requirements-analysis.md) mapped to test coverage.

| Edge Case | Tested? | How |
|-----------|---------|-----|
| **Status smuggling** — `status` in generic PATCH body | Yes | `stateMachine.test.js`: rejects with 400, error matches `/status/i` |
| **Invalid transition** — `open` → `resolved` | Yes | `stateMachine.test.js`: 409 with `details.allowedTransitions` |
| **Terminal status** — transition from `closed` or `cancelled` | Yes | `stateMachine.test.js`: rejected array includes `['closed', 'open']`, `['cancelled', 'resolved']`, etc. |
| **Invalid assignee ObjectId** | Partial | Route returns 400; no dedicated integration test yet |
| **Assignee user not found** | No | Manual verification only |
| **Empty PATCH body** | No | Documented in api-contract; not automated |
| **Comment on missing ticket** | No | `comments.test.js` does not test 404 case |
| **Concurrent status transitions** | No | Last-write-wins; documented as known limitation |
| **Invalid status/priority query filter** | Yes | `tickets.test.js`: `priority=urgent` returns 400 |
| **Unauthenticated access** | Yes | `tickets.test.js`: GET `/api/v1/tickets` without session returns 401 |
| **Invalid login credentials** | Yes | `tickets.test.js`: wrong password returns 401 |

### Recommended Edge Case Tests to Add

1. `POST /api/v1/tickets/:id/comments` on non-existent ticket → 404
2. `PATCH /api/v1/tickets/:id` with `assignedTo` pointing to non-existent user → 400
3. `PATCH /api/v1/tickets/:id` with empty body `{}` → 400
4. `GET /api/v1/tickets/:id` with malformed ObjectId → 404

---

## Tests Not Covered (and why)

| Area | Reason |
|------|--------|
| **Browser E2E (Playwright/Cypress)** | Mini-project scope; manual walkthrough satisfies AC-1 through AC-8; integration tests cover API contract |
| **Frontend page tests** | Time-boxed; `ErrorAlert` demonstrates RTL setup; pages listed in `tasks.md` as stretch goal |
| **Unit tests for `ticketStateMachine.js`** | Integration tests cover the same logic through the HTTP layer with higher confidence |
| **Concurrent transition races** | Requires deliberate parallel request orchestration; documented as EC-1 with last-write-wins semantics; not a project requirement |
| **Role-based access control** | Both `admin` and `agent` have equal ticket access by design (assumption A-3) |
| **Session expiry / timeout** | Default `express-session` behavior; no custom TTL configured |
| **MongoDB text index performance** | Regex search is sufficient at mini-project scale |
| **CORS misconfiguration** | Manual dev setup; no automated cross-origin test |
| **Load/stress testing** | Out of scope for assessment |
| **Comment edit/delete** | Comments are append-only by design (assumption A-6) |
| **Secret scanning** | Manual `git grep` per AC-10; no automated pre-commit hook |

---

## Test Traceability

| Acceptance Criteria | Primary Test File |
|---------------------|-------------------|
| AC-1 Create ticket | `tickets.test.js` |
| AC-2 List tickets | `tickets.test.js` |
| AC-3 Ticket detail | `tickets.test.js` (entity shape) |
| AC-4 Update fields | `tickets.test.js` |
| AC-5 Comments | `comments.test.js` |
| AC-6 State transitions | `stateMachine.test.js` |
| AC-7 Search/filter/pagination | `tickets.test.js` (priority filter, pagination) |
| AC-9 Backend validation | `tickets.test.js`, `comments.test.js` |
| AC-11 Integration tests pass | All three files |

---

## CI Recommendation

For a production pipeline, run:

```bash
cd backend && npm test
cd frontend && npm test
```

Gate merges on backend test exit code 0. Frontend tests are informational until page tests are added.
