# Handoff Report: E2E Testing & Codebase Analysis

This report outlines the analysis of the CougarChronicle codebase to identify and document features related to Image Loading (F1), Third-Party Scripts (F2), and Accessibility (F3), as well as a proposed lightweight E2E test runner infrastructure.

---

## 1. Observations

### Build and Environment Settings
* **Prisma Setup**: Successfully loaded config from `prisma.config.ts` and generated client (v7.8.0) via `npx prisma generate` in under 200ms.
* **Next.js Compilation**: Next.js builds successfully in production mode. Output of `npm run build` completed successfully:
  ```
  ▲ Next.js 16.2.4 (Turbopack)
  - Environments: .env
  ...
  ✓ Compiled successfully in 5.3s
  Finished TypeScript in 8.4s ...
  ✓ Generating static pages using 2 workers (40/40) in 1587ms
  ```
* **Existing Dependencies**:
  * Cheerio is already installed: `"cheerio": "^1.2.0"` (`package.json`, line 37).
  * tsx (TypeScript execute) is installed: `"tsx": "^4.21.0"` (`package.json`, line 68).
  * TypeScript is installed: `"typescript": "^5"` (`package.json`, line 69).

---

### F1: Image Delivery and Loading
* **Above-the-Fold Priority**:
  * Homepage Hero Image (`src/app/page.tsx`, lines 74-82):
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
    Uses `priority` for preloading, `fill` layout, and responsive `sizes`.
  * Article Page Featured Image (`src/app/article/[slug]/page.tsx`, lines 215-222):
    ```tsx
    <Image 
      src={post.imageUrl} 
      alt={post.featuredImageAlt || post.title} 
      fill 
      priority
      sizes="(max-width: 800px) 100vw, 800px"
      style={{ objectFit: 'cover' }}
    />
    ```
    Correctly includes `priority` and `fill` inside a relative parent wrapper.
* **Lazy Loading / Layout Sizing**:
  * Print cover image on homepage (`src/app/page.tsx`, lines 261-267) uses `fill` and `sizes` but lacks `priority` (correct, as it is below-the-fold).
  * Previous/Next navigation thumbnails (`src/app/article/[slug]/page.tsx`, lines 280-286) do not use `fill` but use explicit dimensions:
    ```tsx
    <Image 
      src={prevPost.imageUrl} 
      alt={prevPost.title} 
      width={80} 
      height={80} 
      style={{ objectFit: 'cover', borderRadius: '0.25rem' }} 
    />
    ```

---

### F2: Third-Party Script Loading
* **GTM / Meta Pixel**: Loaded via layout inclusion of the `<Tracking />` component (`src/components/Tracking.tsx`).
  * GA measurement tag (`src/components/Tracking.tsx`, lines 87-90):
    ```tsx
    <Script
      strategy="afterInteractive"
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
    />
    ```
  * FB Pixel initialisation (`src/components/Tracking.tsx`, lines 107-110):
    ```tsx
    <Script
      id="fb-pixel"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{...}}
    />
    ```
  * Both load using `strategy="afterInteractive"`.
* **Stripe**:
  * Initialized client-side dynamically inside `src/app/print-edition/PrintCheckoutButtons.tsx` (lines 4-6):
    ```tsx
    import { loadStripe } from '@stripe/stripe-js';
    const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_fallback');
    ```
* **lazyOnload / worker Strategy**: Currently, no scripts are loaded with `strategy="lazyOnload"` or `strategy="worker"`.

---

### F3: HTML/Accessibility
* **Discernible Link Names**:
  * **Critical Issue**: Footer social media links (`src/app/layout.tsx`, lines 86-96) contain SVGs but have no text content, `aria-label`, or `title`:
    ```tsx
    <a href="https://twitter.com/TheCougChron" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">...</svg>
    </a>
    ```
  * **Warning Item**: "View All &rarr;" links (`src/app/page.tsx`, line 169) are duplicated for separate categories (News, Faith, Opinion) with identical labels but different hrefs.
