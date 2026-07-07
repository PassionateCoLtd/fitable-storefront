/* order_delivery_notice.js — [사전예약] 출고시점 고지 (장바구니·주문서 상단 안내 바)
   배경: 배송지연 문의 다수(7/7 CS). Clarity 실측 스크롤 중앙값 11% — 상세페이지 고지만으로는
   구매자 인지 불충분 → 실구매 동선(장바구니·주문서)에 직접 고지해 '몰랐다 취소' 예방.
   렌더 조건: /order/ 경로 + 페이지에 '[사전예약]' 상품명 포함 시에만. 화면 무변경 원칙 외 유일 삽입.
   PREVIEW=true 단계: localStorage.fit_preview==='1' 브라우저만 렌더(검수용) → 승인 후 false 재배포.
   롤백: ScriptTag DELETE 1콜. 전체 try/catch 격리. 2026-07-07 대표 지시. */
(function () {
  'use strict';
  try {
    var PREVIEW = false;
    if (PREVIEW) {
      try { if (window.localStorage.getItem('fit_preview') !== '1') return; } catch (e) { return; }
    }
    if (!/\/order\/(basket|orderform)/.test(location.pathname)) return;

    var FONT = "'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif";
    // 라벨-값 2줄 정렬 · PDP 블랙 배너와 동일 디자인 언어(#0B0B0D + #93C5FD)
    var ROW = 'display:flex;align-items:baseline;gap:12px;';
    var LABEL = 'flex:none;width:30px;font-size:10.5px;font-weight:600;letter-spacing:.14em;color:#93C5FD;';
    var VAL = 'font-size:13px;font-weight:500;color:#F2F3F5;letter-spacing:-0.1px;word-break:keep-all;';
    // 모바일 390px에서 메인 줄이 절대 안 꺾이도록: 메인 2줄(12·13자) + 보조 설명 줄(작은 회색)
    var SUB = 'font-size:11.5px;font-weight:500;color:#8a919c;letter-spacing:-0.1px;word-break:keep-all;';
    var MSG =
      '<div style="' + ROW + '"><span style="' + LABEL + '">출고</span>' +
        '<span style="' + VAL + '"><b style="font-weight:700;color:#fff;">8월 초~중순</b> 순차 출고</span></div>' +
      '<div style="' + ROW + 'margin-top:7px;"><span style="' + LABEL + '">취소</span>' +
        '<span style="' + VAL + '">7/31까지 무료 취소</span></div>' +
      '<div style="' + ROW + 'margin-top:4px;"><span style="' + LABEL + '"></span>' +
        '<span style="' + SUB + '">8/1부터는 배송 준비로 취소가 불가능해요</span></div>';

    function build() {
      try {
        if (document.getElementById('fit-delivery-notice')) return;
        // 사전예약 상품이 담긴 경우에만
        var txt = (document.body.innerText || '');
        if (txt.indexOf('[사전예약]') === -1) return;
        var bar = document.createElement('div');
        bar.id = 'fit-delivery-notice';
        bar.innerHTML = MSG;
        bar.style.cssText = 'background:#0B0B0D;padding:14px 17px;border-radius:12px;' +
          'margin:10px 12px 4px;line-height:1.5;font-family:' + FONT + ';';
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
