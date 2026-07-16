# Acceptance Criteria — Support Ticket Management System

Actionable definitions of done for the MongoDB-backed ticket state machine application. Every checkbox MUST pass before the project is considered complete.

**Related documents:**

- [requirements-analysis.md](./requirements-analysis.md) — domain model and requirements
- [api-contract.md](./api-contract.md) — REST API schemas and error responses
- [implementation-plan.md](./implementation-plan.md) — milestones and verification strategy

---

## Core — UI, API, and Persistence

### Authentication

- [ ] Unauthenticated requests to ticket endpoints return `401` with `{ "error": "Authentication required" }`
- [ ] `POST /api/v1/auth/login` with valid seed credentials returns `200` and sets session cookie
- [ ] `POST /api/v1/auth/login` with invalid credentials returns `401` with `{ "error": "Invalid email or password" }`
- [ ] `GET /api/v1/auth/me` returns current user (`id`, `name`, `email`, `role`) when authenticated
- [ ] Frontend redirects unauthenticated users from protected routes to `/login`
- [ ] Logout destroys session and redirects to login page

### Create Ticket

- [ ] Authenticated user can create a ticket via the UI create form
- [ ] `POST /api/v1/tickets` with valid body returns `201` with ticket object
- [ ] Created ticket has `status: "open"` regardless of request body
- [ ] `createdBy` is set from session user, not from request body
- [ ] New ticket appears in the ticket list after creation
- [ ] Ticket document exists in MongoDB `tickets` collection

### List Tickets

- [ ] Authenticated user sees all tickets from MongoDB on the list page
- [ ] `GET /api/v1/tickets` returns `200` with `{ data: Ticket[], meta: { total, page, limit } }`
- [ ] List sorted by `updatedAt` descending (most recently updated first)
- [ ] Keyword search (`q`) matches case-insensitively against `title` OR `description`
- [ ] Status filter (`status`) returns only tickets with exact status match
- [ ] Priority filter (`priority`) returns only tickets with exact priority match
- [ ] Search, status, and priority filters are combinable (AND logic)
- [ ] Pagination defaults to `limit=10`, `page=1`
- [ ] `GET /api/v1/tickets?limit=10&page=2` returns next page with correct `meta.total`
- [ ] Frontend infinite scroll loads next page when user scrolls near list bottom
- [ ] Invalid `status` or `priority` query param returns `400`

### View Ticket Detail

- [ ] Clicking a ticket in the list navigates to `/tickets/:id`
- [ ] `GET /api/v1/tickets/:id` returns `200` with populated `assignedTo` and `createdBy`
- [ ] Detail response includes `comments` array (empty or populated)
- [ ] Detail response includes `meta.allowedTransitions` for current status
- [ ] UI displays title, description, priority, status, assignee, creator, timestamps, and comments

### Update Ticket Fields and Reassign

- [ ] User can edit title, description, priority on the detail page
- [ ] User can assign or reassign ticket to another user via dropdown
- [ ] User can clear assignee (set to unassigned)
- [ ] `PATCH /api/v1/tickets/:id` returns `200` with updated ticket object
- [ ] Changes persist after page refresh (MongoDB, not client state)
- [ ] `updatedAt` timestamp changes after update

### Add Comments

- [ ] User can submit a comment on the ticket detail page
- [ ] `POST /api/v1/tickets/:id/comments` returns `201` with full ticket including updated `comments`
- [ ] Comment displays author name and `createdAt` timestamp
- [ ] `createdBy` is set from session user, not request body
- [ ] Comments persist after server restart

### Data Persistence

- [ ] Tickets and comments survive backend server restart
- [ ] Data survives MongoDB container restart (Docker volume persistence)
- [ ] No in-memory-only storage for tickets, comments, or users

---

## Strict State Validation

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

### State Machine Enforcement

- [ ] `PATCH /api/v1/tickets/:id` with `status` in body returns `400`: `"Use PATCH /tickets/:id/status to change status"`
- [ ] No fields are modified when status smuggling is attempted
- [ ] `PATCH /api/v1/tickets/:id/status` is the only endpoint that changes status
- [ ] Invalid `status` enum value in status endpoint returns `400`: `"Invalid status value"`
- [ ] `409` responses include `details: { currentStatus, requestedStatus, allowedTransitions }`

