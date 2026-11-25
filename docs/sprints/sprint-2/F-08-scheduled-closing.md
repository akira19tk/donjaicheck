# F-08 Scheduled closing — Feature contract

| Item | Value |
|---|---|
| Requirements | FR-14, BR-11, BR-02 (extended), BR-06 |
| Depends on | F-04 (lifecycle), F-05 (response) |
| Version | 1.0 (pre-implementation) |

## Behaviour and workflow
1. On the survey editor (DRAFT) or the survey detail page (DRAFT or PUBLISHED) the owner sets an optional **Closes at** date/time, or clears it.
2. The API stores `Survey.closesAt` (UTC). It must be in the future when it is set; `null` removes the schedule.
3. When `closesAt` has passed, a PUBLISHED survey is **CLOSED** (BR-11):
   - before any survey is read or answered, the server runs `closeExpiredSurveys()`, which sets `status = CLOSED, closedAt = closesAt` for every PUBLISHED survey whose `closesAt <= now()` (one SQL update, idempotent);
   - the response transaction re-checks `status = PUBLISHED AND (closesAt IS NULL OR closesAt > now())`, so a submission that arrives after the deadline is rejected even if no read happened in between.
4. Respondents no longer see the survey in **Available surveys**; opening it shows "This survey is closed"; submitting returns 409 `SURVEY_NOT_OPEN` (same code as a manually closed survey).
5. The owner list and detail show "Closes 30 Nov 2026 18:00" while PUBLISHED, and "Closed (scheduled)" after the deadline.
6. A CLOSED survey's closing time cannot be changed (BR-04: no reopening).

## Business rules and validation
`validateClosesAt(value, now)` in `server/src/domain/closing.ts` (pure, unit-tested):
| Input | Result |
|---|---|
| `null` / absent | valid → no schedule |
| not an ISO-8601 date-time string | detail `closesAt: Must be a date and time` |
| `<= now` | detail `closesAt: Must be in the future` |
| more than 366 days after now | detail `closesAt: Must be within one year` |

`isAcceptingResponses(status, closesAt, now)` → true only for `PUBLISHED` with `closesAt` null or later than `now`.

## API
| Method / path | Request | Success | Errors |
|---|---|---|---|
| POST / PUT /api/owner/surveys(/:id) | existing body + optional `closesAt` (ISO string or null) | as F-03; detail includes `closesAt` | 400 `closesAt` detail |
| PUT /api/owner/surveys/:id/closing | `{ "closesAt": "2026-11-30T11:00:00.000Z" \| null }` | 200 `{ "survey": SurveyDetail }` | 400, 401, 403, 404 (not own), 409 `SURVEY_CLOSED` |
| POST /api/owner/surveys/:id/publish | — | as F-04 | + 409 `CLOSING_TIME_PASSED` when `closesAt <= now` |
| GET /api/surveys, GET /api/surveys/:id, POST /api/surveys/:id/responses | unchanged | expired surveys are CLOSED | 409 `SURVEY_NOT_OPEN` after the deadline |

## Data
Migration `scheduled_closing`: `ALTER TABLE "Survey" ADD COLUMN "closesAt" TIMESTAMP(3)`; index on (`status`, `closesAt`).

## UI
Editor: optional `datetime-local` field "Closes at (optional)" with inline error. Detail page: "Closing time" box with **Save** / **Remove** while DRAFT or PUBLISHED. Lists show the closing time. Respondent form shows "Open until …" when a schedule exists.

## Acceptance criteria
| ID | Criterion |
|---|---|
| AC-08-01 | Given an own DRAFT or PUBLISHED survey, when the owner sets a future `closesAt`, then 200 and the value is stored; `null` removes it. |
| AC-08-02 | A `closesAt` that is not a date, is in the past/now, or is more than one year ahead returns 400 with a `closesAt` detail; the stored value is unchanged. |
| AC-08-03 | Given a PUBLISHED survey whose `closesAt` has passed, then respondents do not see it in the list, the survey reads as CLOSED with `closedAt = closesAt`, and a submission returns 409 `SURVEY_NOT_OPEN` with no Response stored. |
| AC-08-04 | Before the deadline the survey accepts responses normally (boundary: one minute before). |
| AC-08-05 | Changing the closing time of a CLOSED survey returns 409 `SURVEY_CLOSED`; publishing a draft whose `closesAt` already passed returns 409 `CLOSING_TIME_PASSED`. |
| AC-08-06 | Another owner gets 404 and a respondent gets 403 on `PUT …/closing`; the survey is unchanged. |

## Definition of Done (feature)
Product DoD plus TEST-08-01…06 and TEST-U-08 pass; TEST-08-03 and TEST-U-08 committed failing first.
