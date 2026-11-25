# Donjaicheck — Requirements Traceability

Version 2.0 (Deliverable 2 release candidate). One matrix: requirement → feature → sprint → acceptance criteria → planned tests → implemented test files → result.
Paths are under `server/tests/api/` unless shown otherwise. "Passed" = passed in the automated run on the release commit recorded in the Deliverable 2 PDF (Part E); nothing is marked passed without a run.

| Requirement | Feature | Sprint | Acceptance criteria | Planned tests (STS) | Implemented test files | Result |
|---|---|---|---|---|---|---|
| FR-01 | F-01 | 1 | AC-01-01…03 | TEST-01-01…03 | server/tests/api/f01-auth.test.ts | Passed |
| FR-02 | F-01 | 1 | AC-01-04 | TEST-01-04 | f01-auth.test.ts | Passed |
| FR-03 | F-01 | 1 | AC-01-05 | TEST-01-05 | f01-auth.test.ts | Passed |
| FR-04 | F-03 | 1 | AC-03-01, AC-03-02 | TEST-03-01…03 | f03-authoring.test.ts | Passed |
| FR-05 | F-03 | 1 | AC-03-03, AC-03-04 | TEST-03-04, 03-05 | f03-authoring.test.ts | Passed |
| FR-06 | F-04 | 1 | AC-04-01, AC-04-03 | TEST-04-01, 04-03 | f04-lifecycle.test.ts | Passed |
| FR-07 | F-04 | 1 | AC-04-02 | TEST-04-02 | f04-lifecycle.test.ts | Passed |
| FR-08 | F-03 | 1 | AC-03-05 | TEST-03-06 | f03-authoring.test.ts | Passed |
| FR-09 | F-05 | 1 | AC-05-01 | TEST-05-01 | f05-response.test.ts | Passed |
| FR-10 | F-05 | 1 | AC-05-02 | TEST-05-02, E2E-01 | f05-response.test.ts, e2e/journey.spec.ts | Passed |
| FR-11 (rev. CR-01) | F-05 | 1 + CR-01 | AC-05-07, AC-05-08…12 | TEST-05-08, TEST-05-09…12, TEST-U-15, E2E-03 | f05-response.test.ts, cr01-edit-response.test.ts, unit/editResponse.test.ts, e2e/sprint2.spec.ts | Passed |
| FR-12 | F-06 | 1 | AC-06-01, AC-06-02 | TEST-06-01, 06-02, E2E-01 | f06-summary.test.ts | Passed |
| FR-13 | F-07 | 2 | AC-07-01…07 | TEST-07-01…07, TEST-U-07, E2E-03 | f07-visit-codes.test.ts, unit/visitCodes.test.ts | Passed |
| FR-14 | F-08 | 2 | AC-08-01…06 | TEST-08-01…06, TEST-U-08 | f08-closing.test.ts, unit/closing.test.ts | Passed |
| FR-15 | F-09 | 2 | AC-09-01…06 | TEST-09-01…06, TEST-U-09a/b, E2E-03 | f09-multiple-choice.test.ts, unit/surveyRules.test.ts, unit/responseRules.test.ts | Passed |
| FR-16 | F-10 | 2 | AC-10-01…05 | TEST-10-01…05, TEST-U-10 | f10-export.test.ts, unit/csvExport.test.ts | Passed |
| FR-17 | F-11 | 3 | AC-11-01…05 | TEST-11-01…05, TEST-U-11 | — (planned) | **Not tested — not implemented** (target 5 Dec) |
| FR-18 | F-12 | 3 | AC-12-01…03 | TEST-12-01, 12-02, TEST-U-12, E2E-04 | — (planned) | **Not tested — not implemented** (target 9 Dec) |
| FR-19 | F-13 | 3 | AC-13-01…05 | TEST-13-01…05, TEST-U-13, E2E-05 | f13-duplicate.test.ts, unit/duplicate.test.ts, e2e/sprint2.spec.ts | Passed |
| BR-01 | F-05 | 1 | AC-05-03 | TEST-05-03, TEST-05-09 (kept by CR-01) | f05-response.test.ts | Passed |
| BR-02 | F-05 | 1 | AC-05-04 | TEST-05-04, 05-05 | f05-response.test.ts | Passed |
| BR-03 | F-05, F-09 | 1, 2 | AC-05-05, AC-09-04 | TEST-05-06, 05-07, TEST-U-02, TEST-U-09b | f05-response.test.ts, unit/responseRules.test.ts | Passed |
| BR-04 | F-04 | 1 | AC-04-03, AC-04-04 | TEST-04-03, 04-04, TEST-U-01 | f04-lifecycle.test.ts | Passed |
| BR-05 | F-03 | 1 | AC-03-04 | TEST-03-05 | f03-authoring.test.ts | Passed |
| BR-06 | F-02, F-03, F-04, F-06, F-07, F-08, F-10, F-13 | 1, 2, 3 | AC-02-03, AC-06-03, AC-07-06, AC-08-06, AC-10-05, AC-13-04 | TEST-02-03, 06-03, 07-06, 08-06, 10-05, 13-04 | f02-ownership.test.ts and feature files | Passed |
| BR-07 | F-02, F-05 | 1 | AC-02-02, AC-05-07, AC-05-12 | TEST-02-02, 05-08, 05-12 | f02-access.test.ts, f05-response.test.ts, cr01-edit-response.test.ts | Passed |
| BR-08 | F-03 | 1 | AC-03-02 | TEST-03-02, 03-03, TEST-U-03 | f03-authoring.test.ts, unit/surveyRules.test.ts | Passed |
| BR-09 | F-07 | 2 | AC-07-03…05 | TEST-07-03…05 | f07-visit-codes.test.ts | Passed |
| BR-10 | F-11 | 3 | AC-11-03 | TEST-11-03, TEST-U-11 | — (planned) | **Not tested — not implemented** |
| BR-11 | F-08 | 2 | AC-08-02…05 | TEST-08-02…05, TEST-U-08 | f08-closing.test.ts | Passed |
| BR-12 | F-09 | 2 | AC-09-02, AC-09-04 | TEST-09-02, 09-04, TEST-U-09a/b | f09-multiple-choice.test.ts | Passed |
| BR-13 | F-10 | 2 | AC-10-02 | TEST-10-02, TEST-U-10 | f10-export.test.ts, unit/csvExport.test.ts | Passed |
| BR-14 | F-13 | 3 | AC-13-01…03 | TEST-13-01…03, TEST-U-13 | f13-duplicate.test.ts | Passed |
| BR-15 (CR-01) | F-05 | CR-01 | AC-05-08…11 | TEST-05-09…11, TEST-U-15 | cr01-edit-response.test.ts, unit/editResponse.test.ts | Passed |
| NFR-01 | F-01 | 1 | AC-01-06 | TEST-01-06 | f01-auth.test.ts | Passed |
| NFR-02 | F-02 | 1 | AC-02-01…03 | TEST-02-01…03 (route table incl. Sprint 2/3 routes) | f02-access.test.ts, tests/helpers/routes.ts | Passed |
| NFR-03 | F-01 | 1 | AC-01-04, AC-01-07 | TEST-01-04, 01-07 | f01-auth.test.ts | Passed |
| NFR-04 | R-01 | Lab 5 | Lab 5 C-05 | Restart + redeploy check | deploy/smoke_test.py + manual | Passed (Lab 5); re-checked on D2 deploy |
| NFR-05 | F-12 | 3 | AC-12-04 | PERF-01 | — (planned deploy/perf_summary.py) | **Not tested — not implemented** |
| NFR-06 | R-02 | 1 | AC-05-06 | E2E-02, M-01, M-02 | e2e/journey.spec.ts | Passed (E2E); M-02 manual on deploy |
| NFR-07 | R-01 | 1 / Lab 5 | `.env.example`; no secret in Git | Review checklist | — | Passed (review) |
| NFR-08 | F-11 | 3 | AC-11-02 | TEST-11-02, M-11 | — (planned) | **Not tested — not implemented** |

## Coverage status

- Every FR, BR and NFR is allocated to a feature or system responsibility and a sprint.
- **Requirements without passing tests:** FR-17, FR-18, BR-10, NFR-05, NFR-08 — Sprint 3 features F-11/F-12 are contracted but not implemented (see [sprints/remaining-work.md](sprints/remaining-work.md)).
- Approved changes since v1.0: SRS v1.1–v1.3 (BR-12…BR-15, D-08, D-09, CR-01). See [register.md](register.md).

## Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 13 Nov 2026 | Sprint 1 baseline (planned tests only for Sprints 2–3) |
| 2.0 | 25 Nov 2026 | Sprint 2 contracts, CR-01 and F-13 traced to implemented test files and results; untested Sprint 3 requirements listed |