### UI State Machine Integration

- [ ] Detail page renders transition buttons only for `meta.allowedTransitions`
- [ ] Terminal tickets (`closed`, `cancelled`) show no transition buttons
- [ ] Failed transition displays backend error message to user (not silent failure)
- [ ] After successful transition, UI updates status and refreshes available transitions

---

## Centralized Error Handling

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

### Validation Rejections (400)

- [ ] Create without title → `400`: `"Title is required"`
- [ ] Create with title < 3 characters → `400`: `"Title must be at least 3 characters"`
- [ ] Create without description → `400`: `"Description is required"`
- [ ] Create with description < 10 characters → `400`: `"Description must be at least 10 characters"`
- [ ] Create with invalid priority → `400`: `"Invalid priority value"`
- [ ] PATCH with empty body → `400`: `"At least one field must be provided"`
- [ ] Assignee with malformed ObjectId → `400`: `"Invalid assignedTo"`
- [ ] Assignee with valid ObjectId but no user → `400`: `"Assigned user not found"`
- [ ] Comment with empty message → `400`: `"Message is required"`

### Frontend Error Display

- [ ] API errors displayed to user via `ErrorAlert` component (not console-only)
- [ ] Validation errors from backend shown on create and detail forms

---

## Mandatory Integration Tests

### Test Infrastructure

- [ ] `cd backend && npm test` exits with code 0
- [ ] Tests use `mongodb-memory-server` (isolated from development database)
- [ ] Collections cleared between tests in `backend/tests/setup.js`
- [ ] Test helpers available in `backend/tests/helpers.js`

### `backend/tests/integration/tickets.test.js`

- [ ] Authentication tests (401 without session, login success, invalid credentials)
- [ ] Ticket creation tests (201, required fields, default status `open`)
- [ ] Ticket listing tests (pagination, `meta.total`, sorting)
- [ ] Filter tests (`q`, `status`, `priority` query params)
- [ ] Ticket detail test (200 with populated fields)
- [ ] Ticket update tests (field changes, reassignment)
- [ ] Validation rejection tests (400 for invalid input)

### `backend/tests/integration/stateMachine.test.js`

- [ ] All 5 allowed transitions succeed
- [ ] Minimum 7 rejected transitions return `409`
- [ ] Rejected transitions include `details.allowedTransitions`
- [ ] Terminal status transitions rejected
- [ ] `PATCH /tickets/:id` with `status` field returns `400`
- [ ] Status endpoint returns updated `meta.allowedTransitions`

### `backend/tests/integration/comments.test.js`

- [ ] Add comment returns `201` with updated comments array
- [ ] Empty comment message rejected with `400`
- [ ] Comment on non-existent ticket returns `404`

---

## Security and Repository Hygiene

- [ ] `.env` files listed in `.gitignore` and not tracked by git
- [ ] Only `.env.example` files committed with placeholder values
- [ ] No hardcoded `SESSION_SECRET`, passwords, or credentials in source code
- [ ] `passwordHash` never returned in any API response
- [ ] `git grep` finds no committed secrets

---

## Definition of Done — Master Checklist

Copy this checklist for final review:

```
## Support Ticket System — Definition of Done

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

| Core Requirement | Primary Verification | Test File |
|------------------|---------------------|-----------|
| Create ticket | Manual UI + `POST /api/v1/tickets` 201 | `tickets.test.js` |
| List tickets | Manual UI + `GET /api/v1/tickets` 200 | `tickets.test.js` |
| View detail | Manual UI + `GET /api/v1/tickets/:id` 200 | `tickets.test.js` |
| Update fields | Manual UI + `PATCH /api/v1/tickets/:id` 200 | `tickets.test.js` |
| Change status | Manual UI + status endpoint 200/409 | `stateMachine.test.js` |
| Add comments | Manual UI + `POST .../comments` 201 | `comments.test.js` |
| Search and filter | Manual UI + query params | `tickets.test.js` |
| Persist data | Manual restart test | — |
| Backend validation | API 400 responses | `tickets.test.js`, `comments.test.js` |
| State machine tests | `npm test` exit 0 | `stateMachine.test.js` |
| No secrets | git inspection | — |
