# Project: Cougar Chronicle Performance Optimization

## Architecture
- Next.js application using React components and tailwindcss.
- Routes include Home page, Print-edition page, Article pages, etc.
- Third-party scripts (Stripe, GTM, FB Pixel) are currently loaded eagerly.
- Image assets (print covers, articles) need size and loading strategy optimizations.
- Accessibility improvements needed for heading hierarchies and SVG/link labels.

## Milestones (Sequential Direct Orchestration)
| Milestone | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1 | E2E Test Suite Implementation | Implement cheerio/fetch-based E2E test suite running 38+ cases verifying image loading, scripts, and HTML structure/accessibility. | None | PLANNED |
| M2 | Image Delivery Optimizations | Add priority to above-the-fold images and correct size properties to home page and print edition page cover images. | M1 | PLANNED |
| M3 | Defer Third-Party Scripts | Lazy-load or defer Stripe, GTM, and Facebook Pixel scripts to not block initial load. | M2 | PLANNED |
| M4 | Fix Accessibility & Headings | Add discernible names to SVG/social links/buttons, and fix heading hierarchies sequentially. | M3 | PLANNED |
| M5 | Final E2E and Adversarial Hardening | Verify all tests pass, run Challenger to harden, and run Forensic Auditor. | M4 | PLANNED |

## Interface Contracts
- No new external APIs are introduced. Existing Next.js routes and image/script loaders are tuned in-place.
