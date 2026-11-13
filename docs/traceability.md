# Donjaicheck — Requirements Traceability

Version 1.0 (Sprint 1 baseline). Requirement → feature → sprint → acceptance criteria → planned tests.
AC and test IDs for Sprint 1 are defined in [sprints/sprint-1](sprints/sprint-1/). Later-sprint requirements are allocated now; their AC/tests are written when the feature contract is prepared.

| Requirement | Feature / responsibility | Sprint | Acceptance criteria | Planned tests |
|---|---|---|---|---|
| FR-01 | F-01 | 1 | AC-01-01, AC-01-02, AC-01-03 | TEST-01-01, TEST-01-02, TEST-01-03 |
| FR-02 | F-01 | 1 | AC-01-04 | TEST-01-04 |
| FR-03 | F-01 | 1 | AC-01-05 | TEST-01-05 |
| FR-04 | F-03 | 1 | AC-03-01, AC-03-02 | TEST-03-01, TEST-03-02, TEST-03-03 |
| FR-05 | F-03 | 1 | AC-03-03, AC-03-04 | TEST-03-04, TEST-03-05 |
| FR-06 | F-04 | 1 | AC-04-01, AC-04-03 | TEST-04-01, TEST-04-03 |
| FR-07 | F-04 | 1 | AC-04-02 | TEST-04-02 |
| FR-08 | F-03 | 1 | AC-03-05 | TEST-03-06 |
| FR-09 | F-05 | 1 | AC-05-01 | TEST-05-01 |
| FR-10 | F-05 | 1 | AC-05-02 | TEST-05-02, TEST-E2E-01 |
| FR-11 | F-05 | 1 | AC-05-07 | TEST-05-08 |
| FR-12 | F-06 | 1 | AC-06-01, AC-06-02 | TEST-06-01, TEST-06-02, TEST-E2E-01 |
| FR-13 | F-07 | 2 | (Sprint 2 contract) | — |
| FR-14 | F-08 | 2 | (Sprint 2 contract) | — |
| FR-15 | F-09 | 2 | (Sprint 2 contract) | — |
| FR-16 | F-10 | 2 | (Sprint 2 contract) | — |
| FR-17 | F-11 | 3 | (Sprint 3 contract) | — |
| FR-18 | F-12 | 3 | (Sprint 3 contract) | — |
| FR-19 | F-13 | 3 | (Sprint 3 contract) | — |
| BR-01 | F-05 | 1 | AC-05-03 | TEST-05-03 |
| BR-02 | F-05 | 1 | AC-05-04 | TEST-05-04, TEST-05-05 |
| BR-03 | F-05 | 1 | AC-05-05 | TEST-05-06, TEST-05-07, TEST-U-02 |
| BR-04 | F-04 | 1 | AC-04-03, AC-04-04 | TEST-04-03, TEST-04-04, TEST-U-01 |
| BR-05 | F-03 | 1 | AC-03-04 | TEST-03-05 |
| BR-06 | F-02, F-03, F-04, F-06 | 1 | AC-02-03, AC-06-03 | TEST-02-03, TEST-06-03 |
| BR-07 | F-02, F-05 | 1 | AC-02-02, AC-05-07 | TEST-02-02, TEST-05-08 |
| BR-08 | F-03 | 1 | AC-03-02 | TEST-03-02, TEST-03-03, TEST-U-03 |
| BR-09 | F-07 | 2 | (Sprint 2 contract) | — |
| BR-10 | F-11 | 3 | (Sprint 3 contract) | — |
| BR-11 | F-08 | 2 | (Sprint 2 contract) | — |
| NFR-01 | F-01 | 1 | AC-01-06 | TEST-01-06 |
| NFR-02 | F-02 | 1 | AC-02-01, AC-02-02, AC-02-03 | TEST-02-01, TEST-02-02, TEST-02-03 |
| NFR-03 | F-01 | 1 | AC-01-04, AC-01-07 | TEST-01-04, TEST-01-07 |
| NFR-04 | R-01 | 1 design / Lab 5 | Lab 5 C-05 | Lab 5 restart + redeploy check |
| NFR-05 | F-12 | 3 | (Sprint 3 contract) | — |
| NFR-06 | R-02 | 1 | AC-05-06 | TEST-E2E-02, manual UI check M-01 |
| NFR-07 | R-01 | 1 / Lab 5 | `.env.example` complete; no secret in Git | Review checklist, Lab 5 C-03 |
| NFR-08 | F-11 | 3 | (Sprint 3 contract) | — |

## Coverage status

- Every FR, BR and NFR is allocated to a feature or system responsibility and a sprint.
- Uncovered requirements: none.
- Approved changes: none yet (version 1.0). Changes will be recorded in the version history of each document.
