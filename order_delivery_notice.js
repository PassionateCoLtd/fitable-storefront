/* order_delivery_notice.js — [사전예약] 출고시점 고지 (장바구니·주문서 상단 안내 바)
   배경: 배송지연 문의 다수(7/7 CS). Clarity 실측 스크롤 중앙값 11% — 상세페이지 고지만으로는
   구매자 인지 불충분 → 실구매 동선(장바구니·주문서)에 직접 고지해 '몰랐다 취소' 예방.
   렌더 조건: /order/ 경로 + 페이지에 '[사전예약]' 상품명 포함 시에만. 화면 무변경 원칙 외 유일 삽입.
   PREVIEW=true 단계: localStorage.fit_preview==='1' 브라우저만 렌더(검수용) → 승인 후 false 재배포.
   롤백: ScriptTag DELETE 1콜. 전체 try/catch 격리. 2026-07-07 대표 지시. */
(function () {
  'use strict';
  try {
    var PREVIEW = true;
    if (PREVIEW) {
      try { if (window.localStorage.getItem('fit_preview') !== '1') return; } catch (e) { return; }
    }
    if (!/\/order\/(basket|orderform)/.test(location.pathname)) return;

    var MSG = '📦 <b style="font-weight:700;">[사전예약]</b> 상품은 <b style="font-weight:700;">8월 초~중순 순차 출고</b>됩니다 &middot; 출고 전 100% 무료 취소';
    var FONT = "'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif";

    function build() {
      try {
        if (document.getElementById('fit-delivery-notice')) return;
        // 사전예약 상품이 담긴 경우에만
        var txt = (document.body.innerText || '');
        if (txt.indexOf('[사전예약]') === -1) return;
        var bar = document.createElement('div');
        bar.id = 'fit-delivery-notice';
        bar.innerHTML = MSG;
        bar.style.cssText = 'background:#EFF6FF;color:#1D4ED8;font-size:13px;font-weight:500;' +
          'line-height:1.55;padding:12px 15px;border-radius:10px;margin:10px 12px 4px;' +
          'word-break:keep-all;font-family:' + FONT + ';';
        var host = document.getElementById('contents') ||
                   document.querySelector('.xans-order') || document.body;
        host.insertBefore(bar, host.firstChild);
      } catch (e) {}
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
    else build();
    setTimeout(build, 1200); // 지연 렌더 대비 재시도
  } catch (e) { /* 전체 격리 — 페이지 영향 0 */ }
})();
