# Submission Index — Support Ticket Management System

**Single entry point for assessors and reviewers.**

| Field | Value |
|-------|-------|
| **Candidate** | Prashant Baliyan |
| **Project** | Support Ticket Management System |
| **Stack** | React 18 + Vite, Node.js + Express, MongoDB + Mongoose |
| **AI Tool** | Cursor (Claude) |
| **Repository** | `js_ai_assignment` — monorepo (`frontend/` + `backend/`) |

---

## Start Here (Recommended Reading Order)

| # | Document | Why read it |
|---|----------|-------------|
| 1 | [README.md](../../README.md) | Quick start — run MongoDB, backend, frontend, tests |
| 2 | [candidate-info.md](./candidate-info.md) | Metadata, stack, setup summary, architecture |
| 3 | [tool-workflow.md](./tool-workflow.md) | **AI workflow narrative** — how Cursor was used across all phases |
| 4 | [prompt-history.md](./prompt-history.md) | Chronological prompt log — 20 entries with context, intent, refinement |
| 5 | [requirements-analysis.md](../../implementation-workflow/requirements-analysis.md) | FR/NFR, assumptions, edge cases EC-1–EC-7 |
| 6 | [acceptance-criteria.md](./acceptance-criteria.md) | AC-1–AC-11 definitions of done |
| 7 | [debugging-notes.md](./debugging-notes.md) | 4 debugging sessions with AI-assisted fixes |
| 8 | [reflection.md](../../implementation-workflow/reflection.md) | Trade-offs, lessons learned, reusable workflow |

---

## Run & Verify (5 minutes)

```bash
# 1. Start MongoDB
docker compose up -d

# 2. Backend
cd backend && cp .env.example .env && npm install && npm run seed && npm run dev

# 3. Frontend (separate terminal)
cd frontend && cp .env.example .env && npm install && npm run dev

# 4. Tests
cd backend && npm test
cd frontend && npm test
```

| Check | Expected |
|-------|----------|
| API health | `http://localhost:3001` — server running |
| Frontend | `http://localhost:5173` — login page |
| Login | `admin@example.com` / password from `backend/.env` |
| Backend tests | All integration tests pass (state machine matrix included) |

---

## Documentation Map

### AI Workflow & Process

| Document | Location | Purpose |
|----------|----------|---------|
| [tool-workflow.md](./tool-workflow.md) | `tool-specific/cursor-workflow/` | **Narrative AI journey** — phases, decisions, validation gates, prompt templates |
| [prompt-history.md](./prompt-history.md) | `tool-specific/cursor-workflow/` | Chronological prompt log (planning → implementation → debugging → docs) |
| [debugging-notes.md](./debugging-notes.md) | `tool-specific/cursor-workflow/` | Deviation log + 4 detailed issue investigations |
| [code-review-notes.md](../../implementation-workflow/code-review-notes.md) | `implementation-workflow/` | AI-assisted and manual review findings |
| [reflection.md](../../implementation-workflow/reflection.md) | `implementation-workflow/` | What AI helped with, got wrong, and reusable templates |
| [cursor-rules-or-instructions.md](./cursor-rules-or-instructions.md) | `tool-specific/cursor-workflow/` | AI coding guardrails used in Cursor |
| [implementation-plan.md](../../implementation-workflow/implementation-plan.md) | `implementation-workflow/` | Milestones M0–M5 + AI usage plan |

> **AI workflow:** Start with [tool-workflow.md](./tool-workflow.md) for the narrative; drill into [prompt-history.md](./prompt-history.md) for individual prompts.

### Requirements & Planning

| Document | Location | Purpose |
|----------|----------|---------|
| [requirements-analysis.md](../../implementation-workflow/requirements-analysis.md) | `implementation-workflow/` | Domain model, FR/NFR, assumptions, edge cases |
| [acceptance-criteria.md](./acceptance-criteria.md) | `tool-specific/cursor-workflow/` | AC-1–AC-11 with verification checkboxes |
| [implementation-plan.md](../../implementation-workflow/implementation-plan.md) | `implementation-workflow/` | Phased execution strategy |
| [spec.md](./spec.md) | `tool-specific/cursor-workflow/` | Canonical schemas, API, state machine |
| [tasks.md](./tasks.md) | `tool-specific/cursor-workflow/` | Implementation checklist by phase |

### Design & API

