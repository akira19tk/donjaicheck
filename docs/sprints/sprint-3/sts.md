# Sprint 3 — Software Test Specification (STS)

Version 1.0 (pre-implementation). Same levels and fixtures as Sprint 2. Sprint 1–2 tests are the regression suite.

| Test ID | AC | Level | Preconditions / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-U-13 | AC-13-01…03 | U | Survey object with all 4 question types, visit codes on, closesAt set, 118-char title | `buildDuplicateInput` | title "Copy of …" length 120; questions/options same order; no closesAt; requiresVisitCode copied |
| TEST-13-01 | AC-13-01 | API | A's CLOSED survey with 2 responses and 4 question types | POST …/duplicate | 201; new DRAFT, new id, same question texts/types/options/min/max order |
| TEST-13-02 | AC-13-02 | API | Same, original has 3 visit codes and closesAt | duplicate | copy has 0 responses, 0 codes, closesAt null; original status, responses and codes unchanged |
| TEST-13-03 | AC-13-03 | API | Title of 118 chars | duplicate | copy title length 120 |
| TEST-13-04 | AC-13-04 | API | A's survey | B and R1 POST …/duplicate | 404 / 403; survey count unchanged |
| TEST-13-05 | AC-13-05 | API | Copy from TEST-13-01 | PUT edit title; POST publish | 200; 200 PUBLISHED |
| TEST-U-11 | AC-11-03 | U | — | `canShowResults` for anonymous/identified × 0, 2, 3 | false only for anonymous with < 3 |
| TEST-11-01 | AC-11-01 | API | Anonymous published survey | R1 submits twice | 201 then 409; Response.respondentId NULL; 1 Participation |
| TEST-11-02 | AC-11-02 | API | 3 anonymous responses | Owner GET detail, summary, CSV | no respondent name/email/id anywhere in bodies |
| TEST-11-03 | AC-11-03 | API | 2 then 3 responses | Owner GET summary, CSV | hidden / 409 at 2; shown at 3 |
| TEST-11-04 | AC-11-04 | API | Published anonymous survey | PUT anonymous false | 409 `SURVEY_NOT_EDITABLE` |
| TEST-11-05 | AC-11-05 | API | — | full Sprint 1–2 suite | all pass |
| TEST-U-12 | AC-12-02 | U | — | `parseDateRange` valid, bad format, from>to, 367 days, same day | as contract |
| TEST-12-01 | AC-12-01 | API | Responses dated 1, 5, 10 Nov (Bangkok) | summary from=2026-11-01&to=2026-11-05 | responseCount 2, aggregates from those 2 only |
| TEST-12-02 | AC-12-02 | API | — | from=2026-11-10&to=2026-11-01; from=abc | 400 with detail |
| TEST-E2E-04 | AC-12-03 | E2E | Seeded survey with responses | Owner applies filter | bars and counts update |
| PERF-01 | AC-12-04 | M (script) | 500 seeded responses on deployed service | `python3 deploy/perf_summary.py $URL` | p95 ≤ 1000 ms |

## Test files (planned)
| Test IDs | File |
|---|---|
| TEST-U-13, TEST-13-01…05 | `server/tests/unit/duplicate.test.ts`, `server/tests/api/f13-duplicate.test.ts` |
| TEST-U-11, TEST-11-01…05 | `server/tests/unit/anonymity.test.ts`, `server/tests/api/f11-anonymous.test.ts` |
| TEST-U-12, TEST-12-01…02 | `server/tests/unit/dateRange.test.ts`, `server/tests/api/f12-analysis.test.ts` |

## Implementation order and target dates
| Order | Feature | Author → reviewer | Target |
|---|---|---|---|
| 1 | F-13 Survey duplication | Thanyagorn → Thanaporn | 28 Nov (in the D2 candidate) |
| 2 | F-11 Anonymous mode | Thanaporn → Thanyagorn | 5 Dec |
| 3 | F-12 Advanced analysis + PERF-01 | Thanyagorn → Thanaporn | 9 Dec |
| 4 | Hardening, UAT re-tests, final release `v1.0` | both | 13 Dec |
