# Acceptance Criteria — Support Ticket Management System

Testable definitions of done for the MongoDB-backed ticket state machine application. Every criterion MUST pass before the project is considered complete.

This document combines **Given/When/Then acceptance criteria (AC-1 through AC-11)** with **detailed verification checklists** for core flows, state validation, error handling, integration tests, and repository hygiene.

**Workflow references:**

- [submission-index.md](./submission-index.md) — assessor entry point and documentation map
- [tool-workflow.md](./tool-workflow.md) — narrative AI workflow (phases, decisions, validation gates)
- [candidate-info.md](./candidate-info.md) — candidate metadata, tools, and setup
- [prompt-history.md](./prompt-history.md) — AI prompt log with validation traceability
- [spec.md](./spec.md) — schemas, API, state machine
- [project-context.md](./project-context.md) — stack and conventions
- [tasks.md](./tasks.md) — implementation phases

**Evaluation references (`implementation-workflow/`):**

- [requirements-analysis.md](../../implementation-workflow/requirements-analysis.md) — domain model and requirements
- [api-contract.md](../../implementation-workflow/api-contract.md) — REST API schemas and error responses
- [implementation-plan.md](../../implementation-workflow/implementation-plan.md) — milestones and verification strategy

---

## AC-1: Create Ticket via UI

**Requirement:** A user can create a ticket via the UI.

| | |
|---|---|
| **Given** | An authenticated user on the create ticket page |
| **When** | They submit a valid title, description, and optional priority/assignee |
| **Then** | The ticket is saved to MongoDB, API returns `201`, and the ticket appears in the ticket list |

**Verification:**

- [ ] Manual: fill create form → submit → ticket visible in list
- [ ] Authenticated user can create a ticket via the UI create form
- [ ] API: `POST /api/v1/tickets` returns `201` with ticket object including `id`, `status: "open"`, `createdBy`
- [ ] Created ticket has `status: "open"` regardless of request body
- [ ] `createdBy` is set from session user, not from request body
- [ ] New ticket appears in the ticket list after creation
- [ ] DB: document exists in `tickets` collection

---

## AC-2: View All Tickets from Database

**Requirement:** A user can view all tickets from the database.

| | |
|---|---|
| **Given** | Tickets exist in MongoDB (seeded or created) |
| **When** | An authenticated user opens the ticket list page |
| **Then** | All tickets from the database are displayed |

**Verification:**

- [ ] Manual: list page shows same count as MongoDB `db.tickets.countDocuments()`
- [ ] Restart API server → list still shows all tickets (data from DB, not memory)
- [ ] Authenticated user sees all tickets from MongoDB on the list page
- [ ] API: `GET /api/v1/tickets` returns `200` with `{ data: Ticket[], meta: { total, page, limit } }`
- [ ] List sorted by `updatedAt` descending (most recently updated first)

---

## AC-3: Open Ticket Detail View

**Requirement:** A user can open a ticket detail view.

| | |
|---|---|
| **Given** | A ticket exists in the database |
| **When** | An authenticated user clicks the ticket in the list |
| **Then** | The detail view shows title, description, priority, status, assignee, createdBy, timestamps, and comments |

**Verification:**

- [ ] Manual: click ticket → detail page renders all fields
- [ ] Clicking a ticket in the list navigates to `/tickets/:id`
- [ ] API: `GET /api/v1/tickets/:id` returns `200` with populated `assignedTo` and `createdBy`
- [ ] Detail response includes `comments` array (empty or populated)
- [ ] Detail response includes `meta.allowedTransitions` for current status
- [ ] UI displays title, description, priority, status, assignee, creator, timestamps, and comments

---

## AC-4: Update Ticket Fields and Reassign

**Requirement:** A user can update ticket fields and reassign.

| | |
|---|---|
| **Given** | An authenticated user on a ticket detail page |
| **When** | They update title, description, priority, or assignee and save |
| **Then** | Changes persist in MongoDB and are reflected in the UI |

**Verification:**

