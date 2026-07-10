/* attr_capture.js — 퍼스트파티 어트리뷰션 박제 + 결제 인텐트 포착 (측정 전용·화면 무변경)
 * 목적: 네이버페이/카카오 인앱 결제로 유실되는 유입 소스를 localStorage에 박제해
 *       결제 직전 이벤트(np/kp_checkout_start)와 주문완료(order_attr)에 파라미터로 복원.
 * 이벤트: np_checkout_start / kp_checkout_start / order_attr
 * 파라미터: ft_source/ft_medium/ft_campaign (최초유입), lt_source/lt_medium/lt_campaign (최종유입),
 *          product_no, order_id — 전부 GA4 event-scoped custom dimension 등록됨 (2026-07-02)
 *          + ft_content/lt_content (utm_content={{ad.name}} 소재 단위, 2026-07-06 등록) — 소재별 취소율/순ROAS용
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
      var m = location.search.match(/product_no=(\d+)/);
      send(kind === 'npay' ? 'np_checkout_start' : 'kp_checkout_start',
        { product_no: m ? m[1] : '' });
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
         * text/plain = CORS simple request(프리플라이트 없음). PII 없음. */
        try {
          var bp = attrParams();
          bp.order_id = oid; bp.ts = NOW;
          var bu = 'https://fitable-dashboard.ngrok.app/api/preorder/order_attr';
          var bb = JSON.stringify(bp), bok = false;
          if (navigator.sendBeacon) {
            try { bok = navigator.sendBeacon(bu, new Blob([bb], { type: 'text/plain' })); } catch (e) {}
          }
          if (!bok && window.fetch) {
            try { fetch(bu, { method: 'POST', body: bb, keepalive: true, mode: 'no-cors',
                              headers: { 'Content-Type': 'text/plain' } }); } catch (e) {}
          }
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
