# Donjaicheck — Software Requirements Specification (SRS)

| Item | Value |
|---|---|
| Course | CPE334 Software Engineering, Semester 1/2026 |
| Team | EN-020 T&T — Thanyagorn (67070503490), Thanaporn (67070503416) |
| Theme | 10. Review, Feedback, and Survey System |
| Version | 1.3 (CR-01; see §8 version history) |

## 1. Stakeholder problem and context

**Donjai Kitchen** is a small restaurant chain (synthetic context) that wants to know how customers feel about food, service and speed. Today the manager collects paper comment cards that are rarely read and cannot be summarised.

Donjaicheck lets a **restaurant manager** design a short satisfaction survey, publish it, and see aggregate results. **Customers** who have an account sign in, answer the published survey once, and receive a confirmation.

The product is a survey system specialised for restaurant customer feedback. It is **not** a public review site: there is no public star rating per restaurant, and only the survey owner sees results.

## 2. Actors and responsibilities

| Actor | Role in system | Responsibilities |
|---|---|---|
| Survey Owner (restaurant manager) | `SURVEY_OWNER` | Create and edit draft surveys, publish and close own surveys, view aggregate results of own surveys. |
| Respondent (restaurant customer) | `RESPONDENT` | View published surveys, submit one validated response per survey, view own submitted response. |
| System | — | Authenticate users, enforce roles, ownership and business rules on the backend, persist all data. |

Accounts are created by the seed script. Self-registration is out of scope (spec §5.2).

## 3. Scope

### 3.1 In scope (whole product, Sprints 1–3)
- Login, logout, current-user identity, two roles with backend enforcement.
- Survey authoring with question types Rating (1–5), Single choice, Short text; later Multiple choice.
- Survey lifecycle Draft → Published → Closed, including scheduled closing (Sprint 2).
- Response collection with validation, one response per respondent per survey.
- Eligibility control by visit code (Sprint 2).
- Aggregate summary; CSV export (Sprint 2); richer analysis (Sprint 3).
- Anonymous response mode with documented identity/answer separation (Sprint 3).

### 3.2 Explicit exclusions
- Self-registration, password recovery, email verification, account administration UI.
- Public reviews, star ratings of restaurants, social features.
- Real email/SMS/LINE notifications and payment integration.
- Multiple roles per account; multi-tenant organisations.
- Mobile native app (the web UI is responsive only).

## 4. Functional Requirements (FR)

| ID | Requirement | Sprint |
|---|---|---|
| FR-01 | A user signs in with email and password and receives a server-side session. | 1 |
| FR-02 | A signed-in user signs out; the session is invalidated on the server. | 1 |
| FR-03 | A signed-in user can retrieve their identity (name, email, role). | 1 |
| FR-04 | A Survey Owner creates a draft survey with a title, optional description and up to 20 questions. Each question has text, a type (RATING, SINGLE_CHOICE, TEXT) and a required flag; SINGLE_CHOICE questions have options. | 1 |
| FR-05 | A Survey Owner edits the title, description and questions of their own draft survey. | 1 |
| FR-06 | A Survey Owner publishes their own draft survey. | 1 |
| FR-07 | A Survey Owner closes their own published survey. | 1 |
| FR-08 | A Survey Owner lists their own surveys with status and response count. | 1 |
| FR-09 | A Respondent lists published surveys and sees whether they have already responded. | 1 |
| FR-10 | A Respondent submits a response to a published survey and sees a confirmation with the submission time. | 1 |
| FR-11 | A Respondent views their own submitted response and may correct it within the limits of BR-15 (CR-01). | 1 (correction: CR-01) |
| FR-12 | A Survey Owner views an aggregate summary of their own survey: response count, average and distribution for each rating question, count per option for each single-choice question, and the list of text answers. | 1 |
| FR-13 | A Survey Owner restricts a survey to customers who enter a valid visit code. | 2 |
| FR-14 | A Survey Owner sets a closing date/time; the survey stops accepting responses after it. | 2 |
| FR-15 | A Survey Owner adds MULTIPLE_CHOICE questions with a minimum and maximum number of selections. | 2 |
| FR-16 | A Survey Owner exports the responses of their own survey as CSV. | 2 |
| FR-17 | A Survey Owner creates an anonymous survey whose stored answers cannot be linked to a respondent. | 3 |
| FR-18 | A Survey Owner filters the summary by submission date range and sees per-question charts. | 3 |
| FR-19 | A Survey Owner creates a new draft by duplicating an existing survey. | 3 |

## 5. Business Rules (BR)

