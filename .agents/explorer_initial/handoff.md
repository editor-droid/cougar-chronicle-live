# Handoff Report - explorer_initial

## 1. Observation
Below are the exact code and location details observed in the codebase:

- **Third-party scripts**:
  - GTM/GA is loaded in `src/components/Tracking.tsx` (Lines 87–104) and included in the root layout `src/app/layout.tsx` (Line 8). Strategy is `afterInteractive`.
  - Facebook Pixel is loaded in `src/components/Tracking.tsx` (Lines 107–133) and included in the root layout. Contains a `<noscript>` fallback image.
  - Stripe is imported client-side in `src/app/print-edition/PrintCheckoutButtons.tsx` (Line 4), but the resulting `stripePromise` is unused. Real checkout is triggered by submitting a POST request to `/api/stripe/checkout` and redirecting to the checkout session URL.

- **Next.js Image components**:
  - `src/app/page.tsx` contains two `Image` components:
    - Main story hero image (Line 75): `fill`, `priority` (set), and `sizes` (set). No `loading`.
    - Active print edition cover image (Line 261): `fill`, `sizes` (set), no `priority`, no `loading`.
  - `src/app/print-edition/page.tsx` contains one `Image` component:
    - Print edition cover image (Line 54): `fill`, `sizes` (set), no `priority`, no `loading`.

- **Above-the-fold images**:
  - Home page above-the-fold image is the main hero story featured image (`mainStory.imageUrl` in `src/app/page.tsx`, Line 75).

- **Links and Buttons missing discernible names**:
  - Twitter/X, Instagram, YouTube, Facebook links in header and footer of `src/app/layout.tsx` (Lines 86-97 and Lines 168-172) contain only SVGs and lack `aria-label` or text content.
  - Search Submit Button in `src/components/SearchBar.tsx` (Line 28) contains only a Lucide `<Search>` SVG.
  - Close buttons: Subscribe modal close (`src/components/SubscribeModal.tsx` Line 46), Chatbot window close (`src/components/Chatbot.tsx` Line 159), Lightbox close (`ClientLightbox.tsx` Line 61) contain only `&times;` and lack `aria-label`.
  - Chatbot launcher button (`src/components/Chatbot.tsx` Line 133) lacks an `aria-label`.

- **Heading Hierarchy**:
  - Home Page (`src/app/page.tsx`): Has `H1`, `H2`, `H3`, `H4`. Skips `H2` in the Hero sidebar (goes `H1` -> `H3` -> `H4`) and contains orphan `H3` widgets.
  - Article Page (`src/app/article/[slug]/page.tsx`): Has `H1`, `H3`, `H4` but skips `H2` entirely.

---

## 2. Logic Chain
1. **Third-party scripts**: Identifying where tracking scripts are imported and loaded (e.g. `Tracking.tsx` client-side loading, unused `stripePromise` in `PrintCheckoutButtons.tsx` client-side) confirms they exist only in layout-level tracking and that Stripe operates via server-side redirect sessions.
2. **Images**: Verifying image parameters (`priority`, `sizes`, `loading`) directly in page code shows that print edition cover images lack `priority` optimizations despite being above-the-fold on the print edition page, while the main homepage hero image is correctly optimized.
3. **Accessibility**: Inspecting raw markup reveals buttons and anchor tags with no text node and no `aria-label` attribute, which mathematically guarantees screen readers will not read discernible names for them.
4. **Headings**: Enumerating all header tags in sequential order of layout components demonstrates that nesting rules (no skipping heading levels) are broken on both the homepage and article page.

---

## 3. Caveats
- Database-stored rich-text content rendered via `dangerouslySetInnerHTML` was not dynamically analyzed (only static page code).
- Checked only standard routes (`/`, `/print-edition`, `/article/[slug]`).

---

## 4. Conclusion
The analysis is complete. The structured findings in `analysis.md` provide a complete guide for:
1. Optimizing images (adding `priority` to above-the-fold print edition covers).
2. Fixing accessibility issues (adding `aria-label` to social links, search buttons, close buttons, launcher button).
3. Correcting heading tags to ensure sequential levels (converting sidebars/widgets to correct hierarchy levels).

---

## 5. Verification Method
- Review code paths statically using the Next.js App Router folders.
- Running `npm run build` will verify that syntax is correct and the code compile successfully.
- Using a screen reader or Lighthouse audit on the homepage and article routes will verify if the accessibility labels are missing and heading hierarchy is broken.
