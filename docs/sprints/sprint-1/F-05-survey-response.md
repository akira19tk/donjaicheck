# F-05 Survey response — Feature contract

| Item | Value |
|---|---|
| Requirements | FR-09, FR-10, FR-11, BR-01, BR-02, BR-03, BR-07 |
| Depends on | F-04 |
| Version | 1.0 (pre-implementation) |

## Behaviour and workflow
1. Respondent opens **Available surveys**: all PUBLISHED surveys, each marked "Answered" if the respondent already responded.
2. Respondent opens a survey; the form shows the questions (stars/1–5 buttons, radio options, text box ≤ 500) and states "Your answers are linked to your account (identified survey)" (D-02).
3. **Submit** sends all answers. The API checks, in order: survey exists and is not DRAFT (else 404), status is PUBLISHED (else 409 `SURVEY_NOT_OPEN`), no existing response by this respondent (else 409 `ALREADY_RESPONDED`), answers valid (else 400 with details).
4. The response and answers are stored in **one transaction**; the DB unique `(surveyId, respondentId)` guarantees BR-01 even for two simultaneous submissions (the second gets 409).
5. UI goes to `/responses/:id` showing "Thank you! Submitted at …" and the respondent's own answers.

## Business rules and validation (BR-01…BR-03)
`validateResponse(survey, answers)` in `server/src/domain/responseRules.ts` (pure, unit-tested):
| Case | Result |
|---|---|
| Required question without answer (missing, null, empty text) | detail `answers[q:<id>]: Required` |
| RATING value not an integer 1–5 | detail `Rating must be an integer from 1 to 5` |
| SINGLE_CHOICE optionId not an option of that question | detail `Invalid option` |
| TEXT longer than 500 chars | detail `Text must be at most 500 characters` |
| Answer for a questionId not in the survey, or two answers for one question | detail `Unknown question` / `Duplicate answer` |
| Optional question left empty | allowed (no Answer row stored) |

## API
| Method / path | Request | Success | Errors |
|---|---|---|---|
| GET /api/surveys | — | 200 `{ "surveys": [{ "id", "title", "description", "questionCount", "hasResponded", "responseId"? }] }` (PUBLISHED only) | 401, 403 |
| GET /api/surveys/:id | — | 200 `{ "survey": { id, title, description, status, questions[...] }, "responseId"? }` for PUBLISHED or CLOSED | 401, 403, 404 (DRAFT or missing) |
| POST /api/surveys/:id/responses | `{ "answers": [{ "questionId", "rating"? , "optionId"?, "text"? }] }` | 201 `{ "response": { "id", "surveyId", "submittedAt" } }` | 400, 401, 403, 404, 409 `SURVEY_NOT_OPEN` / `ALREADY_RESPONDED` |
| GET /api/responses/:id | — | 200 `{ "response": { id, submittedAt, survey: { id, title }, answers: [{ questionText, type, rating?, optionLabel?, text? }] } }` | 401, 403, 404 (not own) |

## Data
Tables `Response` (unique surveyId+respondentId) and `Answer` (unique responseId+questionId, CHECK ratingValue 1–5) — migration `responses`.

## UI
Available surveys list with empty state ("No surveys open right now"); answer form with required markers and field errors from `details`; Submit disabled while sending; already-answered surveys link to the confirmation page instead of the form; closed survey shows "This survey is closed".

## Acceptance criteria
| ID | Criterion |
|---|---|
| AC-05-01 | `GET /api/surveys` returns only PUBLISHED surveys and `hasResponded` is true exactly for surveys the caller answered. |
| AC-05-02 | Given a PUBLISHED survey, when a respondent submits valid answers, then 201 is returned, one Response with its Answers is stored, and the UI shows confirmation with the submission time. |
| AC-05-03 | Given the respondent already responded, when they submit again, then 409 `ALREADY_RESPONDED` and the survey still has exactly one response from them. |
| AC-05-04 | Submitting to a DRAFT survey returns 404 and to a CLOSED survey returns 409 `SURVEY_NOT_OPEN`; nothing is stored. |
| AC-05-05 | Invalid answers (missing required, rating 0 or 6 or 3.5, foreign option, text > 500, unknown question) return 400 with a detail per problem; nothing is stored. |
| AC-05-06 | In the UI, submitting with a missing required answer shows the error next to that question and keeps the entered answers. |
| AC-05-07 | A respondent can read their own response; reading another respondent's response returns 404 without answers. |

## Definition of Done (feature)
Product DoD plus TEST-05-01…08, TEST-U-02 and TEST-E2E-02 pass (TDD: TEST-05-03 and TEST-U-02 committed failing first).
