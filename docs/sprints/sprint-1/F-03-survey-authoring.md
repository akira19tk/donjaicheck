# F-03 Survey authoring — Feature contract

| Item | Value |
|---|---|
| Requirements | FR-04, FR-05, FR-08, BR-05, BR-08, NFR-06 |
| Depends on | F-01, F-02 |
| Version | 1.0 (pre-implementation) |

## Behaviour and workflow
1. Owner opens **My surveys** and presses **New survey**.
2. Owner enters title, optional description and adds questions. For each question: text, type (Rating 1–5 / Single choice / Short text), required checkbox; Single choice shows option rows (add/remove).
3. **Save draft** sends the whole survey; the API validates and stores it with status `DRAFT` and `ownerId = current user`.
4. Owner may reopen the draft, change anything and save again. The PUT replaces title, description and the full question list (questions are re-created, so positions are always 1..n).
5. My surveys lists only the owner's surveys, newest first, with status and response count.

## Business rules and validation (BR-08, BR-05)
| Field | Rule | Error |
|---|---|---|
| title | trimmed, 1–120 chars | 400 `VALIDATION_FAILED` field `title` |
| description | optional, ≤ 500 chars | field `description` |
| questions | array, 0–20 items (≥ 1 needed only to publish) | field `questions` |
| questions[i].text | trimmed, 1–200 chars | field `questions[i].text` |
| questions[i].type | `RATING` \| `SINGLE_CHOICE` \| `TEXT` | field `questions[i].type` |
| questions[i].required | boolean, default true | — |
| questions[i].options | SINGLE_CHOICE: 2–10 unique non-empty labels (≤ 60 chars); other types: must be empty/absent | field `questions[i].options` |
| status for PUT | must be `DRAFT` | 409 `SURVEY_NOT_EDITABLE` |

All validation errors are returned together in `details`. Nothing is written when validation fails.

## API
| Method / path | Request | Success | Errors |
|---|---|---|---|
| GET /api/owner/surveys | — | 200 `{ "surveys": [{ "id", "title", "status", "responseCount", "createdAt", "publishedAt", "closedAt" }] }` | 401, 403 |
| POST /api/owner/surveys | `{ "title", "description"?, "questions": [{ "text", "type", "required", "options"?: [string] }] }` | 201 `{ "survey": SurveyDetail }` | 400, 401, 403 |
| GET /api/owner/surveys/:id | — | 200 `{ "survey": SurveyDetail }` | 401, 403, 404 |
| PUT /api/owner/surveys/:id | same body as POST | 200 `{ "survey": SurveyDetail }` | 400, 401, 403, 404, 409 |

`SurveyDetail = { id, title, description, status, createdAt, publishedAt, closedAt, responseCount, questions: [{ id, position, text, type, required, options: [{ id, position, label }] }] }`

## Data
Tables `Survey`, `Question`, `QuestionOption` and enums `SurveyStatus`, `QuestionType` (migration `surveys`). Unique `(surveyId, position)` and `(questionId, label)`; cascade delete from survey to questions to options.

## UI
Survey editor with dynamic question list; field errors shown under each field from `details`; **Save draft** disabled while saving; empty state on My surveys ("No surveys yet — create your first one").

## Acceptance criteria
| ID | Criterion |
|---|---|
| AC-03-01 | Given an owner, when they post a valid survey with one question of each type, then 201 is returned with status DRAFT, ownerId = owner, and questions/options stored in order. |
| AC-03-02 | Given invalid input (empty title, 21 questions, single choice with 1 option or duplicate labels, options on a rating question), then 400 `VALIDATION_FAILED` lists each invalid field and nothing is stored. |
| AC-03-03 | Given an own DRAFT survey, when the owner PUTs a changed title and question list, then 200 is returned and the stored survey equals the new content. |
| AC-03-04 | Given an own PUBLISHED or CLOSED survey, when the owner PUTs changes, then 409 `SURVEY_NOT_EDITABLE` is returned and the survey is unchanged. |
| AC-03-05 | `GET /api/owner/surveys` returns only the caller's surveys with correct status and response counts. |

## Definition of Done (feature)
Product DoD plus TEST-03-01…06 and TEST-U-03 pass; editor demonstrated in UI.
