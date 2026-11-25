# F-13 Survey duplication — Feature contract

| Item | Value |
|---|---|
| Requirements | FR-19, BR-14 (new), BR-06, D-05 |
| Depends on | F-03, F-07, F-08, F-09 |
| Version | 1.0 (pre-implementation) |

## Behaviour and workflow
1. On the detail page of an own survey (any status) the owner presses **Duplicate**.
2. The API creates a new **DRAFT** owned by the same owner and the UI opens its editor.
3. This is how a closed survey is "re-run" (D-05: closed surveys are never reopened).

## Business rule BR-14 (new)
A duplicate copies: title prefixed `Copy of ` (cut to 120 characters, BR-08), description, `requiresVisitCode`, every question in the same order with type, text, required, min/max selections and options in the same order.
It does **not** copy: responses, answers, visit codes, `closesAt`, `publishedAt`, `closedAt`. The new survey is DRAFT with new ids; the original is not modified.
Pure function `buildDuplicateInput(survey)` in `server/src/domain/duplicate.ts` (unit-tested); the create runs in one transaction.

## API
| Method / path | Success | Errors |
|---|---|---|
| POST /api/owner/surveys/:id/duplicate | 201 `{ "survey": SurveyDetail }` (status DRAFT) | 401, 403 (respondent), 404 (missing or another owner's survey) |

## Data
No schema change.

## UI
**Duplicate** button on the survey detail page; on success the browser goes to `/owner/surveys/<newId>/edit` with the banner "Copy created — edit and publish when ready".

## Acceptance criteria
| ID | Criterion |
|---|---|
| AC-13-01 | Given an own CLOSED survey with responses and all question types, duplicate returns 201 and a new DRAFT with "Copy of " + title and identical questions/options in the same order. |
| AC-13-02 | The copy has no responses, no visit codes and no `closesAt`; the original survey, its responses and codes are unchanged. |
| AC-13-03 | A 118-character title produces a copy title of exactly 120 characters. |
| AC-13-04 | Another owner gets 404 and a respondent gets 403; no survey is created. |
| AC-13-05 | The copy can be edited and published like any draft. |

## Definition of Done (feature)
Product DoD plus TEST-13-01…05 and TEST-U-13 pass; TEST-U-13 and TEST-13-02 committed failing first.
