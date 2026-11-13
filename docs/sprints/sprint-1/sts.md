# Sprint 1 — Software Test Specification (STS)

Version 1.1 (1.0 pre-implementation; 1.1 adds the test-file mapping). Levels: **U** = unit (pure function), **API** = API + database integration (Vitest + Supertest against `TEST_DATABASE_URL`, data reset per test file), **E2E** = Playwright through the browser, **M** = manual check.

Seed for API tests: owner A, owner B, respondent R1, respondent R2 (created by a test fixture, password from env).

| Test ID | AC | Level | Preconditions / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-01-01 | AC-01-01 | API | Owner A exists | POST /api/auth/login with correct credentials | 200; body has id, name, email, role; no `passwordHash`; `Set-Cookie: dc_session=…; HttpOnly; SameSite=Lax` |
| TEST-01-02 | AC-01-02 | API | Owner A exists | Login with wrong password | 401 `INVALID_CREDENTIALS`; no Set-Cookie |
| TEST-01-03 | AC-01-03 | API | — | Login with unknown email; login with empty body | 401 with the same body as TEST-01-02; 400 `VALIDATION_FAILED` |
| TEST-01-04 | AC-01-04 | API | R1 logged in | POST /api/auth/logout, then GET /api/auth/me with old cookie | 204; then 401; session row deleted |
| TEST-01-05 | AC-01-05 | API | R1 logged in / no cookie | GET /api/auth/me | 200 with R1; 401 without cookie |
| TEST-01-06 | AC-01-06 | API | Seeded users | Read `passwordHash` from DB | starts with `$2`, cost ≥ 10, ≠ plaintext; `verifyPassword` true |
| TEST-01-07 | AC-01-07 | API | R1 logged in | Compare DB tokenHash with sha256(cookie); set `expiresAt` to the past, call /me | tokenHash = sha256(token) ≠ token; 401 after expiry |
| TEST-02-01 | AC-02-01 | API | No cookie | Call every protected route in the route table | 401 `UNAUTHENTICATED`, no data |
| TEST-02-02 | AC-02-02 | API | R1 / owner A logged in | R1 calls each `/api/owner/*` route; owner A posts a response | 403 `FORBIDDEN` |
| TEST-02-03 | AC-02-03 | API | Owner A has a DRAFT survey; owner B logged in | B calls GET, PUT, publish, close, summary on A's survey | 404 for each; A's survey unchanged in DB |
| TEST-03-01 | AC-03-01 | API | Owner A logged in | POST survey with 1 RATING, 1 SINGLE_CHOICE (3 options), 1 TEXT | 201, status DRAFT, ownerId A, positions 1..3, options in order |
| TEST-03-02 | AC-03-02 | API | Owner A logged in | POST with empty title; POST with 21 questions | 400 with details `title`, `questions`; no Survey row created |
| TEST-03-03 | AC-03-02 | API | Owner A logged in | POST single choice with 1 option; with duplicate labels; rating with options | 400 with a detail for each question |
| TEST-03-04 | AC-03-03 | API | Own DRAFT survey | PUT new title and 2 different questions | 200; DB has new title and exactly the 2 new questions |
| TEST-03-05 | AC-03-04 | API | Own PUBLISHED survey; own CLOSED survey | PUT changes | 409 `SURVEY_NOT_EDITABLE`; DB unchanged |
| TEST-03-06 | AC-03-05 | API | A has 2 surveys (1 with 1 response), B has 1 | A calls GET /api/owner/surveys | only A's 2 surveys; responseCount 1 and 0 |
| TEST-U-03 | AC-03-02 | U | — | `validateSurveyInput` with boundary values: title 120/121 chars, 20/21 questions, 2/10/11 options | valid at limits, invalid beyond |
| TEST-04-01 | AC-04-01 | API | Own DRAFT with 1 question | POST publish | 200; status PUBLISHED; publishedAt set |
| TEST-04-02 | AC-04-02 | API | Own PUBLISHED | POST close | 200; status CLOSED; closedAt set |
| TEST-04-03 | AC-04-03 | API | Own DRAFT with 0 questions | POST publish | 409 `NO_QUESTIONS`; still DRAFT |
| TEST-04-04 | AC-04-04 | API | Own PUBLISHED, CLOSED, DRAFT surveys | publish PUBLISHED; publish CLOSED; close DRAFT; close CLOSED | 409 `INVALID_TRANSITION` each; status unchanged |
| TEST-U-01 | AC-04-04 | U | — | `canTransition(from, action)` for all 3×2 combinations | true only for DRAFT+publish and PUBLISHED+close |
| TEST-05-01 | AC-05-01 | API | 1 DRAFT, 2 PUBLISHED (R1 answered one), 1 CLOSED | R1 GET /api/surveys | only the 2 PUBLISHED; hasResponded true for the answered one |
| TEST-05-02 | AC-05-02 | API | PUBLISHED survey with 3 question types | R1 posts valid answers | 201; 1 Response + 3 Answers in DB with the posted values |
| TEST-05-03 | AC-05-03 | API | R1 already responded | R1 posts again (and two parallel posts on a fresh survey) | 409 `ALREADY_RESPONDED`; exactly 1 Response for R1 |
| TEST-05-04 | AC-05-04 | API | DRAFT survey | R1 posts answers | 404; no Response row |
| TEST-05-05 | AC-05-04 | API | CLOSED survey | R1 posts answers | 409 `SURVEY_NOT_OPEN`; no Response row |
| TEST-05-06 | AC-05-05 | API | PUBLISHED survey | Post rating 0, 6, 3.5; option of another question; text 501 chars; unknown questionId | 400 with one detail per problem; no Response row |
| TEST-05-07 | AC-05-05 | API | PUBLISHED survey with 1 required + 1 optional question | Post without the required answer; post with only the required answer | 400 detail for the required question; second post 201 with 1 Answer |
| TEST-U-02 | AC-05-05 | U | — | `validateResponse` table of valid/invalid cases (boundaries 1 and 5, 500/501 chars, duplicate answer) | expected errors exactly |
| TEST-05-08 | AC-05-07 | API | R1 and R2 each responded | R1 GET own response; R1 GET R2's response | 200 with R1's answers; 404 without answers |
| TEST-06-01 | AC-06-01 | API | 3 responses (ratings 5,4,4; options X,X,Y; 2 texts) | Owner GET summary | responseCount 3; average 4.33; distribution {4:2,5:1}; X:2, Y:1, Z:0; 2 texts |
| TEST-06-02 | AC-06-02 | API | Published survey without responses | Owner GET summary | responseCount 0; average null; all counts 0; texts [] |
| TEST-06-03 | AC-06-03 | API | Owner A's survey | Owner B and R1 GET summary | 404 and 403; no aggregate fields in body |
| TEST-E2E-01 | AC-05-02, AC-06-01 | E2E | Seeded owner and respondent | Owner creates + publishes survey → respondent logs in, answers, sees confirmation → owner opens summary | Each page shows expected text; summary shows 1 response |
| TEST-E2E-02 | AC-05-06 | E2E | Seeded published survey | Respondent submits with a required question empty | Error shown under that question; other answers kept; no navigation |
| M-01 | NFR-06 | M | App running | Check loading, empty and error states on each list page | States visible and readable |

