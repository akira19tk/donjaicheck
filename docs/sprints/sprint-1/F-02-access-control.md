# F-02 Role and ownership enforcement — Feature contract

| Item | Value |
|---|---|
| Requirements | BR-06, BR-07, NFR-02 |
| Depends on | F-01 |
| Version | 1.0 (pre-implementation) |

## Behaviour
Cross-cutting responsibility applied to every protected route:
- `requireAuth` → 401 `UNAUTHENTICATED` when there is no valid session.
- `requireRole("SURVEY_OWNER")` on `/api/owner/*`; `requireRole("RESPONDENT")` on `/api/surveys*` and `/api/responses*` → 403 `FORBIDDEN` for the other role.
- Ownership is part of every query: surveys are loaded with `ownerId = currentUser.id`; responses with `respondentId = currentUser.id`. A record that exists but belongs to someone else returns **404 `NOT_FOUND`** with no data (D-07).
- The client never sends a user id or role; identity comes only from the session.

UI: navigation shows only the links for the user's role and redirects unauthorised routes to the user's home page. This is convenience only; the API is the enforcement point.

No new data. No new endpoints (applies to F-01, F-03…F-06 endpoints, see the matrix in [system-sds.md §5](../../system-sds.md)).

## Acceptance criteria
| ID | Criterion |
|---|---|
| AC-02-01 | Every protected endpoint in the permission matrix returns 401 without a session and does not return data. |
| AC-02-02 | A RESPONDENT calling any `/api/owner/*` endpoint gets 403; a SURVEY_OWNER calling `POST /api/surveys/:id/responses` gets 403. |
| AC-02-03 | Owner B calling GET, PUT, publish, close or summary on owner A's survey gets 404 and owner A's survey is unchanged. |

## Definition of Done (feature)
Product DoD plus TEST-02-01…03 pass, driven by a route table so new routes are covered.
