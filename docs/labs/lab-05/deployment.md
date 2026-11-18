# Lab 5 — Donjaicheck deployment

Team EN-020 T&T · Project: Donjaicheck (Theme 10) · Version 1.0

## 1. Stack and changes from the reference

Same reference stack as the Lab 5 Starter Kit: React (Vite) UI and Node.js 24 Express API in **one container** on **Cloud Run**, **Cloud SQL for PostgreSQL 16**, **Artifact Registry**, **Secret Manager**, **GitHub Actions** with **Workload Identity Federation** (no JSON keys).

Changes from the kit:

| Change | Reason |
|---|---|
| All resource names renamed `toktickit` → `donjaicheck` | Our application |
| Prisma 7 with the `pg` driver adapter; `prisma.config.ts` is copied into the runtime image | Prisma 7 reads schema, migrations and seed settings from `prisma.config.ts`; the migration job needs it |
| `server/Dockerfile` also copies `prisma.config.ts` and `tsconfig.build.json` | Our build uses `tsc -p tsconfig.build.json` |
| `deploy/smoke_test.py` checks `/api/surveys` → 401 instead of `/api/categories`, and logs in with the `dc_session` cookie + `X-Requested-With: Donjaicheck` header | Our API uses cookie sessions with a CSRF header, not bearer tokens |
| CI runs on PRs into `staging` and `main` and passes throw-away seed passwords | All feature PRs go into `staging`; the seed refuses to run without passwords |
| `COOKIE_SECURE=false` only in `docker-compose.yml` | Lets the production build run over plain `http://localhost`; never set on Cloud Run |
| Compose maps PostgreSQL to host port **5433** | Avoids a clash with a local PostgreSQL on 5432 |

## 2. Environment variables

| Name | Purpose | Secret? | Local value from | Cloud Run value from |
|---|---|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | **Yes** | `server/.env` | Secret Manager `donjaicheck-database-url` (Unix socket `/cloudsql/PROJECT:REGION:donjaicheck-pg`) |
| `TEST_DATABASE_URL` | Test database (name must end in `_test`) | No | `server/.env` | not used (CI uses its throw-away `DATABASE_URL`) |
| `PORT` | HTTP port | No | default 3000 | set by Cloud Run (`--port 3000`) |
| `NODE_ENV` | Runtime mode | No | `development` | `production` (`--set-env-vars`) |
| `TZ` | Time zone for logs | No | — | `Asia/Bangkok` |
| `SESSION_TTL_HOURS` | Session lifetime (default 8) | No | optional | default |
| `BCRYPT_COST` | bcrypt cost (≥ 10, default 10) | No | optional | default |
| `COOKIE_SECURE` | `false` only for local http production builds | No | `docker-compose.yml` | **not set** (cookies are Secure) |
| `ADMIN_PASSWORD` | Initial password of the seeded survey owners | **Yes** | `server/.env` (your own value) | Secret Manager `donjaicheck-admin-password` (generated), migration job only |
| `DEMO_USER_PASSWORD` | Password of the seeded demo customers | **Yes** | `server/.env` | Secret Manager `donjaicheck-demo-password` (generated), migration job only |
| `SEED_DEMO_DATA` | Create demo customers and sample surveys | No | `true` | `true` (deployed with `--demo` for Lab 6 UAT) |

`.env` files are git-ignored; only `server/.env.example` (placeholders) is committed. Secret scanning push protection is enabled on the public repository.

## 3. Commands

| Task | Command |
|---|---|
| Install | `cd server && npm ci` · `cd client && npm ci` |
| Migrate | `cd server && npx prisma migrate deploy` |
| Seed (idempotent) | `cd server && npm run prisma:seed` |
| Run locally (dev) | `cd server && npm run dev` + `cd client && npm run dev` → http://localhost:5173 |
| Unit + API tests | `cd server && npm test` (98 tests) |
| UI tests + build | `cd client && npm test && npm run build` |
| End-to-end | repo root: `npm install && npx playwright install chromium && npm run e2e` |
| Docker (local, all services) | `docker compose up --build -d` → UI http://localhost:5173, API http://localhost:3000 |
| Production image | `docker build -t donjaicheck .` |

## 4. GCP resources

| Item | Value |
|---|---|
| Project ID | `cpe334-team-en-020-tandt` (owner: Thanaporn; Thanyagorn has Editor) |
| Region | `asia-southeast1` |
| Cloud Run service | `donjaicheck` (min 0, max 3 instances, 512 MiB) |
| Migration job | `donjaicheck-migrate` (`npx prisma migrate deploy && npm run prisma:seed`) |
| Cloud SQL | instance `donjaicheck-pg` (PostgreSQL 16, db-f1-micro, 10 GB, storage auto-increase off), database `donjaicheck`, user `donjaicheck` |
| Artifact Registry | repository `donjaicheck`, image `donjaicheck` (tag = full commit SHA) |
| Secrets | `donjaicheck-database-url`, `donjaicheck-admin-password`, `donjaicheck-demo-password` |
| Service accounts | runtime `donjaicheck-runner` (Cloud SQL Client + Secret Accessor per secret); deployer `donjaicheck-deployer` (Cloud Run Developer, Artifact Registry Writer on the repository, Service Account User on the runner) |
| GitHub environment | `demo` (deploy from `main` only; variables `GCP_PROJECT_ID`, `GCP_REGION`, `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT`) |
| Workload Identity | pool `github-actions`, provider `github-main`, condition limited to this repository, `main` and `deploy.yml` |
| Budget | `lab5-budget`, ฿350/month, alerts at 50/90/100 % |
| Public URL | https://donjaicheck-kkb2behi3a-as.a.run.app |

## 5. Release procedure

1. Create an Issue; branch from `staging`; open a PR into `staging`. CI check **`test-and-docker`** must pass; the teammate reviews (the author never approves).
2. Sync `staging` with `main` (`git merge origin/main`), open the release PR `staging → main`; CI must pass; the teammate approves; merge. The ruleset on `main` blocks merging when the required check fails.
3. The merge starts **Deploy demo** (`.github/workflows/deploy.yml`): tests again → build the image tagged with the full commit SHA → push → `deploy/release.sh` resolves the image **digest**, runs the migration job, updates the Cloud Run service → `deploy/smoke_test.py` checks the public URL.
4. Verify: the run Summary shows the image tag (= merged commit) and digest; Cloud Run → Revisions shows the newest revision with 100 % traffic and the same digest.

## 6. How to find the running commit

- GitHub: Actions → Deploy demo → latest green run → Summary → "Commit image tag".
- Cloud Run: service `donjaicheck` → Revisions → newest revision → image digest; compare with the run summary.
- CLI: `gcloud run services describe donjaicheck --region asia-southeast1 --format='value(spec.template.spec.containers[0].image)'`

## 7. Rollback and roll forward

Actions → Deploy demo → **Run workflow** on `main` → `image_tag` = full 40-character SHA of an earlier release. Tests, build and migration are skipped; that image is deployed and smoke-tested. Run it again with the newest SHA to roll forward. Migrations are additive only, so older images keep working with the current schema.

## 8. Cost control

Budget alert first; Cloud Run scales to zero; Cloud SQL is the main cost (db-f1-micro, auto-increase off). Do **not** pause or tear down before the instructor announces the end of grading (Lab 6 partner testing). Pause later with `gcloud sql instances patch donjaicheck-pg --activation-policy=NEVER`; teardown with `deploy/teardown.sh`.
