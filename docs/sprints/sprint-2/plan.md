# Sprint 2 — Plan, Definition of Done and work breakdown

Version 1.0 (pre-implementation). Goal (from [../plan.md](../plan.md)): *control who can answer and when, add richer questions, and let managers take data out.*

## Scope
| Feature | Contract | Requirements |
|---|---|---|
| F-07 Visit-code eligibility | [F-07-visit-code-eligibility.md](F-07-visit-code-eligibility.md) | FR-13, BR-09 |
| F-08 Scheduled closing | [F-08-scheduled-closing.md](F-08-scheduled-closing.md) | FR-14, BR-11 |
| F-09 Multiple-choice questions | [F-09-multiple-choice.md](F-09-multiple-choice.md) | FR-15, BR-12, BR-03 |
| F-10 CSV export | [F-10-csv-export.md](F-10-csv-export.md) | FR-16, BR-13, BR-06 |

Tests: [sts.md](sts.md). No Sprint 2 feature is moved to Sprint 3.

## Definition of Done
The product DoD ([../sprint-1/dod.md](../sprint-1/dod.md), items 1–10) applies unchanged to every Sprint 2 feature, plus:
- **S2-1 Regression** — all Sprint 1 API, unit and E2E tests still pass on the same commit.
- **S2-2 Migration** — each schema change is a new committed Prisma migration that applies to an existing Sprint 1 database without data loss (checked by CI and by the Cloud Run deploy).
- **S2-3 Access table** — every new protected route is added to `server/tests/helpers/routes.ts` so TEST-02-01/02 cover it.
- **S2-4 Release** — release PR `staging` → `main` reviewed, tag `sprint-2`, auto-deploy run green and deployed revision/commit recorded.

## Work breakdown (Issues, author → reviewer)
| Order | Issue | Branch | Author | Reviewer |
|---|---|---|---|---|
| 1 | Sprint 2 + Sprint 3 contracts | `docs/N-sprint2-3-contracts` | Thanaporn | Thanyagorn |
| 2 | F-08 Scheduled closing | `feature/N-scheduled-closing` | Thanaporn | Thanyagorn |
| 3 | F-07 Visit-code eligibility | `feature/N-visit-codes` | Thanyagorn | Thanaporn |
| 4 | F-09 Multiple-choice questions | `feature/N-multiple-choice` | Thanaporn | Thanyagorn |
| 5 | F-10 CSV export + E2E-03 | `feature/N-csv-export` | Thanyagorn | Thanaporn |
| 6 | Sprint 2 release | `staging` → `main`, tag `sprint-2` | Thanyagorn | Thanaporn |

Features are merged in this order because F-07, F-08 and F-09 each add a migration to the same schema; sequential merges keep one linear migration history.