| Document | Location | Purpose |
|----------|----------|---------|
| [api-contract.md](../../implementation-workflow/api-contract.md) | `implementation-workflow/` | REST endpoints, request/response schemas, error codes |
| [project-context.md](./project-context.md) | `tool-specific/cursor-workflow/` | Stack, architecture, conventions |
| [candidate-info.md](./candidate-info.md) | `tool-specific/cursor-workflow/` | Candidate metadata and setup |

### Testing

| Document | Location | Purpose |
|----------|----------|---------|
| [test-strategy.md](../../implementation-workflow/test-strategy.md) | `implementation-workflow/` | Test scope, coverage map, known gaps |
| `backend/tests/integration/` | `backend/tests/` | tickets, stateMachine, comments test suites |
| `frontend/src/components/ErrorAlert.test.jsx` | `frontend/src/` | Component test (RTL) |

### Submission & Ownership

| Document | Location | Purpose |
|----------|----------|---------|
| [pr-description.md](../../implementation-workflow/pr-description.md) | `implementation-workflow/` | PR-style summary of features and changes |
| [README.md](../../README.md) | repo root | Setup, tests, project structure |

---

## Key Implementation Evidence

| Assessment area | Where to look |
|-----------------|---------------|
| **State machine enforced at backend** | `backend/src/services/ticketStateMachine.js`, `backend/tests/integration/stateMachine.test.js` |
| **Status smuggling blocked** | `backend/src/routes/tickets.routes.js` — generic PATCH rejects `status` field |
| **Integration test matrix** | `stateMachine.test.js` — 5 allowed + 11 rejected transitions (`it.each`) |
| **AI debugging traceability** | [debugging-notes.md](./debugging-notes.md) ↔ [prompt-history.md](./prompt-history.md) cross-links |
| **Code review evidence** | [code-review-notes.md](../../implementation-workflow/code-review-notes.md) |
| **Requirements traceability** | [requirements-analysis.md](../../implementation-workflow/requirements-analysis.md) § Requirements Traceability |

---

## Acceptance Criteria → Test Mapping

| AC | Requirement | Primary test file |
|----|-------------|-------------------|
| AC-1 | Create ticket | `tickets.test.js` |
| AC-2 | List tickets | `tickets.test.js` |
| AC-3 | Ticket detail | `tickets.test.js` (entity shape) |
| AC-4 | Update fields | `tickets.test.js` |
| AC-5 | Comments | `comments.test.js` |
| AC-6 | State transitions | `stateMachine.test.js` |
| AC-7 | Search/filter/pagination | `tickets.test.js` |
| AC-9 | Backend validation | `tickets.test.js`, `comments.test.js` |
| AC-11 | Integration tests pass | All three integration suites |

Full AC details: [acceptance-criteria.md](./acceptance-criteria.md)

---

## Project Structure (High Level)

```
js_ai_assignment/
├── README.md                          ← Quick start
├── SUBMISSION.md                      ← Pointer to this index
├── implementation-workflow/           ← Requirements, API, tests, review, reflection
├── tool-specific/cursor-workflow/     ← AI workflow, spec, acceptance criteria
│   └── submission-index.md            ← You are here
├── backend/                           ← Express API + integration tests
└── frontend/                          ← React SPA
```

---

## Improvement Status

Score-improvement workstreams in progress:

| Workstream | Item | Status |
|------------|------|--------|
| 2 | Rich `prompt-history.md` | **Complete** — 20 entries with full format |
| 4 | `submission-index.md` + doc surfacing | **Complete** — this file |
| 1 | `tool-workflow.md` | **Complete** — narrative AI journey across all phases |
| 3 | Unit tests + edge-case integration tests | Pending |

---

## Quick Links

- **Run app:** [README.md § Quick Start](../../README.md#quick-start)
- **AI workflow:** [tool-workflow.md](./tool-workflow.md)
- **AI prompts:** [prompt-history.md](./prompt-history.md)
- **Debugging:** [debugging-notes.md](./debugging-notes.md)
- **Review:** [code-review-notes.md](../../implementation-workflow/code-review-notes.md)
- **Reflection:** [reflection.md](../../implementation-workflow/reflection.md)
- **API reference:** [api-contract.md](../../implementation-workflow/api-contract.md)
- **Tests:** [test-strategy.md](../../implementation-workflow/test-strategy.md)
