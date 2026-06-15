# Codebase Exploration Report: Cougar Chronicle Next.js Application

## Summary of Findings
The Cougar Chronicle Next.js application has been analyzed. Key findings indicate that third-party scripts (Google Analytics/Tag Manager and Meta Pixel) are loaded via a client-side tracking component in the root layout, while Stripe is configured but currently unused on the client side. There are several accessibility issues including missing discernible names on social icon links, search forms, and close buttons, along with skipped heading levels (specifically H2) on the home page and article pages.

---

## 1. Observation
Below are the direct observations, exact file paths, line numbers, and relevant code snippets identified during the codebase exploration.

### A. Third-Party Scripts
1. **Google Analytics / Google Tag Manager**:
   - **Path**: `src/components/Tracking.tsx` (Lines 87–104)
   - **Snippet**:
     ```tsx
     <Script
       strategy="afterInteractive"
       src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
     />
     <Script
       id="gtag-init"
       strategy="afterInteractive"
       dangerouslySetInnerHTML={{
         __html: `
           window.dataLayer = window.dataLayer || [];
           function gtag(){dataLayer.push(arguments);}
           gtag('js', new Date());
           gtag('config', '${GA_MEASUREMENT_ID}', {
             page_path: window.location.pathname,
           });
         `,
       }}
     />
     ```
2. **Meta (Facebook) Pixel**:
   - **Path**: `src/components/Tracking.tsx` (Lines 107–133)
   - **Snippet**:
     ```tsx
     <Script
       id="fb-pixel"
       strategy="afterInteractive"
       dangerouslySetInnerHTML={{
         __html: `
           !function(f,b,e,v,n,t,s)
           {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
           ...
           'https://connect.facebook.net/en_US/fbevents.js');
           fbq('init', '${FB_PIXEL_ID}');
           fbq('track', 'PageView');
         `,
       }}
     />
     <noscript>
       <img
         height="1"
         width="1"
         style={{ display: 'none' }}
         src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
         alt=""
       />
     </noscript>
     ```
3. **Stripe**:
   - **Path**: `src/app/print-edition/PrintCheckoutButtons.tsx` (Lines 4–6)
   - **Snippet**:
     ```tsx
     import { loadStripe } from '@stripe/stripe-js';
     const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_fallback');
     ```
   - **Note**: The client-side `stripePromise` is declared but never referenced or utilized elsewhere in the component. Instead, checkouts post to the `/api/stripe/checkout` backend endpoint and redirect to a Stripe-hosted URL:
     ```tsx
     const res = await fetch('/api/stripe/checkout', { ... });
     const session = await res.json();
     if (session.url) { window.location.href = session.url; }
     ```

### B. Next.js Image Components
1. **Home Page (`src/app/page.tsx`)**:
   - **Image 1 (Main Story Hero - Above-the-fold)** (Lines 75–82):
     ```tsx
     <Image 
       src={mainStory.imageUrl} 
       alt={mainStory.title} 
       fill 
       priority 
       sizes="(max-width: 768px) 100vw, 800px"
       style={{ objectFit: 'cover' }} 
     />
     ```
     *Properties*: `src`, `alt`, `fill`, `priority` (set), `sizes` (set), `style`. `loading` is not set.
   - **Image 2 (Print Edition Cover - Below-the-fold)** (Lines 261–267):
     ```tsx
     <Image 
       src={activePrintEdition.coverImageUrl} 
       alt={`Cover of ${activePrintEdition.title}`} 
       fill
       sizes="(max-width: 768px) 100vw, 250px"
       style={{ objectFit: 'cover' }}
     />
     ```
     *Properties*: `src`, `alt`, `fill`, `sizes` (set), `style`. `priority` and `loading` are not set.
2. **Print Edition Page (`src/app/print-edition/page.tsx`)**:
   - **Image 3 (Print Edition Cover - Above-the-fold)** (Lines 54–60):
     ```tsx
     <Image 
       src={edition.coverImageUrl} 
       alt={`Cover of ${edition.title}`} 
       fill
       sizes="(max-width: 768px) 100vw, 400px"
       style={{ objectFit: 'cover' }}
     />
     ```
     *Properties*: `src`, `alt`, `fill`, `sizes` (set), `style`. `priority` and `loading` are not set.

### C. Above-the-Fold Images
- The home page has exactly one above-the-fold image: the main hero story image (`mainStory.imageUrl`) rendered on line 75 of `src/app/page.tsx`.
- This image is optimized correctly using the `priority` property.

### D. Missing Discernible Names (Accessibility Gaps)
1. **Social Icon Links** in `src/app/layout.tsx`:
   - **Top Header Links** (Lines 86–97): Four social links (Twitter/X, Instagram, YouTube, Facebook) wrapping only SVGs, missing text or `aria-label`.
   - **Footer Links** (Lines 168–172): Four social links (Twitter/X, Instagram, YouTube, Facebook) wrapping only SVGs, missing text or `aria-label`.
