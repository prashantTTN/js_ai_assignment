# Implementation Tasks — Support Ticket Management System

Step-by-step, phase-gated implementation plan for spec-driven development. Complete each phase fully before starting the next. Update checkboxes as work progresses.

**Authoritative references:**

- [project-context.md](./project-context.md) — stack and conventions
- [spec.md](./spec.md) — schemas, API, state machine
- [acceptance-criteria.md](./acceptance-criteria.md) — definitions of done
- [cursor-rules-or-instructions.md](./cursor-rules-or-instructions.md) — AI guardrails

---

## Phase 0 — Workspace & Workflow

**Goal:** Establish spec-driven workflow and repository hygiene before application code.

### Tasks

- [x] Create `tool-specific/cursor-workflow/` documentation files (all 5)
- [x] Add root [`.gitignore`](../../.gitignore) — exclude `.env`, `.env.local`, `.env.test`, `node_modules/`, `dist/`, `build/`, `coverage/`, `.DS_Store`
- [x] Add [`backend/.env.example`](../../backend/.env.example) with placeholder keys (no real values)
- [x] Add [`frontend/.env.example`](../../frontend/.env.example) with placeholder keys
- [x] Initialize git repository if not already done

### Target Files

```
.gitignore
backend/.env.example
frontend/.env.example
tool-specific/cursor-workflow/   (complete)
```

### Checkpoint

- All 5 workflow docs exist and cross-link correctly
- `.gitignore` blocks `.env` files
- No secrets anywhere in the repo

---

## Phase 1 — MongoDB Setup & Seed Scripts

**Goal:** Backend scaffold with Mongoose models and seed data.

### Tasks

- [x] Initialize `backend/` with `npm init` and install dependencies:
  - `express`, `mongoose`, `bcrypt`, `express-session`, `cors`, `dotenv`, `express-validator`
  - Dev: `nodemon` (or `node --watch`)
- [x] Create [`backend/src/config/db.js`](../../backend/src/config/db.js) — MongoDB connection via `MONGODB_URI`
- [x] Create [`backend/src/models/User.js`](../../backend/src/models/User.js) per [spec.md](./spec.md)
- [x] Create [`backend/src/models/Ticket.js`](../../backend/src/models/Ticket.js) with embedded Comment subschema per [spec.md](./spec.md)
- [x] Create [`backend/src/models/index.js`](../../backend/src/models/index.js) — export all models
- [x] Create minimal [`backend/src/app.js`](../../backend/src/app.js) and [`backend/src/server.js`](../../backend/src/server.js) — Express app skeleton
- [x] Add [`docker-compose.yml`](../../docker-compose.yml) for local MongoDB (optional but recommended)
- [x] Create [`backend/src/scripts/seed.js`](../../backend/src/scripts/seed.js):
  - Upsert admin user from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
  - Create 3–5 sample tickets with varied statuses
  - Include at least one ticket with comments
  - Idempotent (safe to re-run)
- [x] Add `npm run seed` script to `backend/package.json`
- [x] Add `npm run dev` script to `backend/package.json`

### Target Files

```
backend/
├── package.json
├── .env.example
├── src/
│   ├── config/db.js
│   ├── models/User.js
│   ├── models/Ticket.js
│   ├── models/index.js
│   ├── scripts/seed.js
│   ├── app.js
│   └── server.js
docker-compose.yml          (optional)
```

### Checkpoint

- `npm run seed` succeeds against local MongoDB
- Re-running seed does not duplicate admin user
- Sample tickets visible in MongoDB with correct schema fields
- Server starts and connects to database without errors

---

## Phase 2 — Backend API & State Machine

**Goal:** Full REST API with auth, validation, and enforced status lifecycle.

### Tasks

- [x] Create [`backend/src/services/ticketStateMachine.js`](../../backend/src/services/ticketStateMachine.js):
  - `getAllowedTransitions(currentStatus)`
  - `isValidTransition(currentStatus, nextStatus)`
  - `assertValidTransition(currentStatus, nextStatus)`
  - Transition table MUST match [spec.md](./spec.md) exactly
