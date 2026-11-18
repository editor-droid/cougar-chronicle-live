'use client';

import Script from 'next/script';
import { useSearchParams, usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { contentGroupFromPath, track } from '@/lib/ga-client';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-QTRB8KFLZX';
const FB_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '1269599180626709';

export default function Tracking() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hideTracking = pathname.startsWith('/preview');
  const trackedPurchase = useRef(false);
  const isFirstPath = useRef(true);

  useEffect(() => {
    if (hideTracking || typeof window === 'undefined') return;

    // Initial page_view is sent by gtag config (so bounces still count).
    // SPA navigations send an explicit page_view with content grouping.
    if (isFirstPath.current) {
      isFirstPath.current = false;
    } else {
      track('page_view', {
        page_path: pathname,
        page_title: document.title,
        content_group: contentGroupFromPath(pathname),
      });
    }

    if (window.fbq) {
      window.fbq('track', 'PageView');
    }
  }, [pathname, hideTracking]);

  useEffect(() => {
    const purchaseVal = searchParams.get('purchase');

    if (!hideTracking && purchaseVal && !trackedPurchase.current && typeof window !== 'undefined') {
      trackedPurchase.current = true;
      const value = parseFloat(purchaseVal);

      track('purchase', {
        currency: 'USD',
        value,
        items: [{ name: 'Article or Print Edition', price: value, quantity: 1 }],
      });

      if (window.fbq) {
        window.fbq('track', 'Purchase', {
          currency: 'USD',
          value,
        });
      }

      console.log(`[Tracking] Purchase event fired for $${value}`);
    }
  }, [searchParams, hideTracking]);

  useEffect(() => {
    let scrollTracked = false;

    const handleScroll = () => {
      if (hideTracking || scrollTracked) return;

      const scrollPosition = window.scrollY + window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      if (scrollPosition > documentHeight * 0.75) {
        scrollTracked = true;
        track('scroll_depth_75');
        if (window.fbq) {
          window.fbq('trackCustom', 'ScrollDepth75');
        }
        console.log('[Tracking] Scroll depth 75% fired');
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pathname, hideTracking]);

  if (hideTracking) return null;

  return (
    <>
      {/* Queue stubs run early so events are not dropped. The network scripts wait for idle. */}
      <Script
        id="gtag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = window.gtag || gtag;
            gtag('js', new Date());
            var p = window.location.pathname;
            var g = 'article';
            if (!p || p === '/') g = 'home';
            else if (/^\\/(news|opinion|campus|politics|family|faith|sports|videos|print-edition)(\\/|$)/.test(p)) g = p.split('/')[1];
            else if (p.indexOf('/byu-') === 0) g = 'byu-hub';
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: p,
              content_group: g
            });
          `,
        }}
      />
      <Script
        id="gtag-js"
        strategy="lazyOnload"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />

      <Script
        id="fb-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            if (!window.fbq) {
              var n = window.fbq = function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if (!window._fbq) window._fbq = n;
              n.push = n;
              n.loaded = true;
              n.version = '2.0';
              n.queue = [];
            }
            window.fbq('init', '${FB_PIXEL_ID}');
            window.fbq('track', 'PageView');
          `,
        }}
      />
      <Script
        id="fb-pixel-js"
        strategy="lazyOnload"
        src="https://connect.facebook.net/en_US/fbevents.js"
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
    </>
  );
}
