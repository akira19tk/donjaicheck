# Donjaicheck

Customer satisfaction surveys for Donjai Kitchen restaurants — CPE334 Group Project, Theme 10 (Review, Feedback, and Survey System), team EN-020 T&T.

A survey owner (restaurant manager) creates and publishes a survey; signed-in customers answer it once; the owner sees an aggregate summary. See [docs/srs.md](docs/srs.md).

## Stack

React + Vite (client) · Node.js + Express + TypeScript (server) · PostgreSQL + Prisma 7 · Vitest + Supertest · Playwright (E2E). Details: [docs/system-sds.md](docs/system-sds.md).

```
client/   React SPA (dev server on :5173, proxies /api to :3000)
server/   Express API on :3000, Prisma schema, migrations, seed, tests
docs/     SRS, features, traceability, SDS, sprint plan and Sprint 1 contracts
```

## Prerequisites

- Node.js 22 or 24 and npm
- PostgreSQL 16 running locally (user `postgres` / password `postgres` in the examples)

## Local setup

```bash
# 1. Databases (development + test)
psql -U postgres -c "CREATE DATABASE donjaicheck;"
psql -U postgres -c "CREATE DATABASE donjaicheck_test;"

# 2. Server
cd server
cp .env.example .env          # then edit .env: set your own ADMIN_PASSWORD and DEMO_USER_PASSWORD
npm install
npx prisma migrate deploy     # apply committed migrations
npm run prisma:seed           # 2 owners + 3 demo respondents (idempotent)
npm run dev                   # API on http://localhost:3000

# 3. Client (second terminal)
cd client
npm install
npm run dev                   # open http://localhost:5173
```

### Demo accounts (local seed)

| Role | Email | Password |
|---|---|---|
| Survey owner | manager@donjai.test, manager2@donjai.test | value of `ADMIN_PASSWORD` in your `server/.env` |
| Respondent | customer1@donjai.test … customer3@donjai.test | value of `DEMO_USER_PASSWORD` in your `server/.env` |

Passwords are never stored in the code; they come from your local `.env`.

## Tests

```bash
cd server && npm test     # unit + API/database tests (uses TEST_DATABASE_URL, which must end in _test)
cd client && npm test     # UI unit tests
```

End-to-end journeys (TEST-E2E-01/02) run in a real browser against the development database and the seeded demo accounts:

```bash
npm install                 # at the repository root (Playwright)
npx playwright install chromium   # once
npm run e2e                 # builds client + server, starts on :3100, runs e2e/journey.spec.ts
```

Server tests delete all rows in the test database before each file, so `TEST_DATABASE_URL` must point to a separate database. In CI (`CI=true`) the throw-away `DATABASE_URL` service database is used.

## Build

```bash
cd server && npm run build   # -> server/dist
cd client && npm run build   # -> client/dist (served by the server in production)
```

## Workflow

Issue → branch from `staging` → PR into `staging` reviewed by the teammate → release PR `staging` → `main`. See [docs/sprints/plan.md](docs/sprints/plan.md) and the Definition of Done in [docs/sprints/sprint-1/dod.md](docs/sprints/sprint-1/dod.md).
