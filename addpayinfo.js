/* addpayinfo.js — GA4 add_payment_info 발사 (측정 전용·화면 무변경)
 * 목적: 주문서(/order/orderform) 결제수단 선택/결제 직전 GA4 add_payment_info 발사.
 *       현재 전 기간 0건(measure_verify A1) — 퍼널 4단계 공백 해소.
 * ★격리: gtag + send_to:'G-V7D156FCFX' 로 GA4에만 핀. dataLayer.push 절대 금지
 *   (add_payment_info는 GA4 표준 이벤트명이라 GTM enhanced-ecommerce의 Meta AddPaymentInfo
 *   태그가 dataLayer를 듣고 있으면 그게 곧 Meta 중복발화 경로 — cart_fix.js와 동일 규칙 답습).
 * ★LOG_ONLY: true면 gtag 대신 console.info만(첫 배포 콘솔검증용). 라이브 DOM/셀렉터 확정 후 false.
 * 디덥: in-memory(fired, 페이지로드 1발) + sessionStorage(체크아웃 지문, 새로고침 넘어 1발).
 *   Meta 안전은 격리에서 나오고, 디덥은 GA4 숫자 정확도용(둘은 별개 방어 — 섞어 설명하지 말 것).
 * 롤백: ScriptTag DELETE 1콜(신규 파일이라 이전 SHA 없음).
 */
(function () {
  'use strict';
  var LOG_ONLY = false; // ★첫 배포는 true(콘솔검증). 셀렉터/단일발화 확인 후 false로 재커밋+PUT.

  try {
    // ── 경로 가드: 주문서에서만. display_location=ALL이므로 필수 선발 ──
    // ★라이브에서 실제 경로 확정 후 필요 시 정규식 수정(2.7 검증①)
    if (!/\/order\/orderform/i.test(location.pathname)) return;

    if (window.__fitAddPayInfo) return; // 중복 ScriptTag 주입 방어(싱글턴)
    window.__fitAddPayInfo = 1;

    var fired = false; // in-memory: 한 페이지로드 1발 (결제수단 변경/재클릭 방어 = CEO 시나리오 직격)
    var LS = null; try { LS = window.sessionStorage; } catch (e) {}

    // ── ecommerce 소스: cart_fix와 동일하게 dataLayer 최신 ecommerce, 없으면 DOM 폴백 ──
    function lastEc() {
      try {
        var dl = window.dataLayer || [];
        for (var i = dl.length - 1; i >= 0; i--) {
          var e = dl[i];
          if (e && e.ecommerce && e.ecommerce.items) return e.ecommerce;
        }
      } catch (e) {}
      return null;
    }
    function domTotal() { // 주문서 결제예정금액 (셀렉터는 2.7 검증②에서 확정)
      try {
        var el = document.querySelector('#total_order_price, .total_price, [id*="total_price"], .txt-price strong');
        if (!el) return 0;
        var n = parseInt((el.textContent || '').replace(/[^0-9]/g, ''), 10);
        return n > 0 ? n : 0;
      } catch (e) { return 0; }
    }
    function resolve() { // {value, items, currency}
      var ec = lastEc();
      var value = (ec && ec.value) ? ec.value : domTotal();
      var items = (ec && ec.items) ? ec.items : []; // 없으면 빈배열 — GA4 add_payment_info는 items 없어도 유효
      var cur = (ec && ec.currency) || 'KRW';
      return { value: value, items: items, currency: cur };
    }

    // ── 디덥 키: 체크아웃 지문 (value|정렬item_id). 값 산출 불가면 sessionStorage 억제키 쓰지 않음(전 체크아웃 오억제 방지) ──
    function fp(r) {
      try {
        if (!r.value) return null;
        var ids = (r.items || []).map(function (it) { return it.item_id || ''; }).sort().join(',');
        return 'fit_apinfo_' + r.value + '_' + (ids ? ids.length + '-' + ids.slice(0, 40) : '0');
      } catch (e) { return null; }
    }

    // ── 결제수단 라벨(선택). PII 아님. 없으면 'unknown' ──
    function payType(t) {
      try {
        if (!t) return 'unknown';
        var v = (t.value || '').trim() || (t.getAttribute && t.getAttribute('data-method')) ||
          (t.closest && (t.closest('label') || {}).textContent || '').trim();
        return (v || 'unknown').replace(/\s+/g, ' ').slice(0, 40);
      } catch (e) { return 'unknown'; }
    }

    function fire(pm) {
      if (fired) return; // 1차: 페이지로드 내 1발
      var r = resolve(); var key = fp(r);
      if (LS && key) { // 2차: 새로고침 넘어 체크아웃당 1발 (지문 산출된 경우만)
        try { if (LS.getItem(key)) { fired = true; return; } LS.setItem(key, '1'); } catch (e) {}
      }
      fired = true;
      var payload = {
        send_to: 'G-V7D156FCFX', // ★GA4 핀 — 광고 타겟 브로드캐스트 차단
        transport_type: 'beacon',
        currency: r.currency, value: r.value, payment_type: pm || 'unknown', items: r.items
      };
      try {
        if (LOG_ONLY) {
          console.info('[addpayinfo]', payload); // 콘솔검증 모드 — GA4 미발사
        } else {
          gtag('event', 'add_payment_info', payload);
          // ⚠️ dataLayer.push 하지 않는다 (GTM→Meta AddPaymentInfo 중복발화 경로 원천 차단)
        }
      } catch (e) {}
    }

    // 트리거 1: 결제수단 라디오 변경
    document.addEventListener('change', function (e) {
      var t = e.target; if (!t) return;
      var idn = ((t.name || '') + ' ' + (t.id || ''));
      if (/payment|pay_method|paymethod|MK_pmt|pmt_method|settle/i.test(idn) && (t.type === 'radio' || t.tagName === 'SELECT'))
        fire(payType(t));
    }, true);

    // 트리거 2(안전망): 최종 "결제하기" 클릭 직전
    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest && e.target.closest('a,button,input'); if (!t) return;
      var sig = ((t.className || '') + ' ' + (t.id || '') + ' ' + (t.value || ''));
      if (/order_button|btn[-_]?order|btnOrder|결제하기|order_submit|submit_order/i.test(sig))
        fire('submit');
    }, true);
  } catch (e) { /* 전체 격리 — 어떤 오류도 주문/결제 흐름에 영향 0 */ }
})();
