'use client';

import Script from 'next/script';
import { useSearchParams, usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

const GA_MEASUREMENT_ID = 'G-QTRB8KFLZX';
const FB_PIXEL_ID = '1269599180626709';

export default function Tracking() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const trackedPurchase = useRef(false);

  useEffect(() => {
    // 1. Handle Pageviews for GA and Meta on route change
    if (typeof window !== 'undefined') {
      if ((window as any).gtag) {
        (window as any).gtag('config', GA_MEASUREMENT_ID, {
          page_path: pathname,
        });
      }
      if ((window as any).fbq) {
        (window as any).fbq('track', 'PageView');
      }
    }
  }, [pathname]);

  useEffect(() => {
    // 2. Handle Dynamic Purchase Tracking
    const purchaseVal = searchParams.get('purchase');
    
    if (purchaseVal && !trackedPurchase.current && typeof window !== 'undefined') {
      trackedPurchase.current = true;
      const value = parseFloat(purchaseVal);
      
      // Fire Google Analytics Purchase Event
      if ((window as any).gtag) {
        (window as any).gtag('event', 'purchase', {
          currency: 'USD',
          value: value,
          items: [{ name: 'Article or Print Edition', price: value, quantity: 1 }]
        });
      }

      // Fire Meta Pixel Purchase Event
      if ((window as any).fbq) {
        (window as any).fbq('track', 'Purchase', {
          currency: 'USD',
          value: value,
        });
      }
      
      console.log(`[Tracking] Purchase event fired for $${value}`);
    }
  }, [searchParams]);

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
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
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