- [ ] Manual: edit fields → save → refresh → changes persist
- [ ] Manual: change assignee to another user → assignee name updates
- [ ] Manual: clear assignee → assignee shows as unassigned
- [ ] User can edit title, description, priority on the detail page
- [ ] User can assign or reassign ticket to another user via dropdown
- [ ] API: `PATCH /api/v1/tickets/:id` returns `200` with updated fields
- [ ] Changes persist after page refresh (MongoDB, not client state)
- [ ] `updatedAt` timestamp changes after update

---

## AC-5: Add Comments

**Requirement:** A user can add comments to a ticket.

| | |
|---|---|
| **Given** | An authenticated user on a ticket detail page |
| **When** | They submit a comment with non-empty body |
| **Then** | The comment is saved on the ticket with author and timestamp |

**Verification:**

- [ ] Manual: add comment → appears in comments list immediately or after refresh
- [ ] Comment shows author display name and timestamp
- [ ] User can submit a comment on the ticket detail page
- [ ] API: `POST /api/v1/tickets/:id/comments` returns `201` with full ticket including updated `comments`
- [ ] `createdBy` is set from session user, not request body
- [ ] Restart server → comment still visible (AC-8 overlap)

---

## AC-6: Valid Status Transitions Only

**Requirement:** Status changes only through valid transitions; invalid ones are rejected.

| | |
|---|---|
| **Given** | A ticket in a known status |
| **When** | A status change is requested |
| **Then** | Allowed transitions succeed (`200`); invalid transitions are rejected (`409`) with allowed alternatives |

**Verification:**

- [ ] **Automated:** `backend/tests/integration/stateMachine.test.js` — all tests pass
- [ ] Allowed: all 5 transitions from [spec.md](./spec.md) succeed
- [ ] Rejected: minimum 7 invalid transitions return `409` with `details.allowedTransitions`
- [ ] Manual: UI only offers valid next statuses; attempting invalid change shows error message
- [ ] `PATCH /api/v1/tickets/:id` with `status` field returns `400` (must use status endpoint)
- [ ] No fields are modified when status smuggling is attempted
- [ ] `PATCH /api/v1/tickets/:id/status` is the only endpoint that changes status
- [ ] `409` responses include `details: { currentStatus, requestedStatus, allowedTransitions }`
- [ ] Detail page renders transition buttons only for `meta.allowedTransitions`
- [ ] Terminal tickets (`closed`, `cancelled`) show no transition buttons
- [ ] After successful transition, UI updates status and refreshes available transitions

---

## AC-7: Keyword Search, Status Filter, Priority Filter, and Infinite Scroll

**Requirement:** Keyword search, status filter, and priority filter work. Ticket list loads 10 items at a time with infinite scroll.

| | |
|---|---|
| **Given** | Multiple tickets with different titles, descriptions, statuses, and priorities |
| **When** | User enters a keyword, selects status and/or priority filters, or scrolls the list |
| **Then** | Matching tickets are shown; additional pages load automatically in batches of 10 |

**Verification:**

- [ ] Manual: search by word in title → matching tickets shown
- [ ] Manual: search by word in description → matching tickets shown
- [ ] Manual: filter by status → only tickets with that status shown
- [ ] Manual: filter by priority → only tickets with that priority shown
- [ ] Manual: combine search + status + priority → AND logic applied
- [ ] Manual: scroll list → next 10 tickets load until all results shown
- [ ] API: `GET /api/v1/tickets?q=keyword` returns filtered results
- [ ] API: `GET /api/v1/tickets?status=open` returns only open tickets
- [ ] API: `GET /api/v1/tickets?priority=high` returns only high-priority tickets
- [ ] API: `GET /api/v1/tickets?limit=10&page=1` returns at most 10 tickets with `meta.total`
- [ ] `GET /api/v1/tickets?limit=10&page=2` returns next page with correct `meta.total`
- [ ] Frontend infinite scroll loads next page when user scrolls near list bottom
- [ ] Invalid `status` or `priority` query param returns `400`
- [ ] Search is case-insensitive

---

## AC-8: Data Survives Restart

**Requirement:** Data remains available after restart.

| | |
|---|---|
| **Given** | Tickets and comments exist in the database |
| **When** | The backend server and MongoDB are stopped and restarted |
| **Then** | All previously created data is still accessible |

