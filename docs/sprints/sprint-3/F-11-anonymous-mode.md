# F-11 Anonymous mode — Feature contract

| Item | Value |
|---|---|
| Requirements | FR-17, BR-10, NFR-08, BR-01 |
| Depends on | F-05, F-06, F-10 |
| Version | 1.0 (pre-implementation) |

## Behaviour and workflow
1. In the editor (DRAFT) the owner ticks **Anonymous survey** (`anonymous`). It cannot be changed after publishing.
2. The respondent form says "Your answers are anonymous — the restaurant cannot see who wrote them".
3. On submit the server, in one transaction: inserts `Participation(surveyId, respondentId)` (unique → BR-01), then inserts `Response` with `respondentId = NULL` and its answers. The two rows share no key, no timestamp column with sub-second precision and no sequence order that an owner-facing query exposes.
4. The respondent sees a confirmation but **cannot** reopen the answers later (nothing links them).
5. The owner summary of an anonymous survey shows only "Results appear after 3 responses" until `responseCount ≥ 3`; text answers are shuffled per request.
6. CSV export of an anonymous survey omits `respondent_name`, `respondent_email`, `submitted_at` (date only) and is blocked below 3 responses.

## Business rules (BR-10)
- `canShowResults(anonymous, count)` → `!anonymous || count >= 3`.
- Visit codes may be combined with anonymity; the code row stores `usedAt` but **not** `responseId` for anonymous surveys.

## API
| Method / path | Change | Errors |
|---|---|---|
| POST / PUT /api/owner/surveys(/:id) | + `anonymous` boolean | 409 `SURVEY_NOT_EDITABLE` after publish |
| POST /api/surveys/:id/responses | anonymous path as above; response body `{ "response": { "submittedAt" } }` without id | 409 `ALREADY_RESPONDED` via Participation |
| GET /api/owner/surveys/:id/summary | `{ "hidden": true, "minResponses": 3, "responseCount" }` below threshold | — |
| GET /api/owner/surveys/:id/export.csv | anonymous columns; 409 `NOT_ENOUGH_RESPONSES` below threshold | — |

## Data
Migration `anonymous_mode`: `Survey.anonymous BOOLEAN DEFAULT false`; `Response.respondentId` becomes NULLABLE (unique index kept for identified rows); table `Participation(id, surveyId, respondentId, UNIQUE(surveyId, respondentId))`; `Response.submittedAt` truncated to the minute for anonymous surveys.

## Acceptance criteria
| ID | Criterion |
|---|---|
| AC-11-01 | An anonymous survey stores responses with `respondentId` NULL and a Participation row; a second submission returns 409 `ALREADY_RESPONDED`. |
| AC-11-02 | No owner endpoint (detail, summary, CSV) returns respondent identity for an anonymous survey (NFR-08 schema review + API test). |
| AC-11-03 | Summary and CSV are hidden below 3 responses and shown at 3. |
| AC-11-04 | The anonymous flag cannot be changed after publishing. |
| AC-11-05 | Identified surveys behave exactly as in Sprints 1–2 (regression). |

## Planned tests
TEST-U-11 (`canShowResults` 0/2/3 × anonymous/identified), TEST-11-01…05 (API), schema review checklist M-11.
