# F-10 CSV export — Feature contract

| Item | Value |
|---|---|
| Requirements | FR-16, BR-06, BR-13 (new), NFR-02 |
| Depends on | F-06 (summary), F-07 / F-09 (columns for new data) |
| Version | 1.1 (CR-01 adds `edited_at`) |

## Behaviour and workflow
1. On the summary page of an own survey (any status) the owner presses **Download CSV**.
2. The browser downloads `donjaicheck-survey-<id>-responses.csv` (UTF-8 with BOM so Excel shows Thai text).
3. One row per response, oldest first. Columns: `response_id, submitted_at, edited_at` (ISO UTC; `edited_at` empty if never corrected, CR-01), `respondent_name, respondent_email` (identified surveys, decision D-03 revised as D-08), `visit_code` (only if the survey requires one), then one column per question in position order headed `Q<position> <question text>`.
4. Cell values: rating number; single-choice label; multiple-choice labels joined with `; ` in option order; text as written; empty for an unanswered optional question.
5. Survey without responses → header row only.

## Business rules
**BR-13 (new)** — CSV cells are RFC 4180 quoted (`"` doubled; cells with `,` `"` CR or LF are quoted) and any cell starting with `=`, `+`, `-`, `@`, TAB or CR is prefixed with `'` to prevent spreadsheet formula injection.
Pure function `buildCsv(questions, rows, opts)` in `server/src/domain/csvExport.ts` with `escapeCsvCell(value)`.

## API
| Method / path | Success | Errors |
|---|---|---|
| GET /api/owner/surveys/:id/export.csv | 200 `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="donjaicheck-survey-<id>-responses.csv"`, `Cache-Control: no-store` | 401, 403 (respondent), 404 (missing or another owner's survey; JSON error, no CSV) |

## Data
No schema change (reads Survey, Question, Response, Answer, AnswerOption, VisitCode, User).

## UI
Summary page: **Download CSV** button (disabled while downloading; error banner if the request fails).

## Acceptance criteria
| ID | Criterion |
|---|---|
| AC-10-01 | Given an own survey with 2 responses, the export returns 200 with CSV headers, a header row and 2 data rows in submission order with the values described above. |
| AC-10-02 | Cells containing comma, quote or newline are quoted correctly, and cells starting with `=`, `+`, `-`, `@` are prefixed with `'`. |
| AC-10-03 | Multiple-choice answers list all selected labels; restricted surveys include the visit code column; unanswered optional questions are empty cells. |
| AC-10-04 | A survey without responses returns only the header row. |
| AC-10-05 | Another owner gets 404 and a respondent gets 403; no CSV body is returned. |

## Definition of Done (feature)
Product DoD plus TEST-10-01…05 and TEST-U-10 pass; TEST-U-10 committed failing first.
