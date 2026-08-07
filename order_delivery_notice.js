/* order_delivery_notice.js — 출고일 고지 (장바구니·주문서 상단 안내 바) — 8월판 v3
   배경: 7/31 사전예약 종료 후 정가전환(8/1), "~8월 10일부터 순차 출고" 안내로 시작.
   8/3 09:15 창고(바로) 김정은님이 전량 출고 인원 추가투입을 확정 — 그날부터
   순차출고가 아니라 상시 컷오프 방식(오후 4시 이전 결제=당일출고)으로 바뀌어 PDP와
   함께 재작성. 주말 출고가 없어 "평일" 명시 + 주말/공휴일 결제분은 다음 영업일
   출고 안내 추가(대표 지시). 날짜가 아니라 시각 컷오프 정책이라 만료 게이트 없이 상시 노출.
   렌더 조건: /order/ 경로 + 페이지에 오브제 와이드 풀업바 상품명 포함 시에만.
   롤백: ScriptTag src를 이전 커밋으로 되돌리거나 DELETE. 전체 try/catch 격리. */
(function () {
  'use strict';
  try {
    if (!/\/order\/(basket|orderform)/.test(location.pathname)) return;

    var FONT = "'SUIT','Plus Jakarta Sans','Apple SD Gothic Neo','Noto Sans KR',sans-serif";
    var ROW = 'display:flex;align-items:baseline;gap:12px;';
    var LABEL = 'flex:none;width:34px;font-size:10px;font-weight:600;letter-spacing:.12em;color:#A8A29E;';
    var VAL = 'font-size:13px;font-weight:500;color:#FAFAF9;letter-spacing:-0.1px;word-break:keep-all;';
    var SUB = 'font-size:11.5px;font-weight:500;color:#78716C;letter-spacing:-0.1px;word-break:keep-all;';
    function row(label, valHtml, top, sub) {
      return '<div style="' + ROW + (top ? 'margin-top:' + top + 'px;' : '') + '">' +
        '<span style="' + LABEL + '">' + label + '</span>' +
        '<span style="' + (sub ? SUB : VAL) + '">' + valHtml + '</span></div>';
    }
    var B = function (s) { return '<b style="font-weight:700;color:#fff;">' + s + '</b>'; };

    function build() {
      try {
        if (document.getElementById('fit-delivery-notice')) return;
        var txt = (document.body.innerText || '');
        if (txt.indexOf('오브제 와이드 풀업바') === -1) return;
        var bar = document.createElement('div');
        bar.id = 'fit-delivery-notice';
        bar.innerHTML =
          row('배송', B('평일 오후 4시') + ' 이전 결제 시 당일출고') +
          row('', '오후 4시 이후·주말/공휴일은 다음 영업일 출고돼요', 7, true);
        bar.style.cssText = 'background:#171716;padding:14px 16px;border-radius:0;' +
          'margin:10px 12px 4px;line-height:1.5;font-family:' + FONT + ';';
        var host = document.getElementById('contents') ||
                   document.querySelector('.xans-order') || document.body;
        host.insertBefore(bar, host.firstChild);
      } catch (e) {}
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
    else build();
    setTimeout(build, 1200);
  } catch (e) { /* 전체 격리 — 페이지 영향 0 */ }
})();
