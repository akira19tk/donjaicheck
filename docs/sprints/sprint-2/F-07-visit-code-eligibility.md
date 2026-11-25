# F-07 Visit-code eligibility — Feature contract

| Item | Value |
|---|---|
| Requirements | FR-13, BR-09, BR-06, BR-07 |
| Depends on | F-03 (authoring), F-05 (response) |
| Version | 1.0 (pre-implementation) |

## Context
Donjai Kitchen prints a visit code on each receipt so only customers who actually ate there can answer a restricted survey (replaces the Sprint 1 assumption D-01 for restricted surveys).

## Behaviour and workflow
1. In the editor (DRAFT only) the owner ticks **Require a visit code** (`requiresVisitCode`).
2. On the survey detail page (DRAFT or PUBLISHED, `requiresVisitCode = true`) the owner enters a number 1–50 and presses **Generate codes**. The API creates that many codes and shows them; the owner prints them on receipts. The page lists all codes with *Unused* / *Used at …*.
3. A respondent opening a restricted survey sees a **Visit code** field above the questions.
4. On submit the API checks, in order: survey exists (404) → accepting responses (409 `SURVEY_NOT_OPEN`) → not answered yet (409 `ALREADY_RESPONDED`) → visit code present (400 detail `visitCode: Required`) → answers valid (400) → code exists **for this survey** (400 `INVALID_VISIT_CODE`) → code unused (409 `VISIT_CODE_USED`).
5. The code is consumed **in the same transaction** as the response: `UPDATE VisitCode SET usedAt=now, responseId=… WHERE surveyId=… AND code=… AND usedAt IS NULL`; if 0 rows change, the transaction rolls back with `VISIT_CODE_USED`. Two respondents racing with one code: exactly one succeeds.
6. Unrestricted surveys ignore `visitCode` (Sprint 1 behaviour unchanged).

## Business rules
`server/src/domain/visitCodes.ts` (pure, unit-tested):
- `generateVisitCode(rand)` → 8 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no 0/O/1/I), using `crypto.randomInt`.
- `normalizeVisitCode(input)` → trims, removes spaces and `-`, upper-cases; returns null when the result is not 8 characters of that alphabet.
- `validateCodeCount(n)` → integer 1–50.
- Codes are unique across the system (DB unique); on a collision the server regenerates.

## API
| Method / path | Request | Success | Errors |
|---|---|---|---|
| POST / PUT /api/owner/surveys(/:id) | + `requiresVisitCode` boolean (default false) | detail includes `requiresVisitCode`, `visitCodeCount`, `usedVisitCodeCount` | 400 |
| POST /api/owner/surveys/:id/visit-codes | `{ "count": 10 }` | 201 `{ "codes": [{ "code", "createdAt" }] }` | 400 `count`, 401, 403, 404, 409 `VISIT_CODES_NOT_ENABLED` / `SURVEY_CLOSED` |
| GET /api/owner/surveys/:id/visit-codes | — | 200 `{ "codes": [{ "code", "createdAt", "usedAt" }] }` newest first | 401, 403, 404 |
| GET /api/surveys/:id | — | + `requiresVisitCode` | unchanged |
| POST /api/surveys/:id/responses | + `"visitCode": "AB3K-9QXZ"` | 201 as F-05 | + 400 `INVALID_VISIT_CODE`, 409 `VISIT_CODE_USED` |

Respondents never receive the list of codes and the error never reveals whether a code belongs to another survey (same 400).

## Data
Migration `visit_codes`: `Survey.requiresVisitCode BOOLEAN NOT NULL DEFAULT false`; table `VisitCode(id, surveyId → Survey ON DELETE CASCADE, code VARCHAR(8) UNIQUE, createdAt, usedAt NULL, responseId NULL UNIQUE → Response)`, index (`surveyId`, `usedAt`).

## UI
Editor checkbox; detail page "Visit codes" panel (count input, Generate button, table, *x of y used*); answer form field "Visit code (on your receipt)" with inline error for missing/invalid/used.

## Acceptance criteria
| ID | Criterion |
|---|---|
| AC-07-01 | The owner can mark a DRAFT survey as requiring a visit code; the flag is stored and returned. |
| AC-07-02 | Given an own restricted survey, generating N codes (1 ≤ N ≤ 50) returns N distinct 8-character codes stored for that survey; N = 0, 51 or non-integer returns 400; an unrestricted survey returns 409 `VISIT_CODES_NOT_ENABLED`. |
| AC-07-03 | Given a restricted PUBLISHED survey and an unused code, when a respondent submits valid answers with the code (any case, with or without `-`), then 201, the response is stored and the code is marked used by that response. |
| AC-07-04 | Without a code → 400 `visitCode` detail; unknown code or a code of another survey → 400 `INVALID_VISIT_CODE`; nothing stored and no code consumed. |
| AC-07-05 | A code already used (by anyone) → 409 `VISIT_CODE_USED`; two parallel submissions with the same code produce exactly one Response. |
| AC-07-06 | Another owner gets 404 and a respondent gets 403 for the visit-code endpoints; no codes are returned. |
| AC-07-07 | Invalid answers with a valid code → 400 and the code stays unused. |

## Definition of Done (feature)
Product DoD plus TEST-07-01…07 and TEST-U-07 pass; TEST-07-05 and TEST-U-07 committed failing first.
