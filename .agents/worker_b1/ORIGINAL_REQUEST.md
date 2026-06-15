## 2026-06-13T22:32:32Z
We are optimizing the Cougar Chronicle Next.js application for Performance, SEO, and Accessibility.
Your role: teamwork_preview_worker
Your task: Implement Milestone B1: Image Delivery and Sizes optimization.

Please perform the following changes:
1. `next.config.ts`: Enable AVIF image compression. Add `formats: ['image/avif', 'image/webp']` to the `images` configuration object.
2. Homepage (`src/app/page.tsx`): Update the active print edition cover `<Image>` `sizes` attribute to `"250px"`.
3. Print Edition Page (`src/app/print-edition/page.tsx`): Update the cover `<Image>` to have the `priority` attribute, and change its `sizes` attribute to `"(max-width: 480px) 100vw, 400px"`.
4. Author Page (`src/app/author/[id]/page.tsx`): Update the profile avatar `<Image>` to have the `priority` attribute.
5. Category Page (`src/app/category/[slug]/page.tsx`): Adjust the article list items' map function to include `index` parameter. Set `priority={index < 3}` on the article `<Image>` components, and change their `sizes` to `"(max-width: 768px) 100vw, 450px"`.
6. Search Page (`src/app/search/page.tsx`): Adjust the article list items' map function to include `index` parameter. Set `priority={index < 3}` on the article `<Image>` components, and change their `sizes` to `"(max-width: 768px) 100vw, 450px"`.
7. Chatbot (`src/components/Chatbot.tsx`): Set the `priority` attribute on the floating launcher `<Image>` (width={64} height={64}).
8. Dashboard Print Editions page (`src/app/dashboard/print-editions/page.tsx`): Convert the standard `<img>` tag for the cover image thumbnail (around line 35) to a Next.js `<Image>` component with appropriate dimensions (`width={100} height={140}`) and style/attributes. Make sure to import `Image` from `next/image` if not already imported.

Verification:
After implementing, run `npm run build` and `npm run lint` to verify that everything compiles successfully and passes linting checks. Report your build/lint outputs.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your working directory is: c:\Users\carte\Desktop\CougarChronicle\.agents\worker_b1
