# CR-01 — Respondents may correct a submitted response (Lab 7 maintenance change)

| Item | Value |
|---|---|
| Change request | CR-01 (GitHub Issue: "CR-01 Edit own response within 30 minutes") |
| Type | Adaptive maintenance: a requirement changed; the old behaviour was correct for the old requirement |
| Requested by | Donjai Kitchen manager (synthetic stakeholder), recorded by the team |
| Approval | Team decision recorded in the Issue by both students (instructor announcement 25 Nov 2026: no TA approval needed) |
| Accepted Sprint 1 baseline (old behaviour) | tag `sprint-1` = `022a45e`; accepted Lab 6 release `uat-s1-fix1` |
| Pre-change implementation | `staging` after F-09 merge (Sprint 2 work in between: F-07, F-08, F-09; none of them changes D-04) |
| Version | 1.0 (before implementation) |

## 1. Old and new behaviour

| | Sprint 1 (old) | CR-01 (new) |
|---|---|---|
| Rule | **D-04**: responses are final. FR-11: a respondent can only *view* their own response. | **BR-15**: a respondent may *replace the answers* of their own response while **all** hold: (a) less than **30 minutes** since `submittedAt`; (b) fewer than **3** previous edits; (c) the survey still accepts responses (PUBLISHED and before `closesAt`, F-08). |
| API | `GET /api/responses/:id` only; no route to change a response. | + `PUT /api/responses/:id` `{ answers }` → 200 with `editedAt`, `editCount`. |
| UI | Confirmation / "My answers" page is read-only. | "Edit my answers" button with "until 14:35 · 2 edits left" while editable; form pre-filled with the current answers. |

**Reason.** Customers mis-tap a star or send an unfinished comment and ask staff to fix it; staff cannot. The manager wants a short correction window but no late rewriting of feedback that has already been read.

## 2. Precise rules, boundaries and invalid cases

`canEditResponse({ submittedAt, editCount }, accepting, now)` (pure, `server/src/domain/responseRules.ts`):

| Case | Result |
|---|---|
| now − submittedAt = 29 min 59 s, editCount 0, survey open | allowed |
| now − submittedAt = **30 min 00 s** (boundary) or more | 409 `EDIT_WINDOW_PASSED` |
| editCount = 2 (third edit) | allowed; editCount becomes 3 |
| editCount = **3** (fourth edit) | 409 `EDIT_LIMIT_REACHED` |
| survey CLOSED, or `closesAt` passed | 409 `SURVEY_NOT_OPEN` (same code as submit) |
| answers invalid (BR-03, BR-12) | 400 with details; stored answers unchanged; editCount unchanged |
| another respondent's response id | 404 (BR-07: existence not revealed) |
| SURVEY_OWNER calls the route | 403; no session → 401 |

Check order: own response (404) → survey accepting (409) → window (409) → limit (409) → answers valid (400) → transaction.
The **transaction** re-checks window and limit with a conditional `UPDATE … WHERE editCount < 3 AND submittedAt > now − 30 min`, deletes the old answers (and their AnswerOption rows) and inserts the new ones, so a failure leaves the old answers in place and two parallel edits cannot exceed the limit.

**Unchanged behaviour (must be preserved):** BR-01 one response per respondent (edit reuses the same Response row and id); BR-07 respondents only see their own response; BR-06 owners cannot read or change other owners' data; the visit code stays linked to the same response and is not consumed again (F-07); F-06 summary counts each respondent once and uses the latest answers; `submittedAt` never changes.

## 3. Acceptance criteria (added to F-05 as AC-05-08 … AC-05-12)

