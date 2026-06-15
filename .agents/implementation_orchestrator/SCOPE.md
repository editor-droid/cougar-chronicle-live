# Scope: Track B Implementation

## Architecture
- Next.js application using Tailwind CSS.
- Main pages: Homepage (`src/app/page.tsx`), Print Edition Page (`src/app/print-edition/page.tsx`), and Article Page (`src/app/article/[slug]/page.tsx`).
- Third-party tracking scripts loaded via `src/components/Tracking.tsx`.
- Stripe load is imported in `src/app/print-edition/PrintCheckoutButtons.tsx`.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| B1 | Image Delivery and Sizes | Optimize images on homepage and print-edition page. Set LCP hero / above-the-fold images to priority. Add sizes where appropriate. | None | IN_PROGRESS (Worker: 7d9ad5ab-43ad-43e5-97ac-e015e8fcf139) |
| B2 | Reduce/Defer Unused JS | Defer Stripe script, GTM, FB Pixel scripts using Next.js Script strategy="lazyOnload" or dynamic/deferred loading. | None | PLANNED |
| B3 | Fix Accessibility & HTML | Add aria-labels/discernible names to social links (layout header/footer), close/launcher buttons, and search form. Fix heading hierarchies on home page and article pages. | None | PLANNED |
| B4 | Final E2E Verification | Poll for TEST_READY.md. Decompose E2E validation by test tier as sub-milestones (Tiers 1-4). Run full E2E test suite and resolve failures. | B1, B2, B3 | PLANNED |
| B5 | Adversarial Hardening | Phase 2 coverage hardening (Tier 5) with Challengers analyzing code/tests and adding adversarial test cases. | B4 | PLANNED |

## Interface Contracts
- All performance, SEO, accessibility improvements are made in-place. No changes to application routing or API contracts.
