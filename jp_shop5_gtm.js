/* FITABLE JP — Cafe24 shop5 GTM loader
 * 일본 자사몰(카페24 멀티쇼핑몰 shop5) 전용. 컨테이너 GTM-W2H92G8X.
 * GA4(G-1SCGQRMJYL) 구성 + Meta 픽셀(982074263877297)은 GTM 안에서 발화한다.
 * 트리거 조건이 Page Path startsWith /shop5/ 이므로 한국몰에는 영향이 없다.
 */
(function () {
  if (window.__fitableJpGtmLoaded) return;
  window.__fitableJpGtmLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtm.js?id=GTM-W2H92G8X';
  (document.head || document.documentElement).appendChild(s);
})();
