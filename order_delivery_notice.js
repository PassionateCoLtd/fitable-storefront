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
    // 자동 만료: 사전예약 종료(7/31 24:00 KST) 후엔 렌더 안 함 — '7/31까지 무료 취소' 문구가 낡기 때문.
    // ScriptTag 삭제 없이도 8/1 00:00부터 자동 소멸. (본판매 전환 시 상품명 [사전예약] 제거로도 이중 차단)
    if (Date.now() >= 1785510000000 /* 2026-08-01T00:00:00+09:00 */) return;
    if (!/\/order\/(basket|orderform)/.test(location.pathname)) return;

    // 2026-07-15 새 스킨 톤앤매너 반영(A안): 각진 코너·SUIT 폰트·웜블랙 #171716·웜그레이 라벨.
    // 구 스킨 시절 #0B0B0D+라운드12+파랑라벨(Pretendard)에서 새 스킨 구매버튼과 톤 통일.
    var FONT = "'SUIT','Plus Jakarta Sans','Apple SD Gothic Neo','Noto Sans KR',sans-serif";
    var ROW = 'display:flex;align-items:baseline;gap:12px;';
    var LABEL = 'flex:none;width:34px;font-size:10px;font-weight:600;letter-spacing:.12em;color:#A8A29E;';
    var VAL = 'font-size:13px;font-weight:500;color:#FAFAF9;letter-spacing:-0.1px;word-break:keep-all;';
    // 모바일 390px에서 메인 줄이 절대 안 꺾이도록: 메인 2줄 짧게 + 보조 설명 줄(작은 회색)
    var SUB = 'font-size:11.5px;font-weight:500;color:#78716C;letter-spacing:-0.1px;word-break:keep-all;';
    function row(label, valHtml, top, sub) {
      return '<div style="' + ROW + (top ? 'margin-top:' + top + 'px;' : '') + '">' +
        '<span style="' + LABEL + '">' + label + '</span>' +
        '<span style="' + (sub ? SUB : VAL) + '">' + valHtml + '</span></div>';
    }
    var B = function (s) { return '<b style="font-weight:700;color:#fff;">' + s + '</b>'; };
    // 옵션 구성별 문구 분기 — '9월 초 발송분' 옵션은 출고/취소 조건이 다름 (대표 결정 7/8:
    // 9월 발송분은 발송 전까지 취소 가능. 8/1 컷은 8월 발송분(얼리버드)에만 적용)
    function buildMsg(hasEarly, has2nd) {
      if (hasEarly && has2nd) {   // 혼합 장바구니
        return row('출고', '얼리버드 ' + B('8월 초~중순') + ' &middot; 9월분 ' + B('9월 초')) +
               row('취소', '얼리버드 7/31까지 &middot; 9월분 발송 전까지', 7) +
               row('', '8/1부터 얼리버드분은 배송 준비로 취소가 불가능해요', 4, true);
      }
      if (has2nd) {               // 9월 초 발송분만
        return row('출고', B('9월 초') + ' 순차 출고') +
               row('취소', '발송 준비 전까지 무료 취소', 7) +
               row('', '9월 발송 준비가 시작되면 취소가 어려워요', 4, true);
      }
      return row('출고', B('8월 초~중순') + ' 순차 출고') +
             row('취소', '7/31까지 무료 취소', 7) +
             row('', '8/1부터는 배송 준비로 취소가 불가능해요', 4, true);
    }

    function build() {
      try {
        if (document.getElementById('fit-delivery-notice')) return;
        // 사전예약 상품이 담긴 경우에만
        var txt = (document.body.innerText || '');
        if (txt.indexOf('[사전예약]') === -1) return;
        var has2nd = txt.indexOf('9월 초 발송분') > -1 || txt.indexOf('2차 입고') > -1;
        var hasEarly = txt.indexOf('얼리버드') > -1;
        var bar = document.createElement('div');
        bar.id = 'fit-delivery-notice';
        bar.innerHTML = buildMsg(hasEarly, has2nd);
        bar.style.cssText = 'background:#171716;padding:14px 16px;border-radius:0;' +
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
