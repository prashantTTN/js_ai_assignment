# Code Review Notes

AI-assisted and manual code review observations for the Support Ticket Management System.

**Author:** Prashant Baliyan

**Related documents:**

- [submission-index.md](../tool-specific/cursor-workflow/submission-index.md) — assessor entry point
- [tool-workflow.md](../tool-specific/cursor-workflow/tool-workflow.md) — narrative AI workflow
- [prompt-history.md](../tool-specific/cursor-workflow/prompt-history.md) — review prompts and outcomes
- [acceptance-criteria.md](../tool-specific/cursor-workflow/acceptance-criteria.md) — definitions of done
- [api-contract.md](./api-contract.md) — API contract used as review baseline
- [test-strategy.md](./test-strategy.md) — test coverage assessment

---

## AI-Assisted Review Summary

Cursor AI was used to review backend route handlers, state machine enforcement, and frontend API client against `api-contract.md` and `spec.md`.

### Review prompts used

1. *"Review `backend/src/routes/tickets.routes.js` against api-contract.md. List mismatches in status codes, error messages, or response shapes."*
2. *"Verify ticketStateMachine.js is the only module that determines allowed transitions. Are there any code paths that modify status without calling assertValidTransition?"*
3. *"Check frontend/src/api/client.js for consistent error handling — does every API method surface backend error messages to the UI?"*

### AI review findings (accepted)

| Finding | Severity | Action taken |
|---------|----------|--------------|
| Generic PATCH accepted `status` in body | High | Added early `400` rejection; dedicated status endpoint only |
| `409` responses missing `details.allowedTransitions` on some rejected transitions | Medium | Standardized via `assertValidTransition` throw with `error.details` |
| `passwordHash` could leak if `.select('+passwordHash')` forgotten on wrong query | Medium | Verified login route uses select; all other routes use default schema (passwordHash excluded) |
| Frontend status buttons hardcoded instead of using `meta.allowedTransitions` | Medium | Refactored `TicketDetailPage.jsx` to render buttons dynamically |
| Comment `createdBy` not populated in list response | Low | Added `.populate('createdBy', userSelect)` in comment query |

### AI review findings (false positives — rejected)

See [Suggestions Rejected](#suggestions-rejected-and-why) below.

---

## My Review Observations

Manual review after AI-assisted passes, focusing on security, maintainability, and spec alignment.

### Backend (`backend/src/`)

**Strengths:**

- Clear separation of concerns: routes → middleware → state machine → models
- Consistent response envelope `{ data, meta? }` and error shape `{ error, details? }`
- `express-validator` chains co-located with route definitions — easy to trace validation rules
- `mongodb-memory-server` enables fast, isolated integration tests without Docker dependency in CI
- `setTicketStatus` test helper allows seeding arbitrary statuses without exercising the state machine (useful for rejection tests)

**Concerns:**

- No optimistic locking on tickets — concurrent updates are last-write-wins (documented in requirements-analysis.md EC-1)
- Keyword search uses regex, not MongoDB `$text` index — acceptable at current scale but may degrade with large datasets
- `findTicketOr404` mixes response writing with lookup logic — works but could be extracted to middleware for reuse
- Global `errorHandler` masks 500 messages outside development — good for production, but developers must check server logs for root cause

### Frontend (`frontend/src/`)

**Strengths:**

- Centralized API client (`api/client.js`) with `ApiError` class carrying `status` and `details`
- `credentials: 'include'` set globally for session cookies
- Plain CSS utility classes — no heavy UI framework dependency
- `ProtectedRoute` wrapper is simple and effective

**Concerns:**

- Minimal component test coverage — only `ErrorAlert.test.jsx` exists
- Infinite scroll uses `IntersectionObserver` without abort controller — rapid unmount could cause stale state updates (mitigated with loading ref)
- No global error boundary — unhandled render errors crash the page
- `VITE_API_BASE_URL` defaults hardcoded to `localhost:3001` — fine for dev, requires `.env` for other environments

### Security

- Session secret read from `process.env.SESSION_SECRET` — not hardcoded
- `.env` in `.gitignore` — verified
- bcrypt cost factor 10 — reasonable default
- No rate limiting on login endpoint — acceptable for internal mini-project
- CORS origin configured via environment — not wide open

---

## Changes Made After Review

| Change | File(s) | Triggered by |
|--------|---------|--------------|
| Block `status` in generic PATCH body | `tickets.routes.js` | AI review + AC-6 |
| Return `meta.allowedTransitions` on detail and status responses | `tickets.routes.js` | AI review + frontend needs |
| Dynamic status buttons from `allowedTransitions` | `TicketDetailPage.jsx` | Manual review |
| Add `priority` query filter | `tickets.routes.js`, `TicketListPage.jsx` | Post-MVP feedback |
| Default `limit=10` for pagination | `tickets.routes.js` | Infinite scroll requirement |
| Parameterized transition tests with `it.each` | `stateMachine.test.js` | AI-generated test matrix |
| Entity field rename (`name`, `assignedTo`, `message`) | Models, routes, UI, tests | Spec alignment review |
| Populate `createdBy` on comments | `tickets.routes.js` | Manual review |

---

## Suggestions Rejected (and why)

| AI Suggestion | Reason rejected |
|---------------|-----------------|
| **Switch from `express-session` to JWT** | Assessment spec requires session-based auth with cookies; JWT would change the auth model and frontend `credentials` handling |
| **Embed comments as Ticket subdocuments** | Spec defines Comment as a separate collection with `ticketId` reference; embedding would complicate comment queries and violate entity design |
| **Use `PUT` instead of `PATCH` for ticket updates** | `PATCH` is semantically correct for partial updates; evaluation prompt mentioned `PUT` but implementation intentionally uses `PATCH` + separate status endpoint (documented in api-contract.md) |
| **Add Redis for session store** | Over-engineering for mini-project; in-memory session store is sufficient for single-instance dev/demo |
| **Replace regex search with Atlas Search** | Requires Atlas-specific setup; regex on title/description is sufficient for 15–100 tickets |
| **Add role-based middleware restricting status changes to admin** | Assumption A-3: both admin and agent have equal ticket access; no RBAC requirement in acceptance criteria |
| **Use Zod instead of express-validator** | Would introduce a new dependency; express-validator already integrated and working |
| **Add axios instead of native fetch** | Spec and project-context allow fetch; no retry/interceptor requirements justify adding axios |
| **Merge status endpoint into generic PATCH with conditional logic** | Violates separation of concerns; dedicated endpoint makes state machine enforcement auditable and testable |

---

## Review Checklist (for future PRs)

```
- [ ] Route handlers match api-contract.md (status codes, error messages, response shapes)
- [ ] Status changes only via PATCH /tickets/:id/status
- [ ] assertValidTransition called before every status save
- [ ] passwordHash never in API responses
- [ ] New endpoints have integration tests
- [ ] Frontend surfaces API errors via ErrorAlert
- [ ] No secrets in committed files
- [ ] Docs updated if behavior changes (api-contract.md first)
```
