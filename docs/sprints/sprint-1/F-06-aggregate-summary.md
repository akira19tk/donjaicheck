# F-06 Aggregate summary — Feature contract

| Item | Value |
|---|---|
| Requirements | FR-12, BR-06 |
| Depends on | F-05 |
| Version | 1.0 (pre-implementation) |

## Behaviour
Owner opens **Summary** for an own survey in any status. The API computes, from the database at request time:
- `responseCount`;
- for each RATING question: `answered` count, `average` (rounded to 2 decimals, `null` if no answers) and `distribution` {1..5: count};
- for each SINGLE_CHOICE question: `answered` and count per option (options with 0 included);
- for each TEXT question: `answered` and the list of text answers (newest first, **without respondent names**, D-03).

Computation lives in `server/src/domain/summary.ts` as a pure function over loaded answers so it can be unit-tested.

## API
| Method / path | Success | Errors |
|---|---|---|
| GET /api/owner/surveys/:id/summary | 200 `{ "survey": { id, title, status }, "responseCount", "questions": [{ "questionId", "position", "text", "type", "answered", "average"?, "distribution"?, "options"?: [{ "optionId", "label", "count" }], "texts"?: [string] }] }` | 401, 403, 404 |

No new data. UI: summary page with response count, bar-style distribution rows, option counts with percentages, list of comments; empty state "No responses yet" when `responseCount = 0`.

## Acceptance criteria
| ID | Criterion |
|---|---|
| AC-06-01 | Given 3 responses with ratings 5, 4, 4, one rating question shows answered 3, average 4.33 and distribution {4:2, 5:1}; option counts and text list match the stored answers. |
| AC-06-02 | Given a survey with no responses, the summary returns responseCount 0, average null and all counts 0; the UI shows the empty state. |
| AC-06-03 | Another owner gets 404 and a respondent gets 403 for the summary; neither receives aggregate data. |

## Definition of Done (feature)
Product DoD plus TEST-06-01…03 and TEST-E2E-01 pass.
