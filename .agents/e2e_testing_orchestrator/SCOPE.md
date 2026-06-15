# Scope: E2E Testing Track (Track A)

## Architecture
- Test Suite: Lightweight Node.js scripts using a custom runner (with `cheerio` and `fetch`) that programmatically spawns and stops the Next.js development or production server.
- Execution Flow: 
  1. Boot: Spawns the Next.js server (e.g. on port 3001) and waits for it to be responsive.
  2. Test execution: Sequentially runs test cases (feature verification, corner cases, cross-feature combinations, real-world scenarios) by making HTTP requests to `http://localhost:3001/...` and parsing responses via cheerio.
  3. Teardown: Safely kills the server process.
- Target Directory: All E2E tests and helper scripts will reside in a dedicated workspace directory (e.g., `tests/e2e`).
- Test Artifacts: `TEST_INFRA.md` and `TEST_READY.md` published to the project root.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | Test Infra Setup | Lightweight Next.js server lifecycle controller, cheerio integration, custom test runner | None | IN_PROGRESS |
| 2 | Tier 1: Feature Coverage | Happy path tests for F1, F2, F3 (>=5 tests per feature = 15 total) | Milestone 1 | IN_PROGRESS |
| 3 | Tier 2: Boundary & Edge | Extreme/incorrect inputs, edge cases for F1, F2, F3 (>=5 tests per feature = 15 total) | Milestone 2 | IN_PROGRESS |
| 4 | Tier 3: Cross-Feature | Pairwise interaction tests covering F1, F2, F3 simultaneously (>=3 total) | Milestone 3 | IN_PROGRESS |
| 5 | Tier 4: Real-World Scenarios | Holistic user stories/workflows (>=5 total) | Milestone 4 | IN_PROGRESS |
| 6 | E2E Suite Publication | Verification of 38+ tests and publication of TEST_INFRA.md and TEST_READY.md | Milestone 5 | PLANNED |

## Interface Contracts
### E2E Test Suite ↔ Next.js Server
- Start: `npm run dev` or `npm run build && npm run start` on custom port (e.g., 3001).
- Readiness check: HTTP GET to `http://localhost:3001/` returning 200 OK within 15 seconds.
- Shutdown: Process kill (SIGTERM / SIGKILL) of spawned Next.js pid and children.
