# Donjaicheck — Change and defect register

Version 1.0 (Deliverable 2, 25 Nov 2026). One row per finding or approved change since the Sprint 1 baseline (tag `sprint-1` = `022a45e`).
**Status** values: *Closed* = fixed/applied and re-tested; *Accepted* = recorded decision, no code change; *Open* = still to do.

| ID | Source | Type | Description | Affected requirement | Decision | Status | Release fixed / applied | Re-test |
|---|---|---|---|---|---|---|---|---|
| CHG-01 | Lab 5 (Ep 2) | Configuration change | Application made cloud-ready: config only from environment variables, `/api/ready`, Docker image, CI `test-and-docker`. | NFR-04, NFR-07 | Accept | Closed | PR #17, #19, #21 → `main` 6d85342 | CI green; Lab 5 smoke test 4/4 |
| CHG-02 | Lab 5 (Ep 7) | Delivery change | Automatic deploy of `main` to Cloud Run + Cloud SQL (`deploy.yml`), release recorded with commit SHA. | NFR-04 | Accept | Closed | PR #27 → 43aa463 | Lab 5 redeploy + persistence check |
| DEF-01 | Lab 5 review | Documentation defect | Student IDs swapped in the SRS header. | — | Fix | Closed | ae43c17 (#26) | Review of SRS v1.1 |
| DEF-02 | Lab 6 UAT by UP2U (#36) | Defect (minor) | Opening the edit page of a survey that can no longer be edited showed the form instead of only the message. | FR-05, BR-05 | Accepted defect; fix with RED/GREEN | Closed | PR #37, release PR #38 → `uat-s1-fix1` (495c8af) | UP2U re-test PASS, Sprint 1 **Accepted** |
| CHG-03 | Sprint 2 contracts | Requirement change | FR-15 and BR-11 made measurable; BR-12, BR-13, BR-14 added; D-08 revises D-03 (CSV shows identity for identified surveys); D-09 added. | FR-15, BR-11…14 | Approved by both students (PR "Sprint 2 + Sprint 3 contracts") | Closed | SRS v1.2 | Contract review |
| CHG-04 | F-08 implementation | Contract revision | Closing time set on the detail page only (not in the editor); API unchanged. | FR-14 | Approved in F-08 PR review | Closed | F-08 contract v1.1 | TEST-08-01…06 |
| CR-01 | Lab 7 maintenance | Requirement change | Respondents may correct their response within 30 min, max 3 times, while the survey is open (revises D-04, adds BR-15). | FR-11, BR-15 | Approved by both students in the CR-01 Issue | Closed | tag `sprint-2` | TEST-05-09…12, TEST-U-15, E2E-03 |
| DEF-03 | F-08 GREEN run on a Bangkok-time database (PR #42) | Defect found before merge (major) | `closeExpiredSurveys()` compared UTC timestamps with `NOW()` in the session time zone, closing surveys 7 h early. | FR-14, BR-11 | Fix before merge: compare with `NOW() AT TIME ZONE 'UTC'` | Closed | PR #42 (e9c9d40) | Full suite under TZ Asia/Bangkok: pass |
| DEF-04 | F-07 manual check (25 Nov) | Defect (cosmetic) | A used/invalid visit code message is shown twice (under the field and in the form banner). | NFR-06 | Known limitation; fix with Sprint 3 UI work | Open | — | — |
| DEBT-02 | Post-deploy check of `sprint-2` (25 Nov 23:08) | Technical debt | A browser tab opened before a deploy keeps the old client bundle until a hard refresh (`index.html` cache). | NFR-04 | Send `Cache-Control: no-cache` for `index.html`; Sprint 3 | Open | — | manual re-check after deploy |
| DEBT-01 | D2 review | Technical debt | F-11 anonymous mode will make `Response.respondentId` nullable; CSV/summary code assumes identity today. | FR-17, NFR-08 | Handle in F-11 contract (already listed in its Data section) | Open | — | planned TEST-11-02 |

## Status at the Deliverable 2 release candidate
- Open defects: critical 0, major 0, minor 0, cosmetic 1 (DEF-04, known limitation).
- Open changes: none. Open technical debt: DEBT-01 (scheduled with F-11), DEBT-02 (Sprint 3).