| ID | Rule | Sprint |
|---|---|---|
| BR-01 | A respondent may submit **at most one response per survey**. A second submission is rejected and no second response is stored. | 1 |
| BR-02 | Responses are accepted **only while the survey is PUBLISHED**. Submissions to DRAFT or CLOSED surveys are rejected. | 1 |
| BR-03 | A response is valid only if every required question is answered, ratings are integers 1–5, a single-choice answer references an option of that question, text answers are at most 500 characters, and no answer references a question outside the survey. | 1 |
| BR-04 | Allowed status transitions are DRAFT → PUBLISHED and PUBLISHED → CLOSED only. A survey can be published only if it has at least one question. | 1 |
| BR-05 | Only DRAFT surveys can be edited. Published or closed surveys are read-only. | 1 |
| BR-06 | A Survey Owner may view, edit, publish, close and summarise **only surveys they own**. | 1 |
| BR-07 | A Respondent may read **only their own responses** and may not use any survey-management operation. | 1 |
| BR-08 | A survey title is 1–120 characters; a survey has at most 20 questions (at least 1 to publish, see BR-04); question text is 1–200 characters; a SINGLE_CHOICE question has 2–10 options with unique, non-empty labels. | 1 |
| BR-09 | For an eligibility-restricted survey, a response requires an unused visit code issued for that survey; each code can be used once. | 2 |
| BR-10 | In an anonymous survey, the stored answers have no link to the respondent; participation is recorded separately only to enforce BR-01; aggregate results are shown only after at least 3 responses. | 3 |
| BR-11 | A survey with a closing time stops accepting responses at that time and is shown as CLOSED. The closing time must be in the future and at most one year ahead when set. | 2 |
| BR-12 | A MULTIPLE_CHOICE question has 2–10 unique options, `minSelections` 0…options and `maxSelections` 1…options with min ≤ max (required ⇒ min ≥ 1). An answer selects distinct options of that question, between min and max. | 2 |
| BR-13 | Exported CSV cells are RFC 4180 quoted and cells starting with `=`, `+`, `-`, `@`, TAB or CR are prefixed with `'` (formula-injection protection). | 2 |
| BR-15 | A respondent may replace the answers of their own response only while it is less than 30 minutes since submission, it has been edited fewer than 3 times, and the survey still accepts responses (BR-02, BR-11). The response keeps its id and submission time; answers are validated as in BR-03. (CR-01) | 1 (CR-01) |
| BR-14 | Duplicating a survey creates a new DRAFT of the same owner with the questions, options and settings copied, but never responses, visit codes or schedule. | 3 |

## 6. Non-Functional Requirements (NFR)

| ID | Requirement (measurable target) | Verification | Sprint |
|---|---|---|---|
| NFR-01 | Passwords are stored only as bcrypt hashes with cost ≥ 10; no plaintext password is stored or returned. | Unit test + DB inspection test | 1 |
| NFR-02 | Every protected endpoint returns 401 without a valid session and 403 for the wrong role; another owner's survey or another respondent's response returns 404 without private data. | API integration tests | 1 |
| NFR-03 | Session token is random (256-bit), sent only in an httpOnly SameSite=Lax cookie, stored only as a SHA-256 hash, expires after 8 hours, and is deleted on logout. | API tests | 1 |
| NFR-04 | All data survives an application restart and a redeployment (stored in PostgreSQL, not in the container). | Lab 5 restart/redeploy check | 1 / Lab 5 |
| NFR-05 | The summary endpoint returns within 1 s (p95) for a survey with 500 responses on the deployed service. | Scripted load check | 3 |
| NFR-06 | Every form shows field-level validation errors and every list shows loading, empty and error states. | E2E + manual UI check | 1 |
| NFR-07 | All configuration is read from environment variables; no real secret is committed. | Code review + `.env.example` + Lab 5 | 1 |
| NFR-08 | Anonymous survey data cannot be joined to user identity by any query exposed to the owner. | Schema review + API test | 3 |

## 7. Assumptions, decisions and questions

| ID | Item | Resolution |
|---|---|---|
| D-01 | What does "eligible respondent" mean in Sprint 1? | Any signed-in RESPONDENT is eligible for any PUBLISHED survey. Visit-code eligibility is FR-13/BR-09 in Sprint 2. |
| D-02 | Are Sprint 1 surveys anonymous? | No. Sprint 1 surveys are **identified** (response linked to respondent) and the UI says so. Anonymous mode is Sprint 3 (FR-17, BR-10). |
| D-03 | Can owners see who wrote each text answer? | Not in Sprint 1. The summary lists text answers without names. Raw-data access rules are revisited with CSV export (Sprint 2). |
| D-04 | Can a respondent change a submitted response? | ~~No. Responses are final.~~ **Revised by CR-01 (v1.3):** yes, for 30 minutes and at most 3 times while the survey is open (BR-15); after that the response is final. |
| D-05 | Can a closed survey be reopened? | No (BR-04). The owner duplicates it instead (FR-19, Sprint 3). |
| D-06 | Who creates accounts? | The seed script creates demo accounts; passwords come from an environment variable, never from code. |
| D-07 | What happens when an owner requests another owner's survey? | 404 Not Found, so the existence of other owners' surveys is not revealed. |
| D-08 | Does the CSV export identify respondents? (revises D-03) | Yes for **identified** surveys: the owner already knows customers by account (A-01) and needs the export to follow up complaints. Anonymous surveys (F-11) never export identity. The summary page stays without names. |
| D-09 | How are visit codes delivered? | The owner generates codes in the app and prints them on receipts; the system does not send codes. |
| A-01 | Customers have an account at the restaurant (loyalty membership). | Assumed for the identified Sprint 1 mode. |
| A-02 | One restaurant organisation uses the system. | Assumed; multi-tenancy is excluded. |

## 8. Version history

| Version | Date | Change | Rationale |
|---|---|---|---|
| 1.0 | 8 Nov 2026 | Sprint 1 baseline | Deliverable 1 |
| 1.1 | 18 Nov 2026 | Student IDs in header corrected | Typo found during Lab 5 (#26) |
| 1.2 | 24 Nov 2026 | FR-15 and BR-11 made measurable; BR-12, BR-13, BR-14 added; D-08 revises D-03; D-09 added | Sprint 2/3 contracts needed testable rules for multiple choice, CSV safety and duplication; CSV export without identity would not meet the manager's need to follow up complaints |
| 1.3 | 25 Nov 2026 | CR-01: FR-11 extended, BR-15 added, D-04 revised | Customers need to correct mis-tapped answers shortly after submitting (docs/maintenance/CR-01-edit-response.md) |
