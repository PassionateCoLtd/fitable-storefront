/* attr_capture.js — 퍼스트파티 어트리뷰션 박제 + 결제 인텐트 포착 (측정 전용·화면 무변경)
 * 목적: 네이버페이/카카오 인앱 결제로 유실되는 유입 소스를 localStorage에 박제해
 *       결제 직전 이벤트(np/kp_checkout_start)와 주문완료(order_attr)에 파라미터로 복원.
 * 이벤트: np_checkout_start / kp_checkout_start / order_attr
 * 파라미터: ft_source/ft_medium/ft_campaign (최초유입), lt_source/lt_medium/lt_campaign (최종유입),
 *          product_no, order_id — 전부 GA4 event-scoped custom dimension 등록됨 (2026-07-02)
 *          + ft_content/lt_content (utm_content={{ad.name}} 소재 단위, 2026-07-06 등록) — 소재별 취소율/순ROAS용
 * + checkout_start 서버 비콘 + 1st-party 쿠키 guid (2026-07-11): 결제창 이동 직전(원본
 *   웹뷰, localStorage 생존)에 소재를 서버로 직접 기록해두고, 주문완료 비콘의 guid와 조인해
 *   인앱결제 왕복 중 localStorage 유실로 추정(proportional)으로 떨어지던 소재매칭을 실측 승격.
 * 롤백: ScriptTag DELETE 1콜. 전체 try/catch 격리, 기존 스크립트 무수정.
 */