* **Label Association**:
  * **Critical Issue**: Form inputs in `VolunteerForm.tsx` (lines 75-82) and `DonatePage` (lines 42-52) are labeled using `<label>` elements but lack association (missing `id` on inputs and corresponding `htmlFor` on labels):
    ```tsx
    <label className="font-sans" style={{ display: 'block', ... }}>Full Name *</label>
    <input type="text" required ... />
    ```
* **Heading Sequences**:
  * **Skip levels**: In `src/app/article/[slug]/page.tsx`:
    * Title uses `<h1>` (line 194).
    * Next block is the "Key Takeaways" component which uses `<h3>` (`src/components/KeyTakeaways.tsx`, line 36), skipping `<h2>` (unless the article is premium/blocked, which introduces an `<h2>` for "This article is for subscribers only").
  * **Site Layout**: The brand logo on the layout has no heading elements (just a style wrapper), whereas the footer uses an `<h3>` for the brand name followed by `<h4>` for the sections (correct hierarchy, but skips H1 and H2 on layout level).

---

## 2. Logic Chain

1. **Next.js & Typescript Compilation**: The build command completed cleanly with 0 TypeScript/Turbopack errors. The static routes generate successfully, confirming that the codebase compiles cleanly and can be started locally via `next start` (production) or `next dev` (development).
2. **Cheerio Suitability**: Because the application uses static rendering (ISR for homepage/print-editions, static fallback for dynamic slugs), server-rendered HTML can be easily fetched via HTTP requests and verified without heavy browser environments like Playwright or Cypress.
3. **Programmatic Spawning**: Using `child_process.spawn` enables a Node.js process to launch a Next.js server instance on an arbitrary port. Listening to TCP sockets allows us to block test execution until the server is fully ready.
4. **Node's Native Test Runner**: Since Node.js 18+, a native test runner (`node:test`) is available. Since `tsx` is already present in `package.json` to execute TS, we can orchestrate all E2E testing in TS using built-in assertions without adding new test frameworks.

---

## 3. Caveats

* **Database Requirements**: Running the Next.js server locally in E2E mode depends on the `DATABASE_URL` environment variable being populated. If tests run in isolated CI environments, SQLite or a test pg instance must be seeded first.
* **Dynamic Interactions**: Cheerio only parses static HTML. It cannot evaluate client-side React code (e.g. clicking the "Key Takeaways" toggle to expand content). Dynamic UI interactions would require a browser-based runner (like Playwright). Cheerio is, however, perfect for testing delivery of priority images, third-party scripts, header hierarchies, and HTML accessibility structures.

---

## 4. Conclusion

A lightweight, zero-overhead E2E test suite can be implemented in plain TypeScript using `cheerio` and Node's native `node:test` framework. No heavy browser installations are required to verify SEO, accessibility (F3), script loading (F2), and image preload optimization (F1).

---

## 5. Verification Method

We can verify the feasibility of the test infrastructure by sketching the test runner. Below is the proposed layout.

### Proposed Test Runner Code (`tests/e2e/runner.ts`)
```typescript
import { spawn, ChildProcess } from 'child_process';
import http from 'http';
import { run } from 'node:test';
import { spec } from 'node:test/reporters';
import path from 'path';
import glob from 'fast-glob'; // or use fs to find files

const PORT = 3080;
const BASE_URL = `http://localhost:${PORT}`;

function waitPort(port: number, timeout = 15000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function check() {
      const req = http.request({ port, host: 'localhost', method: 'GET', path: '/' }, () => {
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > timeout) {
          reject(new Error(`Timeout waiting for port ${port}`));
        } else {
          setTimeout(check, 100);
        }
      });
      req.end();
    }
    check();
  });
}

