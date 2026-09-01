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
  const trackedPurchase = useRef(false);
  const isFirstPath = useRef(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

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
  }, [pathname]);

  useEffect(() => {
    const purchaseVal = searchParams.get('purchase');

    if (purchaseVal && !trackedPurchase.current && typeof window !== 'undefined') {
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
  }, [searchParams]);

  useEffect(() => {
    let scrollTracked = false;

    const handleScroll = () => {
      if (scrollTracked) return;

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
  }, [pathname]);

  return (
    <>
      {/* Global Site Tag (gtag.js) - Google Analytics */}
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
            var p = window.location.pathname;
            var g = 'article';
            if (!p || p === '/') g = 'home';
            else if (/^\\/(news|opinion|campus|politics|family|faith|videos|print-edition)(\\/|$)/.test(p)) g = p.split('/')[1];
            else if (p.indexOf('/byu-') === 0) g = 'byu-hub';
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: p,
              content_group: g
            });
          `,
        }}
      />

      {/* Meta Pixel Code */}
      <Script
        id="fb-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
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
    </>
  );
}