- [x] Create [`backend/src/middleware/auth.js`](../../backend/src/middleware/auth.js) — session check, attach `req.user`
- [x] Create [`backend/src/middleware/errorHandler.js`](../../backend/src/middleware/errorHandler.js) — consistent error JSON shape
- [x] Create [`backend/src/middleware/validate.js`](../../backend/src/middleware/validate.js) — express-validator result handler
- [x] Create [`backend/src/routes/auth.routes.js`](../../backend/src/routes/auth.routes.js):
  - `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
- [x] Create [`backend/src/routes/users.routes.js`](../../backend/src/routes/users.routes.js):
  - `GET /users` (for assignee dropdown)
- [x] Create [`backend/src/routes/tickets.routes.js`](../../backend/src/routes/tickets.routes.js):
  - `GET /tickets` — keyword search (`q`) and status filter
  - `POST /tickets` — create with validation
  - `GET /tickets/:id` — detail with populated fields
  - `PATCH /tickets/:id` — update title, description, priority, assignee (reject `status`)
  - `PATCH /tickets/:id/status` — state machine transition only
  - `POST /tickets/:id/comments` — add comment
- [x] Wire routes in [`backend/src/app.js`](../../backend/src/app.js) under `/api/v1`
- [x] Configure `express-session`, CORS (`CLIENT_URL`, credentials), and cookie settings
- [x] Ensure `passwordHash` is never serialized in API responses

### Target Files

```
backend/src/
├── services/ticketStateMachine.js
├── middleware/auth.js
├── middleware/errorHandler.js
├── middleware/validate.js
├── routes/auth.routes.js
├── routes/users.routes.js
├── routes/tickets.routes.js
└── app.js                  (updated)
```

### Checkpoint

- Manual API testing (curl/Postman) confirms all endpoints work
- Login creates session; protected routes return `401` without session
- Invalid status transition returns `409` with allowed transitions in `details`
- `PATCH /tickets/:id` with `status` field returns `400`
- Search (`?q=`) and filter (`?status=`) work on list endpoint
- Validation errors return `400` with meaningful messages

---

## Phase 3 — Integration Tests (Mandatory)

**Goal:** Automated proof that state machine rules and API validation are enforced.

### Tasks

- [x] Install test dependencies: `vitest` (or `jest`), `supertest`
- [x] Create test setup: [`backend/tests/setup.js`](../../backend/tests/setup.js) — connect to test DB, clear collections between tests
- [x] Configure `npm test` in `backend/package.json`
- [x] Create [`backend/tests/integration/stateMachine.test.js`](../../backend/tests/integration/stateMachine.test.js):
  - **Allowed transitions** — all 9 from [spec.md integration test matrix](./spec.md#integration-test-matrix-state-machine)
  - **Rejected transitions** — all 7 minimum failures from spec
  - Each rejected test asserts `409` status and error body shape
- [x] Create [`backend/tests/integration/tickets.test.js`](../../backend/tests/integration/tickets.test.js):
  - Create ticket (201)
  - List tickets (200)
  - Update fields (200)
  - Reject missing title (400)
  - Reject invalid priority (400)
- [x] Create [`backend/tests/integration/auth.test.js`](../../backend/tests/integration/auth.test.js):
  - Login success (200)
  - Login failure (401)
  - Protected route without session (401)
- [x] Create [`backend/tests/integration/comments.test.js`](../../backend/tests/integration/comments.test.js):
  - Add comment (201)
  - Reject empty body (400)

### Target Files

```
backend/
├── package.json            (test script)
├── tests/
│   ├── setup.js
│   └── integration/
│       ├── stateMachine.test.js
│       ├── tickets.test.js
│       ├── auth.test.js
│       └── comments.test.js
```

### Checkpoint

- `cd backend && npm test` — all tests pass
- State machine test file covers every allowed and minimum rejected transition from spec
- Tests use isolated test database (not development data)

---

## Phase 4 — Frontend UI

**Goal:** React application for all user-facing ticket management features.

### Tasks

- [x] Scaffold `frontend/` with Vite + React: `npm create vite@latest frontend -- --template react`
- [x] Install dependencies: `react-router-dom`, testing libs (`vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`)
- [x] Create [`frontend/src/api/client.js`](../../frontend/src/api/client.js) — fetch wrapper with `credentials: 'include'` and error parsing
- [x] Create [`frontend/src/context/AuthContext.jsx`](../../frontend/src/context/AuthContext.jsx) — login, logout, current user state
- [x] Create [`frontend/src/pages/LoginPage.jsx`](../../frontend/src/pages/LoginPage.jsx) — login form with error display
- [x] Create [`frontend/src/pages/TicketListPage.jsx`](../../frontend/src/pages/TicketListPage.jsx):
  - List all tickets from API
  - Keyword search input (debounced `q` param)
  - Status filter dropdown (`status` param)
  - Link to create ticket and ticket detail
- [x] Create [`frontend/src/pages/CreateTicketPage.jsx`](../../frontend/src/pages/CreateTicketPage.jsx) — form with validation error display
- [x] Create [`frontend/src/pages/TicketDetailPage.jsx`](../../frontend/src/pages/TicketDetailPage.jsx):
  - Display all ticket fields
  - Edit title, description, priority, assignee
  - Status change UI limited to valid next states (use `getAllowedTransitions` logic mirrored from spec or fetch from API)
  - Comments list and add-comment form
- [x] Create shared components:
  - [`frontend/src/components/ErrorAlert.jsx`](../../frontend/src/components/ErrorAlert.jsx)
  - [`frontend/src/components/StatusBadge.jsx`](../../frontend/src/components/StatusBadge.jsx)
  - [`frontend/src/components/PriorityBadge.jsx`](../../frontend/src/components/PriorityBadge.jsx)
  - [`frontend/src/components/ProtectedRoute.jsx`](../../frontend/src/components/ProtectedRoute.jsx)
- [x] Configure routing in [`frontend/src/App.jsx`](../../frontend/src/App.jsx)
- [x] Write React Testing Library unit tests:
  - [`frontend/src/pages/TicketListPage.test.jsx`](../../frontend/src/pages/TicketListPage.test.jsx) — renders list, search/filter UI
  - [`frontend/src/pages/CreateTicketPage.test.jsx`](../../frontend/src/pages/CreateTicketPage.test.jsx) — shows validation errors
  - [`frontend/src/components/ErrorAlert.test.jsx`](../../frontend/src/components/ErrorAlert.test.jsx) — renders error message

### Target Files

```
frontend/
├── package.json
├── .env.example
├── vite.config.js
└── src/
    ├── api/client.js
    ├── context/AuthContext.jsx
    ├── components/
    ├── pages/
    ├── App.jsx
    └── main.jsx
