# Sprint 2 — Software Test Specification (STS)

Version 1.1 (1.0 pre-implementation; 1.1 records the implemented test files, client tests and E2E-03 together with CR-01's E2E check). Levels as Sprint 1: **U** unit, **API** API + database integration (Vitest + Supertest, `TEST_DATABASE_URL`), **E2E** Playwright, **M** manual. Fixtures: owner A, owner B, respondents R1, R2 (test helper, password from env). Sprint 1 tests (TEST-01…06, TEST-U-01…03, TEST-E2E-01/02) are re-run as the regression suite.

| Test ID | AC | Level | Preconditions / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-U-08 | AC-08-02, AC-08-04 | U | now = fixed time | `validateClosesAt` with null, "abc", now, now+1 min, now+366 d, now+367 d; `isAcceptingResponses` for PUBLISHED/DRAFT/CLOSED with closesAt null, now−1 ms, now+1 min | valid/invalid exactly as the contract table; accepting only PUBLISHED with null or future closesAt |
| TEST-08-01 | AC-08-01 | API | A's DRAFT and PUBLISHED surveys | PUT …/closing future value; then `null` | 200; DB `closesAt` = value; then null |
| TEST-08-02 | AC-08-02 | API | A's PUBLISHED survey with closesAt X | PUT "abc", past, now+400 d | 400 `closesAt` detail each; DB still X |
| TEST-08-03 | AC-08-03 | API | PUBLISHED survey, closesAt set to 1 s in the past directly in DB | R1 GET /api/surveys; GET /api/surveys/:id; POST response | not listed; status CLOSED; 409 `SURVEY_NOT_OPEN`; 0 Response rows; DB status CLOSED, closedAt = closesAt |
| TEST-08-04 | AC-08-04 | API | PUBLISHED survey, closesAt = now + 60 s | R1 POST valid response | 201 |
| TEST-08-05 | AC-08-05 | API | A's CLOSED survey; A's DRAFT with closesAt in the past (DB) | PUT …/closing; POST publish | 409 `SURVEY_CLOSED`; 409 `CLOSING_TIME_PASSED`, still DRAFT |
| TEST-08-06 | AC-08-06 | API | A's PUBLISHED survey | B and R1 PUT …/closing | 404 / 403; closesAt unchanged |
| TEST-U-07 | AC-07-02, AC-07-04 | U | — | `generateVisitCode` 1000×; `normalizeVisitCode` on "ab3k-9qxz", " AB3K 9QXZ ", "AB3K9QX", "AB3K9QX0"; `validateCodeCount` 0, 1, 50, 51, 2.5 | 8 chars from alphabet; "AB3K9QXZ" twice, null twice; valid only 1 and 50 |
| TEST-07-01 | AC-07-01 | API | Owner A | POST survey with `requiresVisitCode: true` | 201; detail and DB flag true |
| TEST-07-02 | AC-07-02 | API | A's restricted and unrestricted surveys | POST visit-codes count 5; count 0, 51; unrestricted count 1 | 201 with 5 distinct codes in DB; 400; 409 `VISIT_CODES_NOT_ENABLED` |
| TEST-07-03 | AC-07-03 | API | Restricted PUBLISHED survey, code C | R1 posts valid answers with lower-case C with "-" | 201; code `usedAt` set, `responseId` = new response |
| TEST-07-04 | AC-07-04 | API | Restricted survey S1 with codes; other survey S2 with code D | R1 posts without code; with "ZZZZZZZZ"; with D | 400 detail `visitCode`; 400 `INVALID_VISIT_CODE` twice; 0 responses; D unused |
| TEST-07-05 | AC-07-05 | API | Code C used by R1 | R2 posts with C; on a fresh code E, R1 and R2 post in parallel | 409 `VISIT_CODE_USED`; exactly 1 Response linked to E |
| TEST-07-06 | AC-07-06 | API | A's restricted survey | B GET/POST visit-codes; R1 GET/POST visit-codes | 404 / 403, no `codes` in body |
| TEST-07-07 | AC-07-07 | API | Restricted survey, code C | R1 posts rating 9 with C | 400; C `usedAt` null |
| TEST-U-09a | AC-09-02 | U | — | `validateSurveyInput` MULTIPLE_CHOICE: 1/2/10/11 options, duplicates, min>max, max>options, required+min 0, defaults | invalid exactly in listed cases; defaults min 1/0, max = options |
| TEST-U-09b | AC-09-04 | U | — | `validateResponse` MULTIPLE_CHOICE: [] required, [] optional, duplicate, foreign id, below min, above max, valid | expected detail each; valid returns `optionIds` |
| TEST-09-01 | AC-09-01 | API | Owner A | POST survey with MULTIPLE_CHOICE (4 options, min 1, max 2) and one without min/max | 201; DB min/max stored; defaults applied |
| TEST-09-02 | AC-09-02 | API | Owner A | POST invalid multiple-choice definitions | 400 per question; no Survey row |
| TEST-09-03 | AC-09-03 | API | Published survey with MC question | R1 selects 2 options | 201; 1 Answer + 2 AnswerOption rows |
| TEST-09-04 | AC-09-04 | API | Same survey | R2 posts 0 (required), 3 (max 2), duplicate, foreign option | 400 each; 0 responses for R2 |
| TEST-09-05 | AC-09-05 | API | 3 responses: {A,B}, {A}, {C} | Owner GET summary | answered 3; A 2, B 1, C 1, D 0 |
| TEST-09-06 | AC-09-06 | API | R1 answered {A,B} | R1 GET own response | `optionLabels` ["A","B"] |
| TEST-U-10 | AC-10-02 | U | — | `escapeCsvCell` on `a,b`, `say "hi"`, `line1\nline2`, `=SUM(A1)`, `+1`, `-2`, `@x`, `normal`, null, 4 | quoted/prefixed exactly; null → empty; number as text |
| TEST-10-01 | AC-10-01 | API | Own survey (rating, single, text), 2 responses | Owner GET export.csv | 200; CSV content type, attachment filename; BOM; header + 2 rows in order with names, emails, values |
| TEST-10-02 | AC-10-02 | API | Response with text `=HYPERLINK("x")` and `a, "b"` | GET export | cells `'=HYPERLINK(""x"")` and `"a, ""b"""` |
| TEST-10-03 | AC-10-03 | API | Restricted survey with MC question and optional text left empty | GET export | `visit_code` column with used code; MC cell `A; B`; empty text cell |
| TEST-10-04 | AC-10-04 | API | Own survey with 0 responses | GET export | header row only |
| TEST-10-05 | AC-10-05 | API | A's survey | B GET export; R1 GET export | 404 JSON; 403 JSON; no CSV |
| TEST-02-01/02 (extended) | AC-07-06, AC-08-06, AC-10-05 | API | Route table updated with the 4 new routes | iterate | 401 without session; 403 wrong role |
| TEST-E2E-03 | AC-07-03, AC-09-03 | E2E | Seeded restricted published survey with MC question and a known code | Respondent enters code, selects 2 options, submits | confirmation page shows both labels |
| M-02 | F-07…F-10 UI | M | Deployed candidate | Check editor fields, visit-code panel, closing box, CSV download in Excel/Sheets | fields, errors and file readable (Thai text OK) |

## Test files (planned)
| Test IDs | File |
|---|---|
| TEST-U-08 | `server/tests/unit/closing.test.ts` |
| TEST-08-01…06 | `server/tests/api/f08-closing.test.ts` |
| TEST-U-07 | `server/tests/unit/visitCodes.test.ts` |
| TEST-07-01…07 | `server/tests/api/f07-visit-codes.test.ts` |
| TEST-U-09a / TEST-U-09b | `server/tests/unit/surveyRules.test.ts` / `responseRules.test.ts` (new `describe` blocks) |
| TEST-09-01…06 | `server/tests/api/f09-multiple-choice.test.ts` |
| TEST-U-10 | `server/tests/unit/csvExport.test.ts` |
| TEST-10-01…05 | `server/tests/api/f10-export.test.ts` |
| TEST-E2E-03 | `e2e/sprint2.spec.ts` |
| Client (UI) | `client/tests/VisitCodeField.test.tsx` (F-07), `MultipleChoice.test.tsx` (F-09), `DownloadCsv.test.tsx` (F-10) |
| TEST-E2E-03 (+ CR-01 edit) | `e2e/sprint2.spec.ts` — owner generates a code via the UI instead of a seeded code (no seed change needed) |
