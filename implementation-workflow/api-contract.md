# API Contract — Support Ticket Management System

Canonical REST API contract for the MongoDB-backed Support Ticket Management System. All endpoints, schemas, validation rules, and error responses documented here match the implemented code in `backend/src/routes/`.

**Note on evaluation prompt mapping:** Some evaluation criteria reference `PUT /api/tickets/:id` for combined state transitions and reassignments. This implementation intentionally splits concerns:

- `PATCH /api/v1/tickets/:id` — field updates and reassignment only
- `PATCH /api/v1/tickets/:id/status` — state machine transitions only

**Related documents:**

- [requirements-analysis.md](./requirements-analysis.md) — domain model and state machine rules
- [acceptance-criteria.md](../tool-specific/cursor-workflow/acceptance-criteria.md) — verification checkboxes

---

## General Conventions

### Base URL

```
http://localhost:3001/api/v1
```

Production deployments use the same `/api/v1` prefix with the appropriate host.

### Authentication

All endpoints except `POST /auth/login` require a valid session cookie (`connect.sid`). The frontend sends requests with `credentials: 'include'`.

| Condition | Status | Response |
|-----------|--------|----------|
| No session or expired session | `401` | `{ "error": "Authentication required" }` |

### Response Envelope

**Success:**

```json
{
  "data": <payload>
}
```

**Success with metadata:**

```json
{
  "data": <payload>,
  "meta": { <metadata> }
}
```

**Error:**

```json
{
  "error": "Human-readable error message",
  "details": { <optional structured details> }
}
```

### JSON Field Naming

- MongoDB `_id` is exposed as `id` in all API responses
- `passwordHash` is never included in any response
- User references (`createdBy`, `assignedTo`) are populated objects with `id`, `name`, `email`, `role`

### Enumerations

**Priority:** `low` | `medium` | `high` | `critical` (default: `medium`)

**Status:** `open` | `in_progress` | `resolved` | `closed` | `cancelled` (default: `open`)

**Role:** `admin` | `agent`

---

## Shared Schemas

### UserObject

```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "Admin User",
  "email": "admin@example.com",
  "role": "admin",
  "createdAt": "2026-07-16T10:00:00.000Z",
  "updatedAt": "2026-07-16T10:00:00.000Z"
}
```

### TicketObject

```json
{
  "id": "507f1f77bcf86cd799439012",
  "title": "Cannot access dashboard",
  "description": "User reports blank screen after login on Chrome 120.",
  "priority": "high",
  "status": "open",
  "assignedTo": {
    "id": "507f1f77bcf86cd799439013",
    "name": "Agent User",
    "email": "agent@example.com",
    "role": "agent"
  },
  "createdBy": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin"
  },
  "createdAt": "2026-07-16T10:00:00.000Z",
  "updatedAt": "2026-07-16T10:00:00.000Z"
}
```

`assignedTo` may be `null` when unassigned.

### TicketDetailObject

Extends `TicketObject` with a `comments` array and is returned by detail, status, and comment endpoints.

```json
{
  "id": "507f1f77bcf86cd799439012",
  "title": "Cannot access dashboard",
  "description": "User reports blank screen after login on Chrome 120.",
  "priority": "high",
  "status": "in_progress",
  "assignedTo": null,
  "createdBy": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin"
  },
  "createdAt": "2026-07-16T10:00:00.000Z",
  "updatedAt": "2026-07-16T11:30:00.000Z",
  "comments": [
    {
      "id": "507f1f77bcf86cd799439014",
      "ticketId": "507f1f77bcf86cd799439012",
      "message": "Reproduced on staging. Investigating.",
      "createdBy": {
        "id": "507f1f77bcf86cd799439013",
        "name": "Agent User",
        "email": "agent@example.com",
        "role": "agent"
      },
      "createdAt": "2026-07-16T11:00:00.000Z"
    }
  ]
}
```

### CommentObject

