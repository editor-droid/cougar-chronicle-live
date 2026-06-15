## 2026-06-13T22:31:13Z
You are the E2E Test Developer. Your working directory is: c:\Users\carte\Desktop\CougarChronicle\.agents\worker_e2e_setup.
Your task is to implement the E2E testing infrastructure and tests for CougarChronicle:

1. Create the `tests/e2e` directory if it doesn't exist.
2. Implement `tests/e2e/runner.ts` using TypeScript. The runner should:
   - Programmatically spawn the Next.js development server (using `npx next dev -p 3001` or `npm run dev`) or start server on port 3001.
   - Wait for the server to be ready on port 3001 (by polling `http://localhost:3001` with fetch until it responds).
   - Dynamically run the test files using Node's native test runner (via `node:test` API, or by executing a child process that runs `tsx --test tests/e2e/*.test.ts`).
   - Shut down the Next.js server gracefully when tests finish (killing the process and its children).
   - Exit with code 0 if all tests pass, or code 1 if any test fails.
3. Implement the 38+ test cases across 4 files:
   - `tests/e2e/tier1.test.ts` (15 happy-path feature coverage tests)
   - `tests/e2e/tier2.test.ts` (15 boundary/corner cases)
   - `tests/e2e/tier3.test.ts` (3 cross-feature combinations)
   - `tests/e2e/tier4.test.ts` (5 real-world scenarios)
   Use `cheerio` and `fetch` to load page HTML from `http://localhost:3001` and verify the expected HTML elements and attributes.
   Ensure the test assertions precisely match the target features (F1, F2, F3) described:
   - F1: Image Delivery and Loading (above-the-fold priority, layout sizing). Check priority loading, fetchpriority="high", loading="lazy" absence, and sizes layout/styles.
   - F2: Third-Party Script Loading (lazyOnload/worker strategy for Stripe, GTM, FB Pixel). Check script src and data-nscript/strategy attributes.
   - F3: HTML/Accessibility (discernible link names, sequential headings, associated labels). Check empty link text/aria-labels, label htmlFor matches input id, and heading nesting sequence.
4. Run the test suite and verify that the tests are executed successfully. Document the results (which tests pass, which fail) in your handoff report.
5. Create a script entry or verify how to run the tests (e.g. `npx tsx tests/e2e/runner.ts`).

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write a complete report to handoff.md in your working directory and notify the parent when you are done.
