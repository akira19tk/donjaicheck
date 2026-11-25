# Remaining work to Final Delivery (13 Dec 2026)

Version 1.0 (Deliverable 2, 25 Nov 2026). Exams run 1–11 Dec, so the work is front-loaded into 30 Nov – 5 Dec and the last week is reserved for verification.

| Item | Status now | Next action | Owner | Reviewer | Target date |
|---|---|---|---|---|---|
| F-11 Anonymous mode | Planned (contract, AC, STS v1.0) | Migration + Participation table (RED: TEST-11-01, TEST-U-11) | Thanaporn | Thanyagorn | 3 Dec |
| F-11 owner endpoints | Planned | Hide summary/CSV below 3 responses; identity-free CSV (TEST-11-02, 11-03) | Thanaporn | Thanyagorn | 5 Dec |
| F-12 Date filter + bars | Planned | `parseDateRange` + SQL aggregation (TEST-U-12, TEST-12-01/02, E2E-04) | Thanyagorn | Thanaporn | 6 Dec |
| F-12 NFR-05 performance | Planned | `deploy/perf_summary.py`, 500 seeded responses, p95 ≤ 1 s on Cloud Run (PERF-01) | Thanyagorn | Thanaporn | 9 Dec |
| DEBT-01 | Open | Covered by F-11 schema change and TEST-11-02 | Thanaporn | Thanyagorn | 5 Dec |
| DEF-04, DEBT-02 | Open | Single error location for visit-code messages; `Cache-Control: no-cache` on `index.html` | Thanyagorn | Thanaporn | 6 Dec |
| Sprint 3 release | — | Release PR `staging` → `main`, tag `sprint-3`, auto-deploy, smoke + E2E | both | both | 10 Dec |
| Final regression + docs | — | Full server/client/E2E on the final tag, traceability v3.0, register update | both | both | 12 Dec |
| Final delivery | — | Tag `v1.0`, submission | both | both | 13 Dec |

Risk: exam weeks reduce available time; if F-12 slips, the date filter ships first and PERF-01 is reported honestly as not met.