```

### Checkpoint

- `cd frontend && npm run dev` — app loads at `http://localhost:5173`
- Login flow works end-to-end with backend
- All CRUD operations work via UI
- Invalid status transitions show error message from API
- Search and filter update the ticket list
- `cd frontend && npm test` — unit tests pass

---

## Phase 5 — Polish & Verification

**Goal:** Documentation, persistence verification, and acceptance criteria sign-off.

### Tasks

- [x] Create root [`README.md`](../../README.md) with:
  - Prerequisites (Node.js, MongoDB)
  - Environment setup (copy `.env.example` → `.env`)
  - How to run backend, frontend, seed, and tests
  - Default login credentials (reference seed script, not hardcoded secrets)
- [ ] Verify data persistence: create tickets → stop backend and MongoDB → restart → data intact
- [ ] Walk through all items in [acceptance-criteria.md](./acceptance-criteria.md)
- [ ] Run secret scan: confirm no `.env` files tracked by git
- [ ] Optional: add [`.cursor/rules/support-tickets.mdc`](../../.cursor/rules/support-tickets.mdc) from [cursor-rules-or-instructions.md](./cursor-rules-or-instructions.md)

### Checkpoint

- All 11 acceptance criteria (AC-1 through AC-11) verified
- README instructions allow a fresh clone to run the app
- `backend` integration tests and `frontend` unit tests pass
- No secrets in repository

---

## Phase Summary

| Phase | Focus | Key Deliverable |
|-------|-------|-----------------|
| 0 | Workflow docs | Spec-driven workspace |
| 1 | Database & models | Mongoose schemas + seed script |
| 2 | Backend API | REST endpoints + state machine |
| 3 | Integration tests | State machine test suite (mandatory) |
| 4 | Frontend UI | React app with auth and ticket management |
| 5 | Polish | README + acceptance sign-off |

**Rule:** Do not skip phases. Do not start Phase N+1 until Phase N checkpoint passes.
