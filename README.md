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

## Evaluation Documentation

Baseline evaluation docs at the project root:

- [`candidate-info.md`](candidate-info.md) — candidate metadata and setup summary
- [`requirements-analysis.md`](requirements-analysis.md) — domain, requirements, edge cases
- [`acceptance-criteria.md`](acceptance-criteria.md) — definitions of done (checkboxes)
- [`implementation-plan.md`](implementation-plan.md) — milestones and AI usage plan
- [`api-contract.md`](api-contract.md) — REST API schemas and error responses

## Spec-Driven Workflow

See [`tool-specific/cursor-workflow/`](tool-specific/cursor-workflow/) for supplementary workflow history:

- `spec.md` — original schemas and API contract
- `tasks.md` — implementation phases
- `acceptance-criteria.md` — detailed AC-1 through AC-11 criteria

## Project Structure

```
frontend/     React + Vite UI
backend/      Express + Mongoose API
tool-specific/cursor-workflow/   Spec and workflow docs
```
