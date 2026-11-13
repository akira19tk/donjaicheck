# F-01 Authentication and session — Feature contract

| Item | Value |
|---|---|
| Requirements | FR-01, FR-02, FR-03, NFR-01, NFR-03 |
| Depends on | — |
| Version | 1.1 (1.0 pre-implementation; 1.1 seed variable names aligned with SDS 1.1) |

## Behaviour and workflow
1. User opens `/login`, enters email and password, presses **Log in**.
2. API normalises email (trim, lower-case), finds the user, compares bcrypt hash.
3. On success the API creates a session (random 256-bit token, SHA-256 hash stored, `expiresAt = now + SESSION_TTL_HOURS`), sets cookie `dc_session` and returns the user. UI routes SURVEY_OWNER → `/owner/surveys`, RESPONDENT → `/surveys`.
4. On page load the UI calls `GET /api/auth/me` to restore identity.
5. **Log out** calls `POST /api/auth/logout`; the session row is deleted and the cookie cleared; UI returns to `/login`.

## Validation, errors and boundaries
- Missing email or password → 400 `VALIDATION_FAILED` with field details.
- Unknown email **or** wrong password → 401 `INVALID_CREDENTIALS`, identical message ("Email or password is incorrect").
- Expired or unknown session token → 401 `UNAUTHENTICATED`; expired row is deleted.
- State-changing requests without `X-Requested-With: Donjaicheck` → 403 `CSRF_REJECTED`.

## API
| Method / path | Request | Success | Errors |
|---|---|---|---|
| POST /api/auth/login | `{ "email": string, "password": string }` | 200 `{ "user": { "id", "name", "email", "role" } }` + Set-Cookie | 400, 401, 403 |
| POST /api/auth/logout | — (cookie) | 204, cookie cleared | 401, 403 |
| GET /api/auth/me | — (cookie) | 200 `{ "user": {...} }` | 401 |

## Data
`User` (id, name, email unique, passwordHash, role, createdAt) and `Session` (tokenHash PK, userId, createdAt, expiresAt). Migration `init` creates both plus enum `Role`. Seed creates 2 owners (password from `ADMIN_PASSWORD`) and 3 demo respondents (password from `DEMO_USER_PASSWORD`).

## UI
Login form with email, password, submit, inline error banner on 401; header with name, role badge and **Log out** on every signed-in page.

## Acceptance criteria
| ID | Criterion |
|---|---|
| AC-01-01 | Given a seeded user, when they log in with correct credentials, then 200 is returned with id, name, email and role (no password hash) and an httpOnly cookie `dc_session` is set. |
| AC-01-02 | Given a seeded user, when the password is wrong, then 401 `INVALID_CREDENTIALS` is returned and no cookie is set. |
| AC-01-03 | When the email does not exist, the response is identical to AC-01-02; when email or password is missing, 400 `VALIDATION_FAILED`. |
| AC-01-04 | Given a signed-in user, when they log out, then 204 is returned and the old token gets 401 on `/api/auth/me`. |
| AC-01-05 | Given a valid session, `GET /api/auth/me` returns the current user; without a cookie it returns 401. |
| AC-01-06 | Stored `passwordHash` values are bcrypt hashes (prefix `$2`) with cost ≥ 10 and never equal the plaintext. |
| AC-01-07 | The session row stores only the SHA-256 hash of the token; a session past `expiresAt` is rejected with 401. |

## Definition of Done (feature)
Product DoD in [dod.md](dod.md) plus: TEST-01-01…07 pass; login/logout demonstrated in UI.