2. **Search Submit Button** in `src/components/SearchBar.tsx`:
   - **Submit Button** (Line 28): `<button type="submit" ...><Search size={16} /></button>` wraps a Lucide icon with no text content, `aria-label`, or title.
3. **Close Buttons**:
   - **Subscribe Modal Close** (`src/components/SubscribeModal.tsx`, Line 46): `<button onClick={() => setIsOpen(false)} ...> &times; </button>` has no `aria-label`.
   - **Chatbot Window Close** (`src/components/Chatbot.tsx`, Line 159): `<button onClick={() => setIsOpen(false)} ...>&times;</button>` has no `aria-label`.
   - **Chatbot Launcher** (`src/components/Chatbot.tsx`, Line 133): Launcher button contains only an image. While the image has `alt="Chat"`, the parent button itself has no `aria-label`.
   - **Lightbox Close** (located in `src/app/article/[slug]/ClientLightbox.tsx`, `src/app/premium-article/[slug]/ClientLightbox.tsx`, and `src/app/print-edition/[slug]/ClientLightbox.tsx` on Line 61): `<button ...> &times; </button>` has no `aria-label`.

### E. Heading Hierarchy
1. **Home Page (`src/app/page.tsx`)**:
   - `H1`: `{mainStory.title}` (Line 100)
   - `H2`: `"News"` (Line 167), `"Faith"` (Line 190), `"Opinion"` (Line 213), `"Print Edition"` (Line 253), `"Support Independent BYU Journalism"` (Line 362)
   - `H3`: `"LATEST DEVELOPMENTS"` (Line 123), `{post.title}` (Lines 174, 197, 236), `{activePrintEdition.title}` (Line 276), `"MOST POPULAR"` (Line 312), `"Stay Connected"` (Line 335)
   - `H4`: `{story.title}` (Line 142), `"Inside This Issue"` (Line 286), `"Order Print Editions"` (Line 347)
2. **Article Page (`src/app/article/[slug]/page.tsx`)**:
   - `H1`: `{post.title}` (Line 194)
   - `H3`: `"The Cougar Chronicle"` (Line 316), `"Most Read"` (Line 327), `"The Cougar Chronicle"` (Line 348)
   - `H4`: `{prevPost.title}` (Line 290), `{nextPost.title}` (Line 299)

---

## 2. Logic Chain
- **Scripts**: Ripgrep search confirmed that Stripe's `loadStripe` is imported client-side in `PrintCheckoutButtons.tsx` but is not referenced in the checkout logic, whereas GA and Meta Pixel are loaded in a Client Component (`Tracking.tsx`) placed inside the main layout.
- **Images**: Verification of `src/app/page.tsx` and `src/app/print-edition/page.tsx` confirms that the home page hero image has `priority`, but the print-edition cover images (on both the home page and print-edition page) lack the `priority` property despite being prominent above-the-fold content on the print-edition landing page.
- **Accessibility**: Inspection of social icons, search buttons, close buttons, and launcher buttons reveals they omit descriptive text or screen-reader attributes (like `aria-label`), resulting in screen reader tools seeing empty controls or raw character entities like `&times;`.
- **Headings**: Mapping out the HTML structure of the home page shows that the Hero sidebar transitions from `H1` (main story) directly to `H3` (`LATEST DEVELOPMENTS`) and then `H4` (secondary stories), skipping the `H2` level. Similarly, the article page has `H1` and `H3`/`H4` elements, but skips the `H2` level entirely.

---

## 3. Caveats
- No dynamic content was inspected (i.e. heading elements injected at runtime via CMS or database-stored article markup rendering headings like `h2` or `h3` in the body).
- The investigation was conducted strictly on local codebase files.

---

## 4. Conclusion
1. **Third-party Scripts**: Google Analytics/Tag Manager and Meta Pixel are loaded dynamically client-side. Stripe client SDK (`loadStripe`) is imported but not used, as checkouts rely on standard backend redirect flow.
2. **Next.js Image Components**: Home page hero image utilizes `priority` and `sizes` correctly. Cover images on the home page and print-edition landing page lack `priority` attributes.
3. **Above-the-Fold Images**: Only one above-the-fold image exists on the homepage (the hero main article), which is optimized correctly.
4. **Missing Discernible Names**: Social links, search button, close buttons, and launcher buttons need `aria-label` or hidden text added to resolve accessibility violations.
5. **Heading Elements Hierarchy**: Skipped heading levels (specifically H2) are present on both the home page (Hero sidebar, trending widgets) and the article page (entire page structure).

---

## 5. Verification Method
- **File Verification**: Inspect files `src/components/Tracking.tsx`, `src/app/page.tsx`, `src/app/print-edition/page.tsx`, `src/app/article/[slug]/page.tsx`, and `src/components/SearchBar.tsx` using `view_file` to confirm the line numbers and code snippets.
- **Lighthouse/Accessibility Tests**: Can be verified by running automated accessibility tests (like axe or Lighthouse) on the compiled application to flag missing labels and heading sequence errors.