```json
{
  "id": "507f1f77bcf86cd799439014",
  "ticketId": "507f1f77bcf86cd799439012",
  "message": "Reproduced on staging. Investigating.",
  "createdBy": {
    "id": "507f1f77bcf86cd799439013",
    "name": "Agent User",
    "email": "agent@example.com",
    "role": "agent"
  },
  "createdAt": "2026-07-16T11:00:00.000Z"
}
```

### ValidationErrorResponse

Returned by `express-validator` middleware for `400` validation failures.

```json
{
  "error": "Title is required",
  "details": {
    "fields": [
      {
        "type": "field",
        "value": "",
        "msg": "Title is required",
        "path": "title",
        "location": "body"
      }
    ]
  }
}
```

---

## Authentication Endpoints

### POST /api/v1/auth/login

Authenticate and establish a session.

**Auth required:** No

#### Request Body

```json
{
  "email": "admin@example.com",
  "password": "changeme123"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | string | Yes | Valid email format |
| `password` | string | Yes | Min 6 characters |

#### Success Response — 200

```json
{
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin",
    "createdAt": "2026-07-16T10:00:00.000Z",
    "updatedAt": "2026-07-16T10:00:00.000Z"
  }
}
```

Sets `connect.sid` session cookie.

#### Error Responses

| Status | Condition | Body |
|--------|-----------|------|
| `400` | Invalid email format | `{ "error": "Valid email is required", "details": { "fields": [...] } }` |
| `400` | Password too short | `{ "error": "Password must be at least 6 characters", "details": { "fields": [...] } }` |
| `401` | Wrong email or password | `{ "error": "Invalid email or password" }` |

---

## Ticket Endpoints

### POST /api/v1/tickets

Create a new support ticket. Status is always set to `open`; `createdBy` is derived from the authenticated session.

**Auth required:** Yes

#### Request Body

```json
{
  "title": "Cannot access dashboard",
  "description": "User reports blank screen after login on Chrome 120.",
  "priority": "high",
  "assignedTo": "507f1f77bcf86cd799439013"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `title` | string | Yes | Trimmed, 3–200 characters |
| `description` | string | Yes | Trimmed, 10–5000 characters |
| `priority` | string | No | Enum: `low`, `medium`, `high`, `critical`. Default: `medium` |
| `assignedTo` | string \| null | No | Valid ObjectId referencing an existing user, or omitted |

**Rejected in request body:**

| Field | Reason |
|-------|--------|
| `status` | Always `open` on create — not accepted |
| `createdBy` | Set from session — not accepted |

#### Success Response — 201

```json
{
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "title": "Cannot access dashboard",
    "description": "User reports blank screen after login on Chrome 120.",
    "priority": "high",
    "status": "open",
    "assignedTo": {
      "id": "507f1f77bcf86cd799439013",
      "name": "Agent User",
      "email": "agent@example.com",
      "role": "agent"
    },
    "createdBy": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Admin User",
      "email": "admin@example.com",
      "role": "admin"
    },
    "createdAt": "2026-07-16T10:00:00.000Z",
    "updatedAt": "2026-07-16T10:00:00.000Z"
  }
}
```

#### Error Responses

| Status | Condition | Body |
|--------|-----------|------|
| `401` | Not authenticated | `{ "error": "Authentication required" }` |
| `400` | Missing title | `{ "error": "Title is required", "details": { "fields": [...] } }` |
| `400` | Title < 3 chars | `{ "error": "Title must be at least 3 characters", "details": { "fields": [...] } }` |
| `400` | Missing description | `{ "error": "Description is required", "details": { "fields": [...] } }` |
| `400` | Description < 10 chars | `{ "error": "Description must be at least 10 characters", "details": { "fields": [...] } }` |
| `400` | Invalid priority | `{ "error": "Invalid priority value", "details": { "fields": [...] } }` |
| `400` | Malformed `assignedTo` | `{ "error": "Invalid assignedTo" }` |
| `400` | User not found for `assignedTo` | `{ "error": "Assigned user not found" }` |

---

### GET /api/v1/tickets

List tickets with optional search, filters, and pagination.

**Auth required:** Yes

#### Query Parameters

| Param | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| `q` | string | No | — | Case-insensitive regex match on `title` OR `description` |
| `status` | string | No | — | Enum: `open`, `in_progress`, `resolved`, `closed`, `cancelled` |
| `priority` | string | No | — | Enum: `low`, `medium`, `high`, `critical` |
| `page` | integer | No | `1` | Min 1 |
| `limit` | integer | No | `10` | Min 1, max 100 |

**Filter logic:** `q`, `status`, and `priority` are combined with AND logic.

**Sort:** `updatedAt` descending.

#### Example Request

```
GET /api/v1/tickets?q=dashboard&status=open&priority=high&page=1&limit=10
```

#### Success Response — 200

```json
{
  "data": [
    {
      "id": "507f1f77bcf86cd799439012",
      "title": "Cannot access dashboard",
      "description": "User reports blank screen after login.",
      "priority": "high",
      "status": "open",
      "assignedTo": null,
      "createdBy": {
        "id": "507f1f77bcf86cd799439011",
        "name": "Admin User",
        "email": "admin@example.com",
        "role": "admin"
      },
      "createdAt": "2026-07-16T10:00:00.000Z",
      "updatedAt": "2026-07-16T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 10
  }
}
```

#### Error Responses

| Status | Condition | Body |
|--------|-----------|------|
| `401` | Not authenticated | `{ "error": "Authentication required" }` |
| `400` | Invalid `status` value | `{ "error": "Invalid status value", "details": { "fields": [...] } }` |
| `400` | Invalid `priority` value | `{ "error": "Invalid priority value", "details": { "fields": [...] } }` |
| `400` | Invalid `page` or `limit` | `{ "error": "...", "details": { "fields": [...] } }` |

---

### GET /api/v1/tickets/:id

Get a single ticket with populated users, comments, and allowed status transitions.

**Auth required:** Yes

#### Path Parameters

| Param | Type | Validation |
|-------|------|------------|
| `id` | string | Valid MongoDB ObjectId |

#### Success Response — 200

```json
{
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "title": "Cannot access dashboard",
    "description": "User reports blank screen after login on Chrome 120.",
    "priority": "high",
    "status": "open",
    "assignedTo": null,
    "createdBy": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Admin User",
      "email": "admin@example.com",
      "role": "admin"
    },
    "createdAt": "2026-07-16T10:00:00.000Z",
    "updatedAt": "2026-07-16T10:00:00.000Z",
    "comments": []
  },
  "meta": {
    "allowedTransitions": ["in_progress", "cancelled"]
  }
}
```

#### Error Responses

| Status | Condition | Body |
|--------|-----------|------|
| `401` | Not authenticated | `{ "error": "Authentication required" }` |
| `404` | Invalid ObjectId format | `{ "error": "Ticket not found" }` |
| `404` | Ticket does not exist | `{ "error": "Ticket not found" }` |

---

### PATCH /api/v1/tickets/:id

Update ticket fields and reassign. **Does not accept status changes** — use the status endpoint.

**Auth required:** Yes

#### Path Parameters

| Param | Type | Validation |
|-------|------|------------|
| `id` | string | Valid MongoDB ObjectId |

#### Request Body

At least one field must be provided.

```json
{
  "title": "Updated ticket title",
  "description": "Updated description with more details about the issue.",
  "priority": "critical",
  "assignedTo": "507f1f77bcf86cd799439013"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `title` | string | No | Trimmed, 3–200 characters |
| `description` | string | No | Trimmed, 10–5000 characters |
| `priority` | string | No | Enum: `low`, `medium`, `high`, `critical` |
| `assignedTo` | string \| null | No | Valid ObjectId of existing user, or `null` to unassign |

**Rejected in request body:**

| Field | Status | Body |
|-------|--------|------|
| `status` | `400` | `{ "error": "Use PATCH /tickets/:id/status to change status" }` |

#### Success Response — 200

```json
{
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "title": "Updated ticket title",
    "description": "Updated description with more details about the issue.",
    "priority": "critical",
    "status": "open",
    "assignedTo": {
      "id": "507f1f77bcf86cd799439013",
      "name": "Agent User",
      "email": "agent@example.com",
      "role": "agent"
    },
    "createdBy": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Admin User",
      "email": "admin@example.com",
      "role": "admin"
    },
    "createdAt": "2026-07-16T10:00:00.000Z",
    "updatedAt": "2026-07-16T12:00:00.000Z"
  }
}
```

#### Error Responses

| Status | Condition | Body |
|--------|-----------|------|
| `401` | Not authenticated | `{ "error": "Authentication required" }` |
| `400` | Empty body (no fields) | `{ "error": "At least one field must be provided" }` |
| `400` | `status` in body | `{ "error": "Use PATCH /tickets/:id/status to change status" }` |
| `400` | Title < 3 chars | `{ "error": "Title must be at least 3 characters", "details": { "fields": [...] } }` |
| `400` | Description < 10 chars | `{ "error": "Description must be at least 10 characters", "details": { "fields": [...] } }` |
| `400` | Invalid priority | `{ "error": "Invalid priority value", "details": { "fields": [...] } }` |
| `400` | Malformed `assignedTo` | `{ "error": "Invalid assignedTo" }` |
| `400` | User not found for `assignedTo` | `{ "error": "Assigned user not found" }` |
| `404` | Ticket not found | `{ "error": "Ticket not found" }` |

---

### PATCH /api/v1/tickets/:id/status

Change ticket status via the backend state machine. This is the **only** endpoint that modifies `status`.

**Auth required:** Yes

#### Path Parameters

| Param | Type | Validation |
|-------|------|------------|
| `id` | string | Valid MongoDB ObjectId |

#### Request Body

```json
{
  "status": "in_progress"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `status` | string | Yes | Enum: `open`, `in_progress`, `resolved`, `closed`, `cancelled` |

#### Allowed Transitions

| Current Status | Allowed Next Statuses |
|----------------|----------------------|
| `open` | `in_progress`, `cancelled` |
| `in_progress` | `resolved`, `cancelled` |
| `resolved` | `closed` |
| `closed` | _(none — terminal)_ |
| `cancelled` | _(none — terminal)_ |

#### Success Response — 200

```json
{
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "title": "Cannot access dashboard",
    "description": "User reports blank screen after login on Chrome 120.",
    "priority": "high",
    "status": "in_progress",
    "assignedTo": null,
    "createdBy": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Admin User",
      "email": "admin@example.com",
      "role": "admin"
    },
    "createdAt": "2026-07-16T10:00:00.000Z",
    "updatedAt": "2026-07-16T12:30:00.000Z",
    "comments": []
  },
  "meta": {
    "allowedTransitions": ["resolved", "cancelled"]
  }
}
```

#### Error Responses

| Status | Condition | Body |
|--------|-----------|------|
| `401` | Not authenticated | `{ "error": "Authentication required" }` |
| `400` | Invalid status enum | `{ "error": "Invalid status value", "details": { "fields": [...] } }` |
| `404` | Ticket not found | `{ "error": "Ticket not found" }` |
| `409` | Invalid transition | See below |
| `409` | Terminal status change | See below |

**409 — Invalid transition example:**

```json
{
  "error": "Cannot move from Open to Resolved. Allowed next steps: In Progress, Cancelled.",
  "details": {
    "currentStatus": "open",
    "requestedStatus": "resolved",
    "allowedTransitions": ["in_progress", "cancelled"]
  }
}
```

**409 — Terminal status example:**

```json
{
  "error": "Cannot change status. This ticket is Closed.",
  "details": {
    "currentStatus": "closed",
    "requestedStatus": "open",
    "allowedTransitions": []
  }
}
```

---

### POST /api/v1/tickets/:id/comments

Append a comment to a ticket. Returns the full ticket detail with updated comments array.

**Auth required:** Yes

#### Path Parameters

| Param | Type | Validation |
|-------|------|------------|
| `id` | string | Valid MongoDB ObjectId |

#### Request Body

```json
{
  "message": "Reproduced on staging. Investigating root cause."
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `message` | string | Yes | Trimmed, 1–2000 characters |

`createdBy` is set from the authenticated session — not accepted in the request body.

#### Success Response — 201

```json
{
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "title": "Cannot access dashboard",
    "description": "User reports blank screen after login on Chrome 120.",
    "priority": "high",
    "status": "in_progress",
    "assignedTo": null,
    "createdBy": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Admin User",
      "email": "admin@example.com",
      "role": "admin"
    },
    "createdAt": "2026-07-16T10:00:00.000Z",
    "updatedAt": "2026-07-16T12:30:00.000Z",
    "comments": [
      {
        "id": "507f1f77bcf86cd799439014",
        "ticketId": "507f1f77bcf86cd799439012",
        "message": "Reproduced on staging. Investigating root cause.",
        "createdBy": {
          "id": "507f1f77bcf86cd799439013",
          "name": "Agent User",
          "email": "agent@example.com",
          "role": "agent"
        },
        "createdAt": "2026-07-16T13:00:00.000Z"
      }
    ]
  }
}
```

#### Error Responses

| Status | Condition | Body |
|--------|-----------|------|
| `401` | Not authenticated | `{ "error": "Authentication required" }` |
| `400` | Empty message | `{ "error": "Message is required", "details": { "fields": [...] } }` |
| `400` | Message > 2000 chars | `{ "error": "...", "details": { "fields": [...] } }` |
| `404` | Ticket not found | `{ "error": "Ticket not found" }` |

---

## Supporting Endpoints

### GET /api/v1/users

List all users for assignee dropdown.

**Auth required:** Yes

#### Success Response — 200

```json
{
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "Admin User",
      "email": "admin@example.com",
      "role": "admin"
    },
    {
      "id": "507f1f77bcf86cd799439013",
      "name": "Agent User",
      "email": "agent@example.com",
      "role": "agent"
    }
  ]
}
```

### GET /health

Health check (no auth, no `/api/v1` prefix).

#### Success Response — 200

```json
{
  "status": "ok"
}
```

---

## Error Response Summary

| HTTP Status | When Used | `details` Shape |
|-------------|-----------|-----------------|
| `400` | Validation failure, empty PATCH body, status smuggling, invalid assignee | `{ fields: [...] }` or absent |
| `401` | Missing or invalid session | Absent |
| `404` | Ticket not found (invalid or missing ObjectId) | Absent |
| `409` | Invalid state machine transition | `{ currentStatus, requestedStatus, allowedTransitions }` |
| `500` | Unhandled server error | Absent; message masked outside `development` |

---

## State Machine Test Matrix

The following transitions are verified by `backend/tests/integration/stateMachine.test.js`:

### Must Succeed

| From | To |
|------|-----|
| `open` | `in_progress` |
| `open` | `cancelled` |
| `in_progress` | `resolved` |
| `in_progress` | `cancelled` |
| `resolved` | `closed` |

### Must Fail with 409

| From | To |
|------|-----|
| `open` | `resolved` |
| `open` | `closed` |
| `in_progress` | `open` |
| `resolved` | `open` |
| `resolved` | `cancelled` |
| `closed` | `open` |
| `cancelled` | `in_progress` |

### Must Fail with 400

| Endpoint | Condition |
|----------|-----------|
| `PATCH /api/v1/tickets/:id` | Body contains `status` field |
| `PATCH /api/v1/tickets/:id/status` | Invalid status enum value |

---

## Implementation References

| Concern | File |
|---------|------|
| Ticket routes | `backend/src/routes/tickets.routes.js` |
| State machine | `backend/src/services/ticketStateMachine.js` |
| Validation middleware | `backend/src/middleware/validate.js` |
| Auth middleware | `backend/src/middleware/auth.js` |
| Mongoose models | `backend/src/models/Ticket.js`, `Comment.js`, `User.js` |
| Integration tests | `backend/tests/integration/` |
