# Original User Request

## Initial Request — 2026-06-13T04:30:59Z

Optimize the PageSpeed performance of the Cougar Chronicle Next.js web application to achieve a mobile Performance score of 90+ on core routes.

Working directory: C:\Users\carte\Desktop\CougarChronicle
Integrity mode: development

## Requirements

### R1. Optimize Image Delivery and Sizes
Reduce the size of optimized images (e.g. print edition covers) on the home page and print-edition page by tuning Next.js image configurations or sizes properties to match their actual layout dimensions. Ensure critical above-the-fold images (like the LCP hero image) do not use lazy-loading and have appropriate preloading priority.

### R2. Reduce/Defer Unused Javascript and Main-Thread Tasks
Defer or lazy-load heavy third-party scripts (Stripe, Google Tag Manager, Facebook Pixel) dynamically using Next.js Script component options so they do not block the initial LCP/FCP on user-facing pages.

### R3. Fix Accessibility and HTML Semantics
Ensure all links have a discernible name (adding aria-labels/title tags to SVG/image links) and that heading elements follow a sequentially-descending hierarchy.

## Acceptance Criteria

### Performance and Core Web Vitals
- [ ] The build compiles successfully (`npm run build`).
- [ ] Third-party scripts (Stripe `/dahlia/stripe.js`, Google Tag Manager `/gtag/js`, Facebook Pixel `/en_US/fbevents.js`) on the homepage use `strategy="lazyOnload"` or `strategy="worker"` or are only loaded after page hydration.
- [ ] The LCP hero image on the home page has `priority` and is not lazy loaded.

### Accessibility and SEO
- [ ] All social media SVGs and other link elements have descriptive `aria-label` or inner text to guarantee a discernible name.
- [ ] Heading elements on the home page and article page follow a strict sequentially-descending hierarchy (no `h3` directly under `h1` without `h2`).
