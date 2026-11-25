# F-09 Multiple-choice questions — Feature contract

| Item | Value |
|---|---|
| Requirements | FR-15, BR-12 (new), BR-03 (extended), BR-08 (extended), FR-12 (summary extended) |
| Depends on | F-03 (authoring), F-05 (response), F-06 (summary) |
| Version | 1.0 (pre-implementation) |

## Behaviour and workflow
1. In the editor the owner chooses type **Multiple choice**, enters 2–10 options and optionally **Min selections** / **Max selections**.
2. The respondent sees checkboxes and a hint "Choose 1–3"; the form blocks submit with an inline error when the count is outside the range.
3. The API stores one `Answer` row for the question and one `AnswerOption` row per selected option.
4. The summary shows, for each option, how many respondents selected it and the number of respondents who answered the question (percentages are relative to that number, so they can add up to more than 100 %).
5. The respondent's own response page lists all selected labels.

## Business rules
**BR-12 (new)** — A MULTIPLE_CHOICE question has 2–10 unique non-empty options (as BR-08). `minSelections` is 0–option count and `maxSelections` is 1–option count with `min ≤ max`. Defaults: `min = required ? 1 : 0`, `max = option count`. A required question must have `min ≥ 1`.

**BR-03 extended** — a multiple-choice answer is `optionIds: number[]`: every id is an option of that question, no duplicates, and the count is between min and max. An empty list on an optional question is "not answered".

Pure functions: `validateSurveyInput` (surveyRules.ts) and `validateResponse` (responseRules.ts) gain the MULTIPLE_CHOICE branch; `buildSummary` (summary.ts) gains option counts.

| Answer case | Detail |
|---|---|
| required, `optionIds` missing or `[]` | `Required` |
| not an array of integers / duplicate id | `Invalid selection` |
| id not an option of the question | `Invalid option` |
| fewer than min / more than max | `Select at least {min}` / `Select at most {max}` |

## API
| Method / path | Change |
|---|---|
| POST / PUT /api/owner/surveys(/:id) | question type `MULTIPLE_CHOICE` with `options[]`, optional `minSelections`, `maxSelections` |
| GET survey (owner and respondent) | question includes `minSelections`, `maxSelections` |
| POST /api/surveys/:id/responses | answer `{ "questionId", "optionIds": [..] }` |
| GET /api/responses/:id | answer includes `optionLabels: string[]` |
| GET /api/owner/surveys/:id/summary | MULTIPLE_CHOICE item `{ answered, options: [{ optionId, label, count }] }` |

## Data
Migration `multiple_choice`: enum value `MULTIPLE_CHOICE`; `Question.minSelections INT NULL`, `Question.maxSelections INT NULL`; table `AnswerOption(answerId → Answer ON DELETE CASCADE, optionId → QuestionOption, PRIMARY KEY(answerId, optionId))`.

## UI
Editor: type option, min/max number inputs (shown only for multiple choice), inline errors. Answer form: checkbox group with hint and error. Summary: bar per option with count and %. Response page: comma-separated labels.

## Acceptance criteria
| ID | Criterion |
|---|---|
| AC-09-01 | The owner can create a draft with a MULTIPLE_CHOICE question (options, min, max); defaults are applied when min/max are omitted. |
| AC-09-02 | Invalid definitions (1 or 11 options, duplicate labels, min > max, max > options, required with min 0) return 400 with a detail for that question; nothing is created. |
| AC-09-03 | Given a published survey, a respondent selecting 2 valid options gets 201; one Answer and 2 AnswerOption rows are stored. |
| AC-09-04 | Selections below min, above max, duplicated, or referencing another question's option return 400 with the detail; nothing is stored. |
| AC-09-05 | The summary returns, per option, the number of respondents who selected it, and `answered` = respondents with at least one selection. |
| AC-09-06 | The respondent's own response shows all selected labels. |

## Definition of Done (feature)
Product DoD plus TEST-09-01…06, TEST-U-09a and TEST-U-09b pass; TEST-U-09b and TEST-09-04 committed failing first. Sprint 1 tests for RATING/SINGLE_CHOICE/TEXT still pass (regression).
