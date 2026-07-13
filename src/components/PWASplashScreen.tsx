import Script from 'next/script';

/**
 * PWA-only: navy shell class + optional branded splash on cold open.
 * Never activates in normal desktop/mobile browser tabs.
 */
export default function PWASplashScreen() {
  return (
    <>
      <Script id="pwa-splash-detect" strategy="beforeInteractive">{`
(function () {
  try {
    var standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      !!(window.navigator).standalone ||
      document.referrer.indexOf('android-app://') === 0;
    if (!standalone) return;
    document.documentElement.classList.add('pwa-standalone');
    if (!sessionStorage.getItem('pwa_splash_seen')) {
      document.documentElement.classList.add('pwa-splash-active');
    }
  } catch (e) {}
})();
`}</Script>

      <div id="pwa-splash" className="pwa-splash" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-square.png"
          alt=""
          width={96}
          height={96}
          className="pwa-splash-logo"
        />
        <div className="pwa-splash-title">
          <span className="pwa-splash-the">The</span>
          <span className="pwa-splash-name">Cougar Chronicle</span>
        </div>
      </div>

      <Script id="pwa-splash-hide" strategy="afterInteractive">{`
(function () {
  try {
    if (!document.documentElement.classList.contains('pwa-splash-active')) return;
    sessionStorage.setItem('pwa_splash_seen', '1');
    var el = document.getElementById('pwa-splash');
    if (!el) {
      document.documentElement.classList.remove('pwa-splash-active');
      return;
    }
    var start = Date.now();
    var minMs = 1400;
    function hide() {
      var wait = Math.max(0, minMs - (Date.now() - start));
      setTimeout(function () {
        el.classList.add('pwa-splash--hide');
        setTimeout(function () {
          document.documentElement.classList.remove('pwa-splash-active');
          if (el && el.parentNode) el.parentNode.removeChild(el);
        }, 450);
      }, wait);
    }
    if (document.readyState === 'complete') hide();
    else window.addEventListener('load', hide);
  } catch (e) {
    document.documentElement.classList.remove('pwa-splash-active');
  }
})();
`}</Script>
    </>
  );
}