| ID | Criterion |
|---|---|
| AC-05-08 | Given my response submitted 29 min 59 s ago with 0 edits and the survey open, when I send valid new answers, then 200; the answers are replaced, `editCount` = 1, `editedAt` set, `submittedAt` and response id unchanged. |
| AC-05-09 | At exactly 30 minutes after `submittedAt` the edit returns 409 `EDIT_WINDOW_PASSED` and nothing changes. |
| AC-05-10 | The 4th edit returns 409 `EDIT_LIMIT_REACHED`; the 3rd is accepted. |
| AC-05-11 | If the survey is CLOSED or its `closesAt` has passed, the edit returns 409 `SURVEY_NOT_OPEN`; invalid answers return 400; in both cases stored answers and `editCount` are unchanged. |
| AC-05-12 | Another respondent gets 404 and an owner 403; the owner summary after an edit counts the respondent once with the new answers. |

## 4. Impact analysis

| Requirement / item | Feature | Affected spec section | AC | STS tests | Code / data |
|---|---|---|---|---|---|
| FR-11 (revised: view **and correct**) | F-05 | SRS §4 FR-11; F-05 contract (CR-01 section); SDS §5 permission matrix | AC-05-08 | TEST-05-09 | `routes/respondent.ts` new PUT route; `ResponsePage.tsx`, `AnswerSurveyPage.tsx` edit mode |
| D-04 (revised) → BR-15 (new) | F-05 | SRS §5 BR-15, §7 D-04 | AC-05-08 … AC-05-11 | TEST-U-15, TEST-05-09 … 11 | `domain/responseRules.ts` `canEditResponse` |
| BR-02 / BR-11 (survey open, closing time) | F-04, F-08 | unchanged rule, reused | AC-05-11 | TEST-05-11 | `isAcceptingResponses` reused (no copy of the rule) |
| BR-03 / BR-12 (answer validation) | F-05, F-09 | unchanged rule, reused | AC-05-11 | TEST-05-11 | `validateResponse` reused |
| BR-01 one response | F-05 | unchanged | AC-05-03 | TEST-05-03 (regression) | same Response row updated, unique index unchanged |
| BR-07 / BR-06 access | F-02, F-05 | SDS §5 adds the PUT row | AC-05-12 | TEST-05-12, TEST-02-01/02 (route table) | `tests/helpers/routes.ts` |
| FR-12 summary | F-06 | unchanged | AC-05-12 | TEST-05-12, TEST-06-01…03 (regression) | none (summary reads current answers) |
| FR-13 visit code | F-07 | unchanged | — | TEST-07-03 (regression) | none: `VisitCode.responseId` still points to the same response |
| FR-16 CSV export | F-10 (not yet implemented) | F-10 contract v1.1 adds `edited_at` column | AC-10-01 | TEST-10-01 | `csvExport.ts` (when F-10 is built) |
| Persistence / migration | — | SDS §2 data model | AC-05-08 | TEST-05-09 | migration `response_edits`: `Response.editedAt` NULL, `Response.editCount` INT DEFAULT 0. Historical rows get `editCount = 0`, `editedAt = NULL` → old responses (> 30 min) are simply not editable; no data rewrite needed. |
| Roles | — | SDS §5 | AC-05-12 | TEST-05-12 | `requireRole("RESPONDENT")` on the route |
| Authentication / session | F-01 | not applicable — no change to login or sessions | — | TEST-01-* (regression) | — |
| Survey authoring / lifecycle | F-03, F-04 | not applicable — owners' operations unchanged | — | TEST-03-*, TEST-04-* (regression) | — |

## 5. Regression plan

| Suite | Why it is relevant |
|---|---|
| `tests/api/f05-response.test.ts` (TEST-05-01…08) | same router and response table; BR-01/BR-03/BR-07 must not change |
| `tests/api/f06-summary.test.ts` | summary reads the answers that an edit replaces |
| `tests/api/f07-visit-codes.test.ts`, `f08-closing.test.ts`, `f09-multiple-choice.test.ts` | the edit reuses the visit-code link, the closing rule and MC validation |
| `tests/api/f02-access.test.ts` (route table) | new protected route must give 401/403 |
| `tests/unit/responseRules.test.ts` | `validateResponse` is shared by submit and edit |
| Full server + client suites | whole regression on the release commit |

No existing test expects "responses can never change" at API level, so no old expected result is revised; the decision D-04 itself is revised in the SRS with this CR as the reason.
