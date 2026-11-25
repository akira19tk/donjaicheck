# F-12 Advanced analysis — Feature contract

| Item | Value |
|---|---|
| Requirements | FR-18, NFR-05, BR-06 |
| Depends on | F-06, F-09 |
| Version | 1.0 (pre-implementation) |

## Behaviour and workflow
1. The summary page gets **From** and **To** date pickers (Asia/Bangkok dates). Applying them reloads the summary for responses submitted in `[from 00:00, to 23:59:59.999]` local time.
2. Each RATING, SINGLE_CHOICE and MULTIPLE_CHOICE question shows a horizontal bar chart (CSS bars, no chart library) with count and percentage; ratings also show the average.
3. The response count line reads "12 responses between 1 Nov and 15 Nov".

## Rules
`parseDateRange(from, to)` (pure): both optional `YYYY-MM-DD`; invalid format → 400 detail; `from > to` → 400 `from: Must be on or before to`; range longer than 366 days → 400.
NFR-05: summary for a survey with 500 responses returns in ≤ 1 s p95 on the deployed service; aggregation is done with SQL `GROUP BY` instead of loading every answer.

## API
| Method / path | Change | Errors |
|---|---|---|
| GET /api/owner/surveys/:id/summary?from=2026-11-01&to=2026-11-15 | filtered counts; echoes `range` | 400, 401, 403, 404 |

## Acceptance criteria
| ID | Criterion |
|---|---|
| AC-12-01 | Given responses on 3 different days, a range covering 2 of them returns only those responses in every aggregate. |
| AC-12-02 | Invalid dates, `from > to` and ranges over 366 days return 400; the boundary day is inclusive (Bangkok time). |
| AC-12-03 | The UI shows a bar per option/rating value with count and %. |
| AC-12-04 | NFR-05: 500 seeded responses, 50 sequential requests to the deployed summary, p95 ≤ 1 s (script `deploy/perf_summary.py`). |

## Planned tests
TEST-U-12 (`parseDateRange`), TEST-12-01, TEST-12-02 (API), TEST-E2E-04 (filter + bars), PERF-01 (NFR-05 script).
