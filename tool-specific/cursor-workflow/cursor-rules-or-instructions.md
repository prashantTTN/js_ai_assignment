# Cursor Rules & Instructions — Support Ticket Management System

Custom instructions for AI-assisted development in Cursor. These rules ensure generated code strictly adheres to schemas, validation rules, state machine logic, and security practices defined in the workflow documents.

---

## Workflow Documents (Read First)

Before writing or modifying any application code, you MUST read:

1. [spec.md](./spec.md) — canonical schemas, API contract, state machine
2. [tasks.md](./tasks.md) — current implementation phase and checkpoint
3. [acceptance-criteria.md](./acceptance-criteria.md) — definitions of done
4. [project-context.md](./project-context.md) — stack, layout, env vars

Identify the **current phase** in [tasks.md](./tasks.md) and only implement tasks for that phase unless explicitly instructed otherwise.

---

## Mandatory Rules

### 1. Spec Fidelity

- Mongoose schemas MUST match [spec.md](./spec.md) field names, types, enums, and validation rules exactly.
- Do NOT add, rename, or remove schema fields without updating [spec.md](./spec.md) first.
- API endpoints MUST match the paths, methods, and request/response shapes in [spec.md](./spec.md).
- Error responses MUST use the shape: `{ "error": string, "details": object? }`.

### 2. State Machine Enforcement

- Status changes MUST go through `PATCH /api/v1/tickets/:id/status` only.
- The generic `PATCH /api/v1/tickets/:id` endpoint MUST reject `status` in the request body with `400`.
- Implement transition logic in a dedicated service module (e.g. `backend/src/services/ticketStateMachine.js`).
- The transition table MUST match [spec.md](./spec.md) — do not invent additional transitions.
- Invalid transitions MUST return `409 Conflict` with `details.allowedTransitions`.
- Export `getAllowedTransitions`, `isValidTransition`, and `assertValidTransition` from the state machine module.

### 3. Validation

- Validate at BOTH the route layer (`express-validator`) AND the Mongoose schema layer.
- Never trust client input — validate all fields server-side.
- Required fields on create: `title`, `description`. Set `createdBy` from session, not request body.
- Reject invalid enum values for `priority` and `status` with `400`.

### 4. Authentication & Authorization

- All ticket and user routes MUST be protected by session auth middleware.
- Unauthenticated requests MUST return `401` with `{ "error": "Authentication required" }`.
- `passwordHash` MUST NEVER appear in API responses — use Mongoose `toJSON` transform or `select('-passwordHash')`.
- Login uses bcrypt to compare passwords against `passwordHash` in the User model.

### 5. Secrets & Environment

- NEVER commit `.env`, `.env.local`, `.env.test`, or any file containing real secrets.
- NEVER hardcode `SESSION_SECRET`, database credentials, or passwords in source code.
- ONLY commit `.env.example` files with placeholder values.
- Ensure `.gitignore` includes `.env*` (except `.env.example`).
- Seed script reads `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` from environment — not from committed files.

### 6. Error Handling in UI

- Surface API error messages (`error` field) in the UI — forms, alerts, or toasts.
- Do NOT silently swallow API errors.
- Show loading and error states for all async operations (list, detail, create, update).
- Disable submit buttons during in-flight requests to prevent double submission.

### 7. Testing Requirements

- State machine changes MUST include updates to `backend/tests/integration/stateMachine.test.js` in the same change set.
- Integration tests MUST cover all 9 allowed transitions and minimum 7 rejected transitions from [spec.md](./spec.md).
- Tests MUST use a separate test database — never run destructive tests against development data.
- Frontend unit tests use React Testing Library per [project-context.md](./project-context.md).
- Run `npm test` in `backend/` before marking Phase 3 complete.

### 8. Dependencies

- Minimize new npm packages. Use the stack defined in [project-context.md](./project-context.md).
- If adding a dependency, justify it in the commit message or PR description.
- Do not introduce TypeScript, GraphQL, Redux, or other frameworks unless explicitly requested.

### 9. Code Organization

- Follow the flat layout: `frontend/` and `backend/` at repo root.
- Backend structure: `src/models/`, `src/routes/`, `src/services/`, `src/middleware/`, `src/scripts/`, `tests/integration/`.
- Frontend structure: `src/pages/`, `src/components/`, `src/context/`, `src/api/`.
- Match existing naming and formatting conventions within each package.

### 10. Phase Discipline

- Complete the current phase in [tasks.md](./tasks.md) before starting the next.
- Update checkboxes in [tasks.md](./tasks.md) as tasks are completed.
- Do not implement frontend (Phase 4) before backend API and integration tests (Phases 2–3) pass.

---

## Common Mistakes to Avoid

| Mistake | Correct Approach |
|---------|------------------|
| Allowing `status` update via generic PATCH | Reject with `400`; use status endpoint |
| Storing tickets in memory | Persist all data in MongoDB via Mongoose |
| Skipping backend validation | Validate on both route and schema layers |
| Committing `.env` file | Only commit `.env.example` with placeholders |
| Returning `passwordHash` in JSON | Strip via schema transform or select |
| UI allowing any status change | Limit UI to `getAllowedTransitions(currentStatus)` |
| Missing integration tests for transitions | Cover full matrix from spec.md |
| Creating comments as top-level collection | Comments are a separate `Comment` collection per entity spec |

---

## Suggested Cursor Rule Snippet

Copy the block below into [`.cursor/rules/support-tickets.mdc`](../../.cursor/rules/support-tickets.mdc) to enforce these rules in every Cursor session:

```markdown
---
description: Support Ticket Management System — spec-driven development rules
globs:
  - "**/*"
alwaysApply: true
---

# Support Ticket System Rules

This project follows spec-driven development. Before writing code, read:
- `tool-specific/cursor-workflow/spec.md`
- `tool-specific/cursor-workflow/tasks.md` (current phase only)

## Hard Rules
1. Schemas and API MUST match `spec.md` exactly.
2. Status changes ONLY via `PATCH /tickets/:id/status` and `ticketStateMachine` service.
3. Validate all input server-side. Never trust the client.
4. Never commit `.env` or secrets. Use `.env.example` placeholders only.
5. Never return `passwordHash` in API responses.
6. All ticket routes require session authentication.
7. Invalid status transitions return 409 with allowed transitions.
8. State machine changes require integration test updates.
9. Show API errors in the UI — no silent failures.
10. Complete current `tasks.md` phase before starting the next.

## Stack
- Frontend: React + Vite in `frontend/`
- Backend: Node.js + Express + Mongoose in `backend/`
- Tests: Vitest + Supertest (backend), React Testing Library (frontend)
```

---

## Prompting Tips for Spec-Driven Development

When asking Cursor to implement a feature, reference the spec explicitly:

**Good prompt:**
> Implement Phase 2 ticket routes per `tool-specific/cursor-workflow/spec.md`. Use the state machine service for status changes. Do not modify files outside `backend/`.

**Good prompt:**
> Add integration tests for all rejected transitions listed in `spec.md` integration test matrix.

**Avoid:**
> Build a ticket system with whatever schema you think is best.

---

## Review Checklist for AI-Generated Code

Before accepting AI-generated changes, verify:

- [ ] Schemas match [spec.md](./spec.md)
- [ ] No `.env` or secrets in the diff
- [ ] State machine transitions match the spec table
- [ ] `status` is not updatable via generic PATCH
- [ ] Auth middleware on protected routes
- [ ] `passwordHash` excluded from responses
- [ ] Error responses use consistent JSON shape
- [ ] Integration tests updated if state machine changed
- [ ] Only current phase tasks were implemented