**Verification:**

- [ ] Manual: create ticket + comment → stop backend → start backend → data visible
- [ ] Manual: stop MongoDB container → start MongoDB → data intact (volume persistence)
- [ ] Tickets and comments survive backend server restart
- [ ] No in-memory-only storage used for tickets, comments, or users

---

## AC-9: Backend Validation Prevents Invalid Records

**Requirement:** Validate required fields; reject invalid input at the backend.

| | |
|---|---|
| **Given** | An API request with missing or invalid data |
| **When** | The request reaches the backend |
| **Then** | The backend returns `400` with a meaningful error message; no invalid document is saved |

**Verification:**

- [ ] **Automated:** validation tests in `backend/tests/integration/tickets.test.js` pass
- [ ] Create without title → `400`: `"Title is required"`
- [ ] Create with title < 3 chars → `400`: `"Title must be at least 3 characters"`
- [ ] Create without description → `400`: `"Description is required"`
- [ ] Create with description < 10 chars → `400`: `"Description must be at least 10 characters"`
- [ ] Create with invalid priority → `400`: `"Invalid priority value"`
- [ ] PATCH with empty body → `400`: `"At least one field must be provided"`
- [ ] Assignee with malformed ObjectId → `400`: `"Invalid assignedTo"`
- [ ] Assignee with valid ObjectId but no user → `400`: `"Assigned user not found"`
- [ ] Add empty comment → `400`: `"Message is required"`
- [ ] Manual: UI displays server error message to user (not silent failure)
- [ ] API errors displayed via `ErrorAlert` component (not console-only)

---

## AC-10: No Secrets Committed to Repo

**Requirement:** No secrets committed to the repository.

| | |
|---|---|
| **Given** | The repository is under version control |
| **When** | Inspecting tracked files |
| **Then** | No `.env` files, passwords, API keys, or session secrets are committed |

**Verification:**

- [ ] `.env` is listed in `.gitignore` and not tracked by git
- [ ] `git status` does not show any `.env` file as tracked
- [ ] Only `.env.example` files exist with placeholder values like `your-session-secret-here`
- [ ] No hardcoded `SESSION_SECRET`, passwords, or `MONGODB_URI` with credentials in source code
- [ ] `passwordHash` never returned in any API response
- [ ] `git log` and `git grep` find no committed secrets

---

## AC-11: State-Machine Integration Tests Pass

**Requirement:** State-machine integration tests pass (mandatory test tier).

| | |
|---|---|
| **Given** | The backend test suite is configured with a test database |
| **When** | `npm test` is run in `backend/` |
| **Then** | All state machine integration tests pass |

**Verification:**

