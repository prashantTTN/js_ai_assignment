# Acceptance Criteria — Support Ticket Management System

Testable definitions of done for each core requirement. Every criterion MUST pass before the project is considered complete.

**References:**

- [spec.md](./spec.md) — schemas, API, state machine
- [project-context.md](./project-context.md) — stack and conventions
- [tasks.md](./tasks.md) — implementation phases

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
- [ ] API: `POST /api/v1/tickets` returns `201` with ticket object including `_id`, `status: "open"`, `createdBy`
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
- [ ] API: `GET /api/v1/tickets` returns `200` with array of tickets

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
- [ ] API: `GET /api/v1/tickets/:id` returns `200` with populated assignee and createdBy
- [ ] Comments section visible (empty or with existing comments)

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
- [ ] API: `PATCH /api/v1/tickets/:id` returns `200` with updated fields
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
- [ ] API: `POST /api/v1/tickets/:id/comments` returns `201`
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
- [ ] Allowed: all 9 transitions from [spec.md](./spec.md) succeed
- [ ] Rejected: minimum 7 invalid transitions return `409` with `details.allowedTransitions`
- [ ] Manual: UI only offers valid next statuses; attempting invalid change shows error message
- [ ] `PATCH /tickets/:id` with `status` field returns `400` (must use status endpoint)

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
- [ ] No in-memory-only storage used for tickets or users

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
- [ ] Create without title → `400`
- [ ] Create with title < 3 chars → `400`
- [ ] Create with description < 10 chars → `400`
- [ ] Create with invalid priority → `400`
- [ ] Add empty comment → `400`
- [ ] Manual: UI displays server error message to user (not silent failure)

---

## AC-10: No Secrets Committed to Repo

**Requirement:** No secrets committed to the repository.

| | |
|---|---|
| **Given** | The repository is under version control |
| **When** | Inspecting tracked files |
| **Then** | No `.env` files, passwords, API keys, or session secrets are committed |

**Verification:**

- [ ] `.env` is listed in `.gitignore`
- [ ] `git status` does not show any `.env` file as tracked
- [ ] Only `.env.example` files exist with placeholder values like `your-session-secret-here`
- [ ] No hardcoded `SESSION_SECRET`, passwords, or `MONGODB_URI` with credentials in source code
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
- [ ] `stateMachine.test.js` exists and covers all transitions from [spec.md test matrix](./spec.md#integration-test-matrix-state-machine)
- [ ] Tests run against isolated test DB (not development data)

---

## Definition of Done Checklist

Copy this checklist into PR descriptions or final review:

```
## Support Ticket System — Definition of Done

- [ ] AC-1  Create ticket via UI
- [ ] AC-2  View all tickets from database
- [ ] AC-3  Open ticket detail view
- [ ] AC-4  Update ticket fields and reassign
- [ ] AC-5  Add comments
- [ ] AC-6  Valid status transitions only (integration tests pass)
- [ ] AC-7  Keyword search, status/priority filters, and infinite scroll (10 per page) work
- [ ] AC-8  Data survives restart
- [ ] AC-9  Backend validation prevents invalid records
- [ ] AC-10 No secrets committed to repo
- [ ] AC-11 State-machine integration tests pass (`cd backend && npm test`)
```

---

## Traceability Matrix

| Core Requirement | Acceptance Criteria | Primary Verification |
|------------------|---------------------|----------------------|
| Create a ticket | AC-1 | Manual UI + API 201 |
| List tickets | AC-2 | Manual UI + API 200 |
| View ticket details | AC-3 | Manual UI + API 200 |
| Update ticket fields | AC-4 | Manual UI + API 200 |
| Change ticket status | AC-6, AC-11 | Integration tests + Manual UI |
| Add comments | AC-5 | Manual UI + API 201 |
| Keyword search & filter | AC-7 | Manual UI + API query params (`q`, `status`, `priority`, `page`, `limit`) |
| Persist all data | AC-8 | Manual restart test |
| Backend validation | AC-9 | Automated + Manual error UI |
| No secrets in repo | AC-10 | git inspection |
| State-machine tests | AC-11 | `npm test` |
