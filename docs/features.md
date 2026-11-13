# Donjaicheck — Feature Inventory

Version 1.0 (Sprint 1 baseline). Requirement IDs refer to [srs.md](srs.md).

| ID | Feature / responsibility | Description | Requirements | Depends on | Sprint |
|---|---|---|---|---|---|
| F-01 | Authentication and session | Email/password login, logout, current user; bcrypt hashes; DB-stored hashed session token in httpOnly cookie; 8 h expiry. | FR-01, FR-02, FR-03, NFR-01, NFR-03 | — | 1 |
| F-02 | Role and ownership enforcement (cross-cutting) | `requireAuth`, `requireRole`, ownership-scoped queries for surveys and responses; uniform 401/403/404 error shape. | BR-06, BR-07, NFR-02 | F-01 | 1 |
| F-03 | Survey authoring | Owner creates and edits draft surveys with RATING, SINGLE_CHOICE and TEXT questions; lists own surveys. | FR-04, FR-05, FR-08, BR-05, BR-08, NFR-06 | F-01, F-02 | 1 |
| F-04 | Survey lifecycle | Publish and close own surveys with transition validation. | FR-06, FR-07, BR-04 | F-03 | 1 |
| F-05 | Survey response | Respondent lists published surveys, submits a validated response once, sees confirmation, views own response. | FR-09, FR-10, FR-11, BR-01, BR-02, BR-03, BR-07 | F-04 | 1 |
| F-06 | Aggregate summary | Owner sees response count, rating averages/distributions, option counts and text answers for own survey. | FR-12, BR-06 | F-05 | 1 |
| F-07 | Visit-code eligibility | Owner generates single-use visit codes; respondents must enter one to answer a restricted survey. | FR-13, BR-09 | F-05 | 2 |
| F-08 | Scheduled closing | Optional `closesAt`; responses rejected after it; status shown as CLOSED. | FR-14, BR-11 | F-04 | 2 |
| F-09 | Multiple-choice questions | New question type with min/max selections and aggregate counts. | FR-15, BR-03 (extended) | F-03, F-06 | 2 |
| F-10 | CSV export | Owner downloads responses of own survey as CSV (identified surveys only). | FR-16, BR-06 | F-06 | 2 |
| F-11 | Anonymous mode | Separate participation record and unlinked answers; threshold of 3 responses before results are shown. | FR-17, BR-10, NFR-08 | F-05, F-06 | 3 |
| F-12 | Advanced analysis | Date-range filter, per-question charts, performance target for summary. | FR-18, NFR-05 | F-06 | 3 |
| F-13 | Survey duplication | Copy an existing survey into a new draft. | FR-19 | F-03 | 3 |
| R-01 | Delivery and configuration (system responsibility) | Environment-based configuration, Docker image, CI checks, GCP Cloud Run + Cloud SQL deployment, persistence across redeploys. | NFR-04, NFR-07 | — | 1 (design), Lab 5 (deploy) |
| R-02 | UI states and validation (system responsibility) | Shared loading/empty/error components and inline form errors. | NFR-06 | — | 1 |