(function () {
  'use strict';
  try {
    var LS = window.localStorage;
    if (!LS) return;
    var NOW = Date.now();
    var TTL = 30 * 24 * 3600 * 1000; // 30일
    var K_FT = 'fit_ft_attr', K_LT = 'fit_lt_attr', K_OA = 'fit_oa_sent';

    /* ── 1. 현재 페이지뷰의 유입 판정 ── */
    function parseAttr() {
      var p, src = '', med = '', cmp = '', ct = '', ref = '', refHost = '';
      try { p = new URLSearchParams(location.search); } catch (e) { return null; }
      src = p.get('utm_source') || '';
      med = p.get('utm_medium') || '';
      cmp = p.get('utm_campaign') || '';
      ct = p.get('utm_content') || '';
      try { ref = document.referrer || ''; refHost = ref ? new URL(ref).hostname : ''; } catch (e) {}
      var internal = refHost && (refHost === location.hostname || refHost.indexOf('fitablekorea') > -1);
      if (!src) {
        if (p.get('fbclid')) { src = 'facebook'; med = med || 'cpc'; }
        else if (p.get('gclid')) { src = 'google'; med = med || 'cpc'; }
        else if (p.get('n_media') || p.get('n_query')) { src = 'naver'; med = med || 'cpc'; }
        else if (p.get('icid')) { src = 'onsite'; med = med || 'internal'; }
        else if (refHost && !internal) {
          var MAP = [[/kakao/, 'kakao'], [/pay\.naver|orders\.pay/, 'naverpay_return'],
            [/naver/, 'naver'], [/instagram/, 'instagram'], [/facebook|^fb\.|^m\.facebook/, 'facebook'],
            [/google/, 'google'], [/youtube|youtu\.be/, 'youtube'], [/daum/, 'daum'], [/wadiz/, 'wadiz']];
          for (var i = 0; i < MAP.length; i++) { if (MAP[i][0].test(refHost)) { src = MAP[i][1]; break; } }
          if (!src) src = refHost;
          med = med || 'referral';
        }
      }
      if (!src && !refHost) { src = '(direct)'; med = med || '(none)'; }
      if (!src) return null; // 내부 이동 → 갱신 없음
      return { s: src, m: med || '(none)', c: cmp, ct: ct, r: refHost, lp: location.pathname, ts: NOW };
    }

    function load(k) {
      try {
        var v = JSON.parse(LS.getItem(k) || 'null');
        if (v && v.ts && (NOW - v.ts) < TTL) return v;
      } catch (e) {}
      return null;
    }
    function save(k, v) { try { LS.setItem(k, JSON.stringify(v)); } catch (e) {} }

    var ft = load(K_FT), lt = load(K_LT);
    var cur = parseAttr();
    if (cur) {
      // (direct)·onsite·naverpay 복귀는 기존 채널 어트리뷰션을 덮지 않음 (non-direct last touch)
      var weak = (cur.s === '(direct)' || cur.s === 'onsite' || cur.s === 'naverpay_return');
      if (!lt || !weak) { save(K_LT, cur); lt = cur; }
      if (!ft) { save(K_FT, cur); ft = cur; }
    }

    /* ── 1.5 유입 클릭ID 박제 (발화 0·localStorage 전용·주문↔터치 서버조인 재료) ── */
    try {
      var TTL_CID = 90 * 24 * 3600 * 1000;                 // 90일(채널 어트리뷰션 창에 맞춤. 기존 attr 30일과 독립)
      var KC_FT = 'fit_ft_click', KC_LT = 'fit_lt_click';
      var q2; try { q2 = new URLSearchParams(location.search); } catch (e) { q2 = null; }
      if (q2) {
        var CIDKEYS = ['gclid', 'gbraid', 'wbraid', 'fbclid', 'ttclid', 'msclkid', 'kclid', 'kakaoclid'];
        var UTMKEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
        var hitCid = {}, hasCid = false, k2, v2;
        for (var i2 = 0; i2 < CIDKEYS.length; i2++) { v2 = q2.get(CIDKEYS[i2]); if (v2) { hitCid[CIDKEYS[i2]] = v2.slice(0, 256); hasCid = true; } }
        var utmSnap = {};
        for (var j2 = 0; j2 < UTMKEYS.length; j2++) { v2 = q2.get(UTMKEYS[j2]); if (v2) utmSnap[UTMKEYS[j2]] = v2.slice(0, 256); }
        // 클릭ID가 하나라도 있거나 utm이 있을 때만 기록(내부이동·순수직접은 스킵 → 불필요 쓰기 방지)
        if (hasCid || Object.keys(utmSnap).length) {
          var rec = { cid: hitCid, utm: utmSnap, lp: location.pathname, ts: NOW };
          // last-touch: TTL 유효+동일 내용이면 재쓰기 생략(디덥)
          var prevLt = null; try { prevLt = JSON.parse(LS.getItem(KC_LT) || 'null'); } catch (e) {}
          var same = prevLt && JSON.stringify(prevLt.cid) === JSON.stringify(hitCid) &&
                     JSON.stringify(prevLt.utm) === JSON.stringify(utmSnap);
          if (!same) { try { LS.setItem(KC_LT, JSON.stringify(rec)); } catch (e) {} }
          // first-touch: 없거나 만료된 경우에만(write-once within TTL)
          var prevFt = null; try { prevFt = JSON.parse(LS.getItem(KC_FT) || 'null'); } catch (e) {}
          if (!(prevFt && prevFt.ts && (NOW - prevFt.ts) < TTL_CID)) {
            try { LS.setItem(KC_FT, JSON.stringify(rec)); } catch (e) {}
          }
        }
      }
    } catch (e) { /* 확장 격리 — 실패해도 기존 이벤트 로직(§2~4)에 영향 0 */ }

    /* ── 1.6 1st-party 쿠키 guid + 서버 비콘 헬퍼 (checkout_start↔order_result 조인용, 2026-07-11) ── */
    var K_GUID = 'fit_guid';
    var DASH = 'https://fitable-dashboard.ngrok.app';
    function getCookie(name) {
      try {
        var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
        return m ? decodeURIComponent(m[1]) : '';
      } catch (e) { return ''; }
    }
    function setCookie(name, val) {
      try {
        document.cookie = name + '=' + encodeURIComponent(val) +
          '; domain=.fitablekorea.com; path=/; max-age=2592000; SameSite=Lax; Secure';
      } catch (e) {}
    }
    function genGuid() {
      try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
      return 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    }
    function getGuid() {
      var g = getCookie(K_GUID);
      if (!g) { g = genGuid(); setCookie(K_GUID, g); }
      return g;
    }
    /* ── 1.65 GA4 식별자 포착 (client_id/session_id, 2026-08-04) ──
     * 목적: 서버사이드 보충전송(ga4_mp_purchase_backfill)이 합성 client_id 대신 **진짜**
     *   cid/sid로 purchase를 쏘게 해서, 외부결제(네이버페이) 구매가 GA4에서 (not set)이
     *   아니라 원래 세션·유입소스에 붙게 한다. 페이콘(유료앱)이 하던 일의 대체.
     * 쿠키 포맷 2종 대응: _ga=GA1.1.<cid>  / _ga_<STREAM>=GS1.1.<sid>.. 또는 GS2.1.s<sid>$..
     *   (2025년 GS2 포맷 전환 이력 — 한쪽만 파싱하면 조용히 전멸하므로 둘 다 시도)
     * 실패해도 빈 문자열 → 백필이 기존 합성 cid로 폴백(무해). 화면·발화 영향 0. */
    var GA4_STREAM = 'V7D156FCFX';   // 측정ID G-V7D156FCFX 의 스트림 접미사
    function gaIds() {
      var out = { cid: '', sid: '' };
      try {
        var m = (getCookie('_ga') || '').match(/GA\d\.\d\.(\d+\.\d+)$/);
        if (m) out.cid = m[1];
        var s = getCookie('_ga_' + GA4_STREAM) || '';
        var ms = s.match(/GS2\.\d\.s(\d{9,})/) || s.match(/GS1\.\d\.(\d{9,})/);
        if (ms) out.sid = ms[1];
      } catch (e) {}
      return out;
    }
    function addGaIds(payload) {
      try {
        var g = gaIds();
        if (g.cid) payload.cid = g.cid;
        if (g.sid) payload.sid = g.sid;
      } catch (e) {}
      return payload;
    }

    function beaconPost(url, payload) {
      try {
        var bb = JSON.stringify(payload), bok = false;
        if (navigator.sendBeacon) {
          try { bok = navigator.sendBeacon(url, new Blob([bb], { type: 'text/plain' })); } catch (e) {}
        }
        if (!bok && window.fetch) {
          try { fetch(url, { method: 'POST', body: bb, keepalive: true, mode: 'no-cors',
                              headers: { 'Content-Type': 'text/plain' } }); } catch (e) {}
        }
      } catch (e) { /* 확장 격리 */ }
    }

    /* ── 1.7 결제예정 총액 확보 (금액 삼각측량 조인 재료, 2026-07-11) ──
     * addpayinfo.js의 lastEc()/domTotal()/resolve()를 그대로 이식(중복구현 금지, 검증된 셀렉터 재사용). */
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
    function firstPrice(text) {
      /* "59,900원", "59,900원(1개)" 등에서 첫 번째 금액만 추출.
       * ★전체 숫자스트립 금지: 모바일 스킨 .total은 "59,900원(1개)"처럼 수량이 붙어
       *   순진한 추출 시 599001로 오염됨(2026-07-12 실측: 599001/757002/298001 관측). */
      try {
        var m = (text || '').match(/([0-9][0-9,]*)\s*원/);
        if (!m) return 0;
        var n = parseInt(m[1].replace(/,/g, ''), 10);
        return n > 0 ? n : 0;
      } catch (e) { return 0; }
    }
    function domTotal() {
      try {
        var el = document.querySelector('#total_order_price, .total_price, [id*="total_price"], .txt-price strong');
        if (!el) return 0;
        return firstPrice(el.textContent);
      } catch (e) { return 0; }
    }
    function selectedOptionTotal() {
      /* Cafe24 PDP "총 상품 금액"(#totalPrice .total) = 옵션 선택 후 갱신되는 선택옵션
       * 실제 총액(수량 반영). WPB처럼 차수별 옵션가가 다르고 기본옵션이 품절인 사전예약
       * 상품에서, dataLayer view_item의 낡은 기본가(예 49,900=1차 품절)와 실제 선택가
       * (예 59,900=3차)가 어긋나는 문제 해결(2026-07-11 실측 확인). 미선택시 0원 → 0 반환.
       * ★셀렉터는 .total 컨테이너 텍스트(내부 마크업 무관): PC스킨=<em>, 모바일스킨(skin4)=
       *   <strong class="price">로 다름 — 'em' 지정 시 모바일 전멸(2026-07-12 실측: 배포후
       *   18h 비콘 183건 전부 amount 누락, 트래픽 ~100% 모바일). 파싱은 firstPrice(수량표기 방어). */
      try {
        var el = document.querySelector('#totalPrice .total, .totalPrice .total');
        if (!el) return 0;
        return firstPrice(el.textContent);
      } catch (e) { return 0; }
    }
    function hasProductOption() {
      /* 옵션 선택자가 존재하는 상품인지(WPB 등). 존재하는데 미선택이면 dataLayer 기본가는
       * 품절 1차 등 오답일 수 있으므로 amount를 생략(오답 전송 금지)하는 게이트. */
      try {
        return !!document.querySelector('select[option_select_element], select[product_option_area], .prd_option select');
      } catch (e) { return false; }
    }
    function checkoutAmount() {
      try {
        var sel = selectedOptionTotal();   // 1순위: 선택 옵션 실제 총액(PDP, 결제될 금액)
        if (sel > 0) return sel;
        // 옵션상품인데 미선택(총액 0원) → dataLayer 기본가(품절옵션 오답)로 내려가지 말고 생략.
        // 생략은 항상 안전(amount 없으면 guid/비례배분 폴백). 오답 전송이 오히려 매칭을 망침.
        if (hasProductOption()) return 0;
        var ec = lastEc();                 // 무옵션 상품만 dataLayer 신뢰(2순위)
        if (ec && ec.value) return ec.value;
        return domTotal();                 // 3순위: 기존 주문서 DOM 폴백
      } catch (e) { return 0; }
    }

    /* ── 2. 이벤트 전송 ── */
    function attrParams() {
      var o = {};
      if (ft) { o.ft_source = ft.s; o.ft_medium = ft.m; if (ft.c) o.ft_campaign = ft.c; if (ft.ct) o.ft_content = ft.ct; }
      if (lt) { o.lt_source = lt.s; o.lt_medium = lt.m; if (lt.c) o.lt_campaign = lt.c; if (lt.ct) o.lt_content = lt.ct; }
      return o;
    }
    function send(name, extra) {
      try {
        var p = attrParams(), k;
        if (extra) for (k in extra) if (extra[k] !== '' && extra[k] != null) p[k] = extra[k];
        p.transport_type = 'beacon';
        if (typeof window.gtag === 'function') window.gtag('event', name, p);
        if (window.dataLayer && window.dataLayer.push) {
          var dl = { event: name }; for (k in p) dl[k] = p[k];
          window.dataLayer.push(dl);
        }
      } catch (e) {}
    }

    /* ── 3. 결제 인텐트 포착 (네이버페이 iframe → wrapper capture-phase) ── */
    var lastFire = 0;
    function payIntent(kind) {
      var t = Date.now();
      if (t - lastFire < 1200) return; // 디바운스
      lastFire = t;
      // product_no: 쿼리(?product_no=) 우선, 없으면 SEO 경로(/product/<슬러그>/<no>/)에서 추출
      // (pdp_track.js와 동일 규칙 — 금액 삼각측량은 product_no가 있어야 조인되므로 커버리지 확보)
      var m = location.search.match(/[?&]product_no=(\d+)/) ||
              location.pathname.match(/\/product\/[^\/]+\/(\d+)(?:\/|$)/);
      var pno = m ? m[1] : '';
      send(kind === 'npay' ? 'np_checkout_start' : 'kp_checkout_start', { product_no: pno });
      /* ── 결제 이탈 직전 소재 인텐트 서버 비콘 (2026-07-11) ── */
      try {
        var cp = attrParams();
        cp.guid = getGuid(); cp.kind = kind; cp.product_no = pno; cp.ts = t;
        var amt = checkoutAmount();
        if (amt > 0) cp.amount = amt;
        addGaIds(cp);   // 결제창 이동 직전 = GA4 쿠키가 아직 우리 도메인에 살아있는 유일한 시점
        beaconPost(DASH + '/api/preorder/checkout_intent', cp);
      } catch (e) { /* 확장 격리 */ }
    }
    function bindPay() {
      try {
        var i, els;
        els = document.querySelectorAll('.npay_btn_item, #NPAY_BUTTON_BOX');
        for (i = 0; i < els.length; i++) {
          if (els[i].__fitAttr) continue;
          els[i].__fitAttr = 1;
          els[i].addEventListener('mousedown', function () { payIntent('npay'); }, true);
          els[i].addEventListener('touchstart', function () { payIntent('npay'); }, true);
        }
        els = document.querySelectorAll('.__checkout_btn_comm, a[href*="paymethod=kakaopay"]');
        for (i = 0; i < els.length; i++) {
          if (els[i].__fitAttr) continue;
          els[i].__fitAttr = 1;
          els[i].addEventListener('mousedown', function () { payIntent('kpay'); }, true);
          els[i].addEventListener('touchstart', function () { payIntent('kpay'); }, true);
        }
      } catch (e) {}
    }

    /* ── 4. 주문완료 페이지 → order_id 정밀 조인 ── */
    function orderAttr() {
      try {
        if (!/order_result/.test(location.pathname)) return;
        var oid = '';
        try {
          var d = (window.CAFE24 && window.CAFE24.FRONT_EXTERNAL_SCRIPT_VARIABLE_DATA) ||
                  window.EC_FRONT_EXTERNAL_SCRIPT_VARIABLE_DATA || {};
          oid = d.order_id || '';
        } catch (e) {}
        if (!oid) { var m = location.search.match(/order_id=([0-9\-]+)/); if (m) oid = m[1]; }
        if (!oid) { var mm = (document.body.innerText || '').match(/\d{8}-\d{7}/); if (mm) oid = mm[0]; }
        if (!oid) return;
        var sent = [];
        try { sent = JSON.parse(LS.getItem(K_OA) || '[]'); } catch (e) {}
        if (sent.indexOf(oid) > -1) return; // 새로고침 중복 방지
        send('order_attr', { order_id: oid });
        /* ── L2b: 자사 서버 직기록 비콘 (GA4 유실 백업·추정→실측, 2026-07-10) ──
         * fire-and-forget: 404/서버다운이어도 페이지·GA4 경로 무영향.
         * text/plain = CORS simple request(프리플라이트 없음). PII 없음.
         * guid(2026-07-11): checkout_intent 비콘과 조인해 소재(content) 실측 승격용. */
        try {
          var bp = attrParams();
          bp.order_id = oid; bp.ts = NOW; bp.guid = getGuid();
          addGaIds(bp);   // order_id↔cid 직결(가장 확실한 티어) — 도달률은 낮지만 오매칭 0
          beaconPost(DASH + '/api/preorder/order_attr', bp);
        } catch (e) { /* 확장 격리 */ }
        sent.push(oid);
        save(K_OA, sent.slice(-20));
      } catch (e) {}
    }

    /* ── 부트스트랩: 네이버페이 버튼은 비동기 렌더 → 재바인딩 ── */
    function boot() {
      bindPay();
      setTimeout(bindPay, 1500);
      setTimeout(bindPay, 4000);
      setTimeout(orderAttr, 600);
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else { boot(); }
  } catch (e) { /* 전체 격리 — 어떤 오류도 페이지에 영향 없음 */ }
})();
