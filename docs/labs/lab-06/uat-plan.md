# Donjaicheck — Sprint 1 UAT Plan and Handoff (Lab 6, Part A)

| Item | Value |
|---|---|
| Product Team | EN-020 T&T — Thanyagorn (67070503490), Thanaporn (67070503416) |
| Product | Donjaicheck — restaurant customer-satisfaction surveys (Theme 10) |
| Repository | https://github.com/akira19tk/donjaicheck |
| Sprint 1 functional baseline | tag `sprint-1` → commit `022a45e` (release PR #15) |
| Release under test | tag `uat-s1` → `main` commit `4bcd6e6` (PR #30) |
| Deployed URL | https://donjaicheck-kkb2behi3a-as.a.run.app |
| Deployed revision | Cloud Run image tag `4bcd6e6…` (full SHA in the Actions run Summary of *Deploy demo*) |
| UAT Team | To be confirmed — recorded in Issue #32 and in the Lab 6 report once the pairing is agreed |

**Why `4bcd6e6` and not `022a45e`.** Commits after `sprint-1` are Lab 5 delivery work: Docker, CI, the deploy workflow and docs, a cookie `secure` switch for local Docker (`server/src/routes/auth.ts`) and a footer line in the UI (`Layout.tsx`, `styles.css`). No Sprint 1 requirement, API contract or business rule changed: `git diff --stat sprint-1 uat-s1 -- server/src client/src server/prisma` lists only those three files.

## 1. Accepted-for-test scope (Sprint 1 contract)

In scope: FR-01 … FR-12, BR-01 … BR-08, NFR-02, NFR-06 (see `docs/srs.md`, acceptance criteria in `docs/sprints/sprint-1/F-01 … F-06`).

| Feature | What a user can do |
|---|---|
| F-01 Authentication | Sign in, sign out, see own name and role |
| F-02 Access control | Each role sees only its own pages and data |
| F-03 Survey authoring | Owner creates and edits **draft** surveys (Rating 1–5, Single choice, Short text) |
| F-04 Survey lifecycle | Owner publishes a draft, closes a published survey (Draft → Published → Closed) |
| F-05 Survey response | Customer answers a published survey **once**, sees a confirmation and their own answers |
| F-06 Aggregate summary | Owner sees response count, rating average and distribution, option counts and comments |

**Out of scope — not a defect for this UAT** (Sprint 2/3 or excluded): visit codes, scheduled closing, multiple-choice questions, CSV export, anonymous surveys, charts/date filters, survey duplication, self-registration, password change/recovery, deleting surveys, editing a submitted response (decision D-04: responses are final), re-opening a closed survey.

## 2. Accounts (credentials are sent privately, never in Git or the PDF)

| Label | Email | Role | Used in |
|---|---|---|---|
| OWNER-A | manager@donjai.test | SURVEY_OWNER (Somchai, Donjai Siam) | UAT-01 … UAT-04 |
| OWNER-B | manager2@donjai.test | SURVEY_OWNER (Malee, Donjai Ari) | UAT-03 |
| CUST-1 | customer1@donjai.test | RESPONDENT | UAT-01, UAT-02, UAT-04 |
| CUST-2 | customer2@donjai.test | RESPONDENT | UAT-02 |
| CUST-3 | customer3@donjai.test | RESPONDENT | UAT-03, UAT-04 |

All data is synthetic. Use a **private/incognito window per account** (or sign out between accounts) so two sessions do not mix.

## 3. Data setup, sequence and cleanup

- **Sequence.** Run UAT-01 → UAT-02 → UAT-03 → UAT-04 in order. They share one new survey **S** created in UAT-01. Record S's ID from the address bar (`/owner/surveys/<S>`) and CUST-1's response ID (`/responses/<R1>`).
- **Unique title.** Name the survey `UAT <your team> <HHMM>` (e.g. `UAT EN-021 1430`). A new title per run means a re-run never touches data from an earlier run, and CUST-1/CUST-2 can answer again because it is a different survey.
- **Do not use the seeded survey** "Dinner experience at Donjai Siam" — other people may already have answered it.
- **Cleanup.** Deleting surveys is not in Sprint 1. UAT-04 leaves S **CLOSED**, so it accepts no more answers. The draft in UAT-02c is never saved. Nothing else needs cleanup. If a run is aborted, close S from its detail page and start again with a new title.
- **Do not** deploy, change accounts or run scripts. Tell the Product Team (through the private chat used to send the credentials, or a comment on Issue #32) if the site is down; that test is BLOCKED, not FAIL.

## 4. UAT cases

Expected results are written so that you do not need any verbal explanation. Record what you **actually** see.

### UAT-01 Normal journey: create, publish, answer, see results

| Field | Value |
|---|---|
| Requirements / AC | FR-01, FR-04, FR-06, FR-10, FR-12 · AC-01-01, AC-03-01, AC-04-01, AC-05-02, AC-06-01 |
| Purpose | A manager can run a survey end-to-end and a customer's answers appear in the results. |
| Roles | OWNER-A, CUST-1 |
| Preconditions | Site is up; you are signed out. |
| Synthetic inputs | Title `UAT <team> <HHMM>`; Q1 RATING "How was the food taste?" required; Q2 SINGLE_CHOICE "Which dish did you order?" required, options `Pad Thai`, `Green curry`, `Mango sticky rice`; Q3 TEXT "Any comments?" not required. CUST-1 answers: Q1 = 4, Q2 = Pad Thai, Q3 = `Tasty but a bit salty` |

**Steps**

1. Sign in as OWNER-A.
2. Click **New survey**, enter the title and the three questions above (click **+ Add option** for the third option), click **Save draft**.
3. On the survey page, note the survey ID from the address bar (= S). Click **Publish** and confirm.
4. Sign out. Sign in as CUST-1 (new private window is fine).
5. In **Available surveys**, open survey S, enter CUST-1's answers, click **Submit answers**.
6. Note the response ID from the address bar (= R1).
7. Sign in as OWNER-A, open S, click the summary/results link.

**Expected results**

- After step 2: S appears in **My surveys** with status **Draft** and 0 responses, questions in the order Q1, Q2, Q3.
- After step 3: message "Survey published."; status **Published** with a published date/time.
- Step 5: CUST-1 sees S in Available surveys before answering. After submitting, the page shows "Thank you! Your answers were submitted at `<date time>`" and lists the answers 4 / Pad Thai / Tasty but a bit salty.
- Step 7: **1 response**. Q1: 1 answer · average **4.00** / 5, bar 4★ = 1, all other bars 0. Q2: Pad Thai 1, Green curry 0, Mango sticky rice 0. Q3: one comment "Tasty but a bit salty".

### UAT-02 Business rules and boundaries: required answers, one response, valid options

| Field | Value |
|---|---|
| Requirements / AC | BR-01, BR-03, BR-08, NFR-06 · AC-05-03, AC-05-06, AC-03-02 |
| Purpose | Invalid input is rejected with a clear message and nothing wrong is stored; a customer cannot answer twice. |
| Roles | CUST-2, CUST-1, OWNER-A |
| Preconditions | UAT-01 passed; S is Published with 1 response. |
| Synthetic inputs | CUST-2 first attempt: Q1 empty, Q2 = Green curry, Q3 = `Friendly staff`; second attempt: Q1 = 5. Draft title `UAT <team> <HHMM> bad options`, one SINGLE_CHOICE question "Seat type?" with options `Indoor`, `Indoor`. |

**Steps**

1. **(a) Required answer.** Sign in as CUST-2, open S, leave Q1 empty, choose Green curry, type `Friendly staff`, click **Submit answers**.
2. Without reloading, select 5 for Q1 and click **Submit answers** again.
3. **(b) One response per customer.** Sign in as CUST-1, open **Available surveys**.
4. Open S from the list, or type `/surveys/<S>` in the address bar.
5. **(c) Invalid options.** Sign in as OWNER-A, click **New survey**, enter the draft title and the question with two options both `Indoor`, click **Save draft**.
6. Open **My surveys**.
7. Open the summary of S.

**Expected results**

- Step 1: the form is **not** submitted. An error appears next to Q1 and the banner "Please answer the highlighted questions." Green curry and `Friendly staff` are still filled in.
- Step 2: confirmation "Thank you! Your answers were submitted at …" with 5 / Green curry / Friendly staff.
- Step 3: S shows the badge **Answered**.
- Step 4: no answer form is shown; you are taken to CUST-1's existing answers (4 / Pad Thai / …) with the **original** submission time.
- Step 5: the draft is **not** saved; an error appears at the options of that question ("Please fix the highlighted fields.").
- Step 6: no survey titled `… bad options` exists.
- Step 7: **2 responses** (not 3). Q1 average **4.50** = (4 + 5) / 2; bars 5★ = 1, 4★ = 1. Q2: Pad Thai 1, Green curry 1, Mango sticky rice 0. Q3: 2 comments.

### UAT-03 Forbidden role and ownership: other owner, customer, other customer

| Field | Value |
|---|---|
| Requirements / AC | BR-06, BR-07, NFR-02 · AC-02-02, AC-02-03, AC-05-07, AC-06-03 |
| Purpose | Nobody can see or change data that is not theirs, through the UI or by typing a URL. |
| Roles | OWNER-B, CUST-3, OWNER-A |
| Preconditions | UAT-02 passed; you know S and R1. |
| Synthetic inputs | URLs only (replace `<S>` and `<R1>`). |

**Steps**

1. Sign in as OWNER-B. Open **My surveys**.
2. Type `https://donjaicheck-kkb2behi3a-as.a.run.app/owner/surveys/<S>/summary`.
3. Type `…/owner/surveys/<S>` and `…/owner/surveys/<S>/edit`.
4. Type `…/api/owner/surveys/<S>/summary` (raw API).
5. Sign in as CUST-3. Type `…/owner/surveys/<S>/summary`.
6. Type `…/api/owner/surveys/<S>/summary`.
7. Type `…/responses/<R1>` (CUST-1's response) and `…/api/responses/<R1>`.
8. Sign in as OWNER-A and open S and its summary.

**Expected results**

- Step 1: S is **not** in OWNER-B's list.
- Steps 2–3: "Survey not found." No title, question or result of S is shown; there are no Publish/Close/Edit buttons for S.
- Step 4: JSON with error code `NOT_FOUND` (HTTP 404) and **no** survey data.
- Step 5: CUST-3 is sent back to **Available surveys**; no results are shown.
- Step 6: JSON with error code `FORBIDDEN` (HTTP 403) and no `responseCount`, average or answers.
- Step 7: page shows "Response not found."; the API returns `NOT_FOUND` (404) with no answers of CUST-1.
- Step 8: S is unchanged: still **Published**, **2 responses**, average 4.50 (nothing was disclosed or changed by steps 1–7).

### UAT-04 State, history and persistence: read-only after publish, close, survives re-login

| Field | Value |
|---|---|
| Requirements / AC | BR-02, BR-04, BR-05, FR-07, FR-09, FR-11 · AC-03-04, AC-04-02, AC-05-01, AC-05-04, AC-05-07 |
| Purpose | Status changes follow Draft → Published → Closed only, a closed survey accepts no answers, and stored data stays the same after signing out and in. |
| Roles | OWNER-A, CUST-3, CUST-1 |
| Preconditions | UAT-03 passed; S is Published with 2 responses. |
| Synthetic inputs | None. |

**Steps**

1. Sign in as OWNER-A, open S. Type `…/owner/surveys/<S>/edit`.
2. Back on S, click **Close survey** and confirm.
3. Open **My surveys**.
4. Sign in as CUST-3, open **Available surveys**. Then type `…/surveys/<S>`.
5. Sign in as CUST-1, open `…/responses/<R1>`.
6. Sign out, close the browser window, sign in again as OWNER-A and open the summary of S.

**Expected results**

- Step 1: S has no **Edit** button while Published; the edit URL shows "Only draft surveys can be edited." and no field can be saved.
- Step 2: message "Survey closed."; status **Closed** with a closed date/time; no Publish or Close button remains (cannot be re-opened).
- Step 3: S listed as **Closed** · 2 responses.
- Step 4: S is **not** in Available surveys. The direct URL shows "This survey is closed and no longer accepts responses." and no **Submit answers** button.
- Step 5: CUST-1 still sees the answers 4 / Pad Thai / Tasty but a bit salty with the **same** submission time recorded in UAT-01.
- Step 6: summary still shows 2 responses, average 4.50, Pad Thai 1, Green curry 1, 2 comments.

## 5. How to record results (UAT Team)

For each step group record: case ID, tester name/team, date-time, tested URL + revision `4bcd6e6`, inputs actually used, **actual** result in your own words, PASS / FAIL / BLOCKED (+ reason). Take a screenshot for at least UAT-01 step 7, UAT-03 steps 2, 6, 7 and UAT-04 step 4, with the address bar and clock visible.

## 6. Reporting a finding

Open a GitHub Issue at https://github.com/akira19tk/donjaicheck/issues/new with label `lab6-uat` (or send the same fields in the LINE group if you cannot open Issues):
Title `[UAT] <short summary>` · tested revision · linked case/step and requirement · preconditions/data · steps to reproduce · expected · actual · severity (Critical / Major / Minor / Enhancement suggestion) and why · screenshot.

Severity guide: **Critical** — data of another user is exposed or changed, or the main journey cannot be completed; **Major** — a Sprint 1 rule (BR-01…BR-08) or AC is broken with a workaround; **Minor** — wording, layout or message issue that does not break a rule.

The Product Team will reply on each Issue with: accepted defect / duplicate / not-defect / enhancement and the reason.
