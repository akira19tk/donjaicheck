# Donjaicheck — Three-Sprint Plan

Version 1.0. Features: [../features.md](../features.md).

| Sprint | Goal | Features | Dependencies | Completion outcome | Checkpoint |
|---|---|---|---|---|---|
| 1 | A manager can publish an identified survey, customers answer it once, and the manager sees a summary — with real login, two roles and persistence. | F-01, F-02, F-03, F-04, F-05, F-06, R-01 (design), R-02 | none | Released on `main` with tag `sprint-1`; API, unit and E2E tests pass locally; documented setup. Deployed through CI/CD in Lab 5. | Deliverable 1 / Lab 5 — 15 Nov |
| 2 | Control who can answer and when, add richer questions, and let managers take data out. | F-07, F-08, F-09, F-10 | F-05 (eligibility, closing), F-03/F-06 (multiple choice), F-06 (export) | All Sprint 2 features integrated and deployed; regression suite green. | Deliverable 2 — 29 Nov |
| 3 | Privacy-preserving anonymous surveys, deeper analysis, convenience and hardening. | F-11, F-12, F-13 + hardening (error handling, usability, regression, performance NFR-05) | F-05, F-06 | Complete product released and deployed; UAT defects resolved. | Progress 29 Nov; complete 13 Dec |

## Sprint 1 scope explanation

Sprint 1 follows the theme 10 example in the Group Work Specification: an owner logs in, **creates and publishes** a small identified survey; an eligible respondent logs in, **submits a validated response** and sees confirmation; the owner views an **aggregate summary**; the system **rejects repeat submissions and responses to unpublished or closed surveys**. Access tests cover unauthorised survey management and cross-response access.

Kept small on purpose:
- three question types only (rating, single choice, short text);
- every signed-in respondent is eligible (D-01);
- surveys are identified, not anonymous (D-02);
- accounts come from the seed (no registration UI).

## Sprint 1 work breakdown (Issues)

| Issue | Content | Author | Reviewer |
|---|---|---|---|
| Baseline docs | SRS, features, traceability, SDS, plan | Thanyagorn | Thanaporn |
| Sprint 1 contracts | F-01…F-06 contracts, STS, DoD | Thanaporn | Thanyagorn |
| F-01 + F-02 | Project skeleton, auth, roles | Thanyagorn | Thanaporn |
| F-03 + F-04 | Survey authoring and lifecycle | Thanaporn | Thanyagorn |
| F-05 | Survey response | Thanyagorn | Thanaporn |
| F-06 | Summary + E2E journey | Thanaporn | Thanyagorn |
| Release | `staging` → `main`, tag `sprint-1` | both | both |
