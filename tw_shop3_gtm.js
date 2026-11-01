/* FITABLE TW — Cafe24 shop3 GTM loader
 * 대만 자사몰(카페24 멀티쇼핑몰 shop3 · fitabletw.com) 전용. 컨테이너 GTM-K2TNF39P.
 * GA4(G-FSLXLCM0FT) + Meta 픽셀(1128375346294437)은 GTM 안에서 발화한다.
 * 트리거 조건이 Page Hostname = fitabletw.com 이라 다른 몰에는 영향이 없다. 2026-11-01.
 */
(function () {
  if (window.__fitableTwGtmLoaded) return;
  if (!/(^|\.)fitabletw\.com$/i.test(location.hostname || '')) return;
  window.__fitableTwGtmLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtm.js?id=GTM-K2TNF39P';
  (document.head || document.documentElement).appendChild(s);
})();