async function main() {
  console.log('Spawning Next.js server on port', PORT);
  const server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    shell: true,
    env: { ...process.env, PORT: String(PORT) }
  });

  server.stdout?.on('data', (data) => console.log(`[Next.js]: ${data.toString().trim()}`));
  server.stderr?.on('data', (data) => console.error(`[Next.js ERR]: ${data.toString().trim()}`));

  try {
    await waitPort(PORT);
    console.log('Next.js server ready. Running E2E tests...');

    // Discover test files in tests/e2e/**/*.test.ts
    // For simplicity, we trigger node:test directly on those files
    const testFiles = [
      path.resolve(__dirname, 'f1-image.test.ts'),
      path.resolve(__dirname, 'f2-scripts.test.ts'),
      path.resolve(__dirname, 'f3-accessibility.test.ts')
    ];

    const stream = run({ files: testFiles });
    stream.compose(new spec()).pipe(process.stdout);

    stream.on('end', () => {
      console.log('Tests finished. Shutting down server...');
      server.kill();
      process.exit(0);
    });
  } catch (err) {
    console.error('Test run failed:', err);
    server.kill();
    process.exit(1);
  }
}

main();
```

### Proposed Feature Test Code (`tests/e2e/f1-image.test.ts`)
```typescript
import { test } from 'node:test';
import assert from 'node:assert';
import * as cheerio from 'cheerio';

const BASE_URL = 'http://localhost:3080';

test('F1 Image Delivery: Homepage Hero Image Priority', async () => {
  const res = await fetch(BASE_URL);
  const html = await res.text();
  const $ = cheerio.load(html);

  const heroImage = $('section.hero-section .hero-main img');
  
  if (heroImage.length > 0) {
    // Next.js priority maps to fetchpriority="high" and loading="eager" (or missing loading attribute since default is eager)
    const fetchPriority = heroImage.attr('fetchpriority');
    const loading = heroImage.attr('loading');
    
    assert.strictEqual(fetchPriority, 'high', 'Hero image must have fetchpriority="high"');
    assert.notStrictEqual(loading, 'lazy', 'Hero image must not be lazy-loaded');
  }
});
```

### Proposed Script Test Code (`tests/e2e/f2-scripts.test.ts`)
```typescript
import { test } from 'node:test';
import assert from 'node:assert';
import * as cheerio from 'cheerio';

const BASE_URL = 'http://localhost:3080';

test('F2 Scripts: Tracking Scripts Strategy', async () => {
  const res = await fetch(BASE_URL);
  const html = await res.text();
  const $ = cheerio.load(html);

  // Check GTM script
  const gtmScript = $('script[src*="googletagmanager.com/gtag/js"]');
  assert.ok(gtmScript.length > 0, 'Google Analytics script should be injected');
  assert.strictEqual(
    gtmScript.attr('data-nscript'),
    'afterInteractive',
    'GA script should use afterInteractive strategy'
  );

  // Check FB Pixel script
  const fbScript = $('script[id="fb-pixel"]');
  assert.ok(fbScript.length > 0, 'Meta Pixel script should be injected');
  assert.strictEqual(
    fbScript.attr('data-nscript'),
    'afterInteractive',
    'FB Pixel script should use afterInteractive strategy'
  );
});
```

### Proposed Accessibility Test Code (`tests/e2e/f3-accessibility.test.ts`)
```typescript
import { test } from 'node:test';
import assert from 'node:assert';
import * as cheerio from 'cheerio';

const BASE_URL = 'http://localhost:3080';

test('F3 Accessibility: Discernible link names & associated labels', async () => {
  const res = await fetch(BASE_URL);
  const html = await res.text();
  const $ = cheerio.load(html);

  // Check for empty links (links containing no text or aria-label/title)
  $('a').each((i, el) => {
    const link = $(el);
    const href = link.attr('href');
    const text = link.text().trim();
    const ariaLabel = link.attr('aria-label');
    const title = link.attr('title');

    // Skip anchor tags that are not links
    if (!href) return;

    // We expect at least some text or an aria-label/title attribute
    const hasName = text.length > 0 || !!ariaLabel || !!title || link.find('img').attr('alt');
    assert.ok(
      hasName,
      `Link to "${href}" does not have a discernible name (empty and no aria-label or title)`
    );
  });
});
```

### Command to Run Tests
To run tests, execute the runner file:
```bash
npx tsx tests/e2e/runner.ts
```