- [ ] `cd backend && npm test` exits with code 0
- [ ] Tests use `mongodb-memory-server` (isolated from development database)
- [ ] Collections cleared between tests in `backend/tests/setup.js`
- [ ] Test helpers available in `backend/tests/helpers.js`
- [ ] `stateMachine.test.js` covers all transitions from [spec.md test matrix](./spec.md#integration-test-matrix-state-machine)
- [ ] `tickets.test.js` covers auth, CRUD, filters, pagination, validation
- [ ] `comments.test.js` covers comment creation, validation, and 404 cases

---

## Strict State Validation — Transition Matrix

Detailed checkboxes supplementing AC-6. All items MUST pass.

### Allowed Transitions (Must Succeed)

- [ ] `open` → `in_progress` returns `200`
- [ ] `open` → `cancelled` returns `200`
- [ ] `in_progress` → `resolved` returns `200`
- [ ] `in_progress` → `cancelled` returns `200`
- [ ] `resolved` → `closed` returns `200`

### Rejected Transitions (Must Return 409)

- [ ] `open` → `resolved` returns `409` with `details.allowedTransitions`
- [ ] `open` → `closed` returns `409`
- [ ] `in_progress` → `open` returns `409`
- [ ] `resolved` → `open` returns `409`
- [ ] `resolved` → `cancelled` returns `409`
- [ ] `closed` → `open` returns `409` with message indicating terminal status
- [ ] `cancelled` → `in_progress` returns `409` with message indicating terminal status

### Enforcement Rules

- [ ] Invalid `status` enum value in status endpoint returns `400`: `"Invalid status value"`
- [ ] Failed transition displays backend error message to user (not silent failure)

---

## Centralized Error Handling

Detailed checkboxes supplementing AC-9.

### HTTP Status Codes

- [ ] `401` — unauthenticated access to protected endpoints
- [ ] `400` — validation failures (missing fields, invalid enums, empty PATCH body, invalid assignee)
- [ ] `404` — ticket not found (invalid or non-existent ObjectId)
- [ ] `409` — invalid state machine transitions (not `400`)
- [ ] `500` — unhandled server errors masked outside `development` environment

### Error Response Format

- [ ] All errors return `{ "error": string }` at minimum
- [ ] Validation errors from `express-validator` include `details.fields` with per-field messages
- [ ] State machine `409` errors include `details` with transition metadata
- [ ] Mongoose `ValidationError` caught and returned as `400` with first error message

---

## Definition of Done — Master Checklist

Copy this checklist for final review or PR descriptions:

```
## Support Ticket System — Definition of Done

### Acceptance Criteria (AC-1 – AC-11)
- [ ] AC-1  Create ticket via UI
- [ ] AC-2  View all tickets from database
- [ ] AC-3  Open ticket detail view
- [ ] AC-4  Update ticket fields and reassign
- [ ] AC-5  Add comments
- [ ] AC-6  Valid status transitions only (integration tests pass)
- [ ] AC-7  Keyword search, status/priority filters, and infinite scroll (10 per page)
- [ ] AC-8  Data survives restart
- [ ] AC-9  Backend validation prevents invalid records
- [ ] AC-10 No secrets committed to repo
- [ ] AC-11 State-machine integration tests pass (`cd backend && npm test`)

### Core
- [ ] Authentication (login, logout, session, protected routes)
- [ ] Create ticket (UI + API 201 + DB persistence)
- [ ] List tickets (search, filters, pagination, infinite scroll)
- [ ] View ticket detail (populated users, comments, allowedTransitions)
- [ ] Update fields and reassign (PATCH + persistence)
- [ ] Add comments (UI + API 201 + persistence)
- [ ] Data survives restart

### State Machine
- [ ] All 5 allowed transitions succeed
- [ ] Invalid transitions return 409 with allowedTransitions
- [ ] Status smuggling via generic PATCH blocked (400)
- [ ] UI shows only valid transition buttons

### Error Handling
- [ ] Consistent error envelope across all endpoints
- [ ] Validation errors with details.fields
- [ ] 500 messages masked outside development

### Tests
- [ ] cd backend && npm test — exit code 0
- [ ] stateMachine.test.js covers full transition matrix
- [ ] tickets.test.js covers CRUD, filters, validation
- [ ] comments.test.js covers comment creation and validation

### Security
- [ ] No secrets committed to repository
```

---

## Traceability Matrix

| Core Requirement | Acceptance Criteria | Primary Verification | Test File |
|------------------|---------------------|----------------------|-----------|
| Create a ticket | AC-1 | Manual UI + API 201 | `tickets.test.js` |
| List tickets | AC-2, AC-7 | Manual UI + API 200 | `tickets.test.js` |
| View ticket details | AC-3 | Manual UI + API 200 | `tickets.test.js` |
| Update ticket fields | AC-4 | Manual UI + API 200 | `tickets.test.js` |
| Change ticket status | AC-6, AC-11 | Integration tests + Manual UI | `stateMachine.test.js` |
| Add comments | AC-5 | Manual UI + API 201 | `comments.test.js` |
| Keyword search & filter | AC-7 | Manual UI + query params | `tickets.test.js` |
| Persist all data | AC-8 | Manual restart test | — |
| Backend validation | AC-9 | Automated + Manual error UI | `tickets.test.js`, `comments.test.js` |
| No secrets in repo | AC-10 | git inspection | — |
| State-machine tests | AC-11 | `npm test` | `stateMachine.test.js` |
| Error handling | AC-9 | API error responses | All test files |
