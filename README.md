# Support Ticket Management System

**Author:** Prashant Baliyan

Mini fullstack app for managing support tickets with React, Node.js, Express, and MongoDB.

## Prerequisites

- Node.js 18+
- MongoDB (local via Docker Compose or Atlas)

## Quick Start

### 1. Start MongoDB

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run seed
npm run dev
```

API runs at `http://localhost:3001`.

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

App runs at `http://localhost:5173`.

### Default seed users

Configure in `backend/.env` (see `.env.example`):

- Admin: `admin@example.com` / `changeme123`
- Agent: `agent@example.com` / `changeme123`

## Tests

```bash
cd backend && npm test
cd frontend && npm test
```

Backend integration tests include mandatory state-machine transition coverage.

## Documentation

### Implementation workflow (`implementation-workflow/`)

| File | Purpose |
|------|---------|
| [`requirements-analysis.md`](implementation-workflow/requirements-analysis.md) | Domain model, requirements, assumptions, edge cases |
| [`implementation-plan.md`](implementation-workflow/implementation-plan.md) | Milestones and AI usage plan |
| [`api-contract.md`](implementation-workflow/api-contract.md) | REST API schemas and error responses |
| [`test-strategy.md`](implementation-workflow/test-strategy.md) | Test scope, coverage, and gaps |
| [`code-review-notes.md`](implementation-workflow/code-review-notes.md) | AI-assisted and manual review findings |
| [`reflection.md`](implementation-workflow/reflection.md) | Project reflection and reusable workflow |
| [`pr-description.md`](implementation-workflow/pr-description.md) | Pull request summary template |

### Cursor workflow (`tool-specific/cursor-workflow/`)

| File | Purpose |
|------|---------|
| [`candidate-info.md`](tool-specific/cursor-workflow/candidate-info.md) | Candidate metadata, tools, and setup summary |
| [`acceptance-criteria.md`](tool-specific/cursor-workflow/acceptance-criteria.md) | Definitions of done (AC-1 through AC-11 + checkboxes) |
| [`debugging-notes.md`](tool-specific/cursor-workflow/debugging-notes.md) | Requirement deviations and issue investigations |
| [`spec.md`](tool-specific/cursor-workflow/spec.md) | Canonical schemas, API, and state machine |
| [`tasks.md`](tool-specific/cursor-workflow/tasks.md) | Phased implementation checklist |
| [`project-context.md`](tool-specific/cursor-workflow/project-context.md) | Stack, architecture, and conventions |
| [`cursor-rules-or-instructions.md`](tool-specific/cursor-workflow/cursor-rules-or-instructions.md) | AI coding guardrails |
| [`prompt-history.md`](tool-specific/cursor-workflow/prompt-history.md) | Prompt and outcome log |

## Project Structure

```
js_ai_assignment/
├── README.md
├── docker-compose.yml             # Local MongoDB
├── .gitignore
├── .nvmrc
│
├── implementation-workflow/       # Evaluation and implementation docs
│   ├── requirements-analysis.md
│   ├── implementation-plan.md
│   ├── api-contract.md
│   ├── test-strategy.md
│   ├── code-review-notes.md
│   ├── reflection.md
│   └── pr-description.md
│
├── tool-specific/
│   └── cursor-workflow/           # Spec-driven Cursor workflow
│       ├── candidate-info.md
│       ├── acceptance-criteria.md
│       ├── debugging-notes.md
│       ├── spec.md
│       ├── tasks.md
│       ├── project-context.md
│       ├── cursor-rules-or-instructions.md
│       └── prompt-history.md
│
├── backend/                       # Express + Mongoose API
│   ├── package.json
│   ├── vitest.config.js
│   ├── src/
│   │   ├── server.js
│   │   ├── app.js
│   │   ├── config/db.js
│   │   ├── models/                # User, Ticket, Comment
│   │   ├── routes/                # auth, tickets, users
│   │   ├── middleware/            # auth, validate
│   │   ├── services/
│   │   │   └── ticketStateMachine.js
│   │   └── scripts/               # seed, startDemo
│   └── tests/
│       ├── setup.js
│       ├── helpers.js
│       └── integration/           # tickets, stateMachine, comments
│
└── frontend/                      # React + Vite SPA
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api/client.js
        ├── context/AuthContext.jsx
        ├── components/            # badges, ErrorAlert, ProtectedRoute
        ├── pages/                   # login, list, create, detail
        └── test/setup.js
```
