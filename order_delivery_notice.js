/* order_delivery_notice.js — 출고일 고지 (장바구니·주문서 상단 안내 바) — 8월판
   배경: 7/31 사전예약 종료 후 정가전환(8/1). 7월판(사전예약 취소조건 고지)은 8/1 00:00
   자동 만료되어 8/2 현재 배송일 안내가 카트/주문서에 없는 공백 상태 → 8월판 신규 배포.
   PDP 라이브 문구(126)와 동일하게 "8월 10일부터" 기준(사전예약 7/31 이전 결제분만 8/7 우선출고,
   그 케이스는 이미 발송 대상이라 신규 결제 고객 대상 이 배너에선 단일 문구로 충분).
   렌더 조건: /order/ 경로 + 페이지에 오브제 와이드 풀업바 상품명 포함 시에만.
   자동 만료: 8/10 출고 개시 후엔 "~부터 출고" 안내가 낡으므로 렌더 중단.
   롤백: ScriptTag src를 이전 커밋(d75e956)으로 되돌리거나 DELETE. 전체 try/catch 격리. */
(function () {
  'use strict';
  try {
    // 8/10 00:00 KST 이후엔 "출고 예정" 안내가 낡음 — 자동 소멸.
    if (Date.now() >= 1786287600000 /* 2026-08-10T00:00:00+09:00 */) return;
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
          row('배송', B('8월 10일') + '부터 순차 출고') +
          row('', '결제하신 순서 그대로, 하나씩 정성껏 보내드릴게요', 7, true);
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
