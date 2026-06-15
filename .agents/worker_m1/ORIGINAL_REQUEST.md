## 2026-06-15T13:05:01Z
You are a Worker subagent assigned to Milestone 1: E2E Test Suite Implementation.
Your working directory is: c:\Users\carte\Desktop\CougarChronicle\.agents\worker_m1.
Your workspace directory is: c:\Users\carte\Desktop\CougarChronicle.

Your task:
1. Design and write a comprehensive E2E test suite in the workspace.
   - Since there is no test runner in the repository, create a test runner script (e.g., `test-e2e.ts` or a tests/ folder) using `cheerio` and standard HTTP fetch to retrieve page content.
   - The test runner must start the Next.js dev or build server, run assertions against the HTML rendered at localhost:3000, and gracefully terminate the server upon completion.
   - Alternatively, it can mock or run static rendering checks, but starting/stopping the actual local server (e.g. running `npm run build && npm run start` or `npm run dev`) and checking HTML via fetch/cheerio is the preferred opaque-box method.
2. Implement at least 38 E2E test cases across the 4 tiers:
   - Tier 1: Feature Coverage (5+ cases per feature, happy path).
     - Feature 1: Image Delivery and Loading (verify priority on LCP hero on home, verify priority on covers on print-edition page, verify layout sizing / sizes properties).
     - Feature 2: Third-Party Script Loading (verify Stripe, GTM, FB Pixel load with strategy="lazyOnload" / worker or after hydration).
     - Feature 3: HTML / Accessibility (verify discernible names/aria-labels on all social icon links, search submit button, close buttons for modal, chatbot, lightboxes, and chatbot launcher).
   - Tier 2: Boundary & Corner cases (5+ cases per feature).
     - E.g. Check routes with and without images/scripts.
     - Strict sequentially-descending heading hierarchies (H1 -> H2 -> H3 -> H4 etc., no H3 directly under H1).
   - Tier 3: Cross-Feature Combinations (pairwise coverage of features).
   - Tier 4: Real-World Application Scenarios (realistic user flow visiting home page, print-edition page, and article page checking all rules).
3. Create and publish:
   - `TEST_INFRA.md` at project root (describing features, test cases, and methodology).
   - `TEST_READY.md` at project root (with expected command to run the tests, count of cases, and tier checklist).
4. Run the test suite and verify that the tests run correctly (they should fail on the current codebase, showing correct pass/fail behavior).
5. Document everything in `c:\Users\carte\Desktop\CougarChronicle\.agents\worker_m1\handoff.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
