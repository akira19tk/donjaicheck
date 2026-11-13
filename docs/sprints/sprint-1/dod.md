# Product Definition of Done

Applies to every feature and to each sprint release. Version 1.0.

A feature is **Done** only when all of the following are true and the evidence exists:

1. **Contract first** — the feature contract (behaviour, API/UI/data, AC) and its STS rows were committed before the implementation commits.
2. **Behaviour implemented** — every AC of the feature is implemented and enforced in the backend; the UI shows loading, empty, error and validation states.
3. **Verification executed** — all planned tests for the feature exist and pass locally (`npm test`, and `npm run e2e` where planned). For business rules, a test was seen failing before the implementation (TDD) and the failing run is recorded in the PR.
4. **No weakened tests** — no required test is skipped, deleted or relaxed to make it pass; any failing or skipped test is disclosed in the PR.
5. **Reviewed** — a PR from the feature branch into `staging` was reviewed and approved by the teammate (not the author), with a review comment naming a specific check, question or finding.
6. **Integrated** — merged into `staging`, full test suite green on `staging`.
7. **Documents current** — README setup, `.env.example`, API/UI/data sections of the contract and the traceability matrix match the code; revisions are listed in the version history.
8. **Secure configuration** — no secret, password or `.env` file is committed; passwords only as bcrypt hashes.
9. **Released** (sprint level) — reviewed release PR `staging` → `main`, tag `sprint-N`, test command, counts and tested commit recorded.
10. **Incomplete work disclosed** — anything not done is listed as known limitation, not hidden.

Completion is supported by execution evidence, not by an AI agent's claim that tests pass.