## Test files (implementation)

| Test IDs | File |
|---|---|
| TEST-01-01…07 | `server/tests/api/f01-auth.test.ts` |
| TEST-02-01, TEST-02-02 | `server/tests/api/f02-access.test.ts` (driven by `tests/helpers/routes.ts`) |
| TEST-02-03 | `server/tests/api/f02-ownership.test.ts` |
| TEST-03-01…06 | `server/tests/api/f03-authoring.test.ts` (+ extended TEST-03-06 in `f05-response.test.ts`) |
| TEST-04-01…04 | `server/tests/api/f04-lifecycle.test.ts` |
| TEST-05-01…08 | `server/tests/api/f05-response.test.ts` |
| TEST-06-01…03 | `server/tests/api/f06-summary.test.ts` |
| TEST-U-01, TEST-U-03 | `server/tests/unit/surveyRules.test.ts` |
| TEST-U-02 | `server/tests/unit/responseRules.test.ts` |
| (supporting) summary aggregation | `server/tests/unit/summary.test.ts` |
| TEST-E2E-01, TEST-E2E-02 | `e2e/journey.spec.ts` |
| UI behaviour (NFR-06) | `client/tests/*.test.tsx` |

## Execution
- `cd server && npm test` — unit + API tests (requires `TEST_DATABASE_URL`).
- `npm run e2e` at repository root — Playwright journeys.
- Results (counts, tested commit) are recorded in the release PR and in the Deliverable 1 PDF Part F.
