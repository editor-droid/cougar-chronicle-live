# Context and Current Findings

## Workspace Info
- Workspace directory: `c:\Users\carte\Desktop\CougarChronicle`
- Core project framework: Next.js (TypeScript)

## Key Files Identified
- `src/app/page.tsx`: Home page, contains hero image and third-party scripts.
- `src/app/print-edition/page.tsx`: Print edition page, containing covers.
- `src/app/layout.tsx`: Root layout, likely contains some scripts or styles.
- `src/components/Tracking.tsx`: Might contain tracking scripts like GTM or Facebook Pixel.

## Requirements Checklist
- R1: Image optimizations (LCP hero image priority, correct dimensions).
- R2: Third-party scripts (Stripe, GTM, FB Pixel dynamic/deferred loading with strategy="lazyOnload" or worker).
- R3: Accessibility & HTML hierarchy (headings and SVG discernible names).
