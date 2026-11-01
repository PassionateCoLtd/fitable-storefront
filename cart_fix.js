/* cart_fix.js v2 (2026-11-01) — 한국몰 상세 화면 «담기 1번 = add_to_cart 1건».
   v1(2026-06-05)은 «장바구니» 클릭 순간 gtag('event','add_to_cart') 를 직접 쐈고, GTM 태그 33 도
   야무진초아 add_to_cart2(담기 통신 응답) 로 한 번 더 쏴서 담기 1번에 2건이 나갔다(11/1 실측).
   두 경로 다 수량·금액이 틀렸다: v1 은 숨은 기본 수량칸(늘 1)·추가구성상품 빠짐,
   add_to_cart2 는 줄 합계(단가×수량)를 단가 자리에 넣어 수량 2 면 금액이 4배, 바로구매에도 2번 발화.
   v2: 실제 담기 요청 본문(selected_item[]=수량||품목코드, selected_add_item[]=수량||품목코드||상품번호…)과
       화면의 품목 단가표(option_stock_data·add_option_data)를 품목코드로 짝지어 한 번만 만든다.
     · 「장바구니」 클릭 = 담기 시도 1개(ID). 시도 1개에 담기 성공 응답 1번만 보낸다(atc_id = 시도 ID).
     · 바로구매·네이버페이·카카오페이 클릭 뒤의 담기 통신은 담기로 세지 않는다(is_direct_buy=T 도 제외).
     · 응답이 실패(result≠0)면 안 보낸다. 품목 단가를 1:1 로 못 맞추면 금액(value)을 비운다(틀린 금액보다 빈칸).
     · 전송은 dataLayer 'fit_add_to_cart' → 우리 GTM(GTM-P99J83LM) 태그 33 이 GA4 로 보낸다(사내 접속 차단이 걸리게).
   begin_checkout(바로구매 클릭)은 v1 과 똑같이 둔다(이번 수정 범위 밖).
   되돌리기 = 스크립트태그 src 를 옛 커밋 cdeafa5 로(DELETE→POST). */
(function () {
  if (window.__fitableCartFix) return; window.__fitableCartFix = 2;
  var WIN_MS = 15000;
  var att = null;      /* 담기 시도 {id, ts, kind:'cart'|'buy'|'pay', used} */

  /* ── v1 그대로: 바로구매 클릭 begin_checkout ── */
  function lastEcom() {
    try { var dl = window.dataLayer || [];
      for (var i = dl.length - 1; i >= 0; i--) { var e = dl[i];
        if (e && e.ecommerce && e.ecommerce.items && e.ecommerce.items.length) return e.ecommerce; } } catch (e) {}
    return null;
  }
  function qty() {
    try { var q = document.querySelector('input[name="quantity"],#quantity,.quantity input,input.quantity');
      var n = q ? parseInt((q.value || '1').replace(/[^0-9]/g, ''), 10) : 1; return n > 0 ? n : 1; } catch (e) { return 1; }
  }
  function fireBegin() {
    if (typeof window.gtag !== 'function') return false;
    var ec = lastEcom(); var q = qty();
    var items = (ec && ec.items) ? ec.items.map(function (it) {
      return { item_id: it.item_id, item_name: it.item_name, price: (it.price || ec.value), quantity: q }; }) : [];
    var val = (ec && ec.value ? ec.value : 0) * q;
    window.gtag('event', 'begin_checkout', { currency: (ec && ec.currency) || 'KRW', value: val, items: items,
      send_to: 'G-V7D156FCFX', transport_type: 'beacon' });
    return true;
  }

  /* ── 담기 시도 ── */
  function rid(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function mark(kind) { att = { id: rid('kra_'), ts: Date.now(), kind: kind, used: false }; }
  var PAY_SEL = '.npay_btn_item, .npay_btn_link, [id^="NPAY_"], .__checkout_btn_comm, [class*="kakaopay"], [class*="naverpay"]';
  function onClick(ev) {
    try {
      var t = ev.target; if (!t || !t.closest) return;
      var el = t.closest('[onclick]'); var oc = el ? (el.getAttribute('onclick') || '') : '';
      if (/product_submit\(\s*2\s*,/.test(oc)) { mark('cart'); return; }
      if (/product_submit\(\s*1\s*,/.test(oc)) { mark('buy'); if (ev.type === 'click') fireBegin(); return; }
      if (t.closest(PAY_SEL)) mark('pay');
    } catch (e) {}
  }

  /* ── 요청 본문 읽기 ── */
  function dec(s) { try { return decodeURIComponent(String(s).replace(/\+/g, ' ')); } catch (e) { return String(s); } }
  function bodyStr(b) {
    if (typeof b === 'string') return b;
    try {
      if (typeof URLSearchParams !== 'undefined' && b instanceof URLSearchParams) return b.toString();
      if (typeof FormData !== 'undefined' && b instanceof FormData) {
        var u = []; b.forEach(function (v, k) { if (typeof v === 'string') u.push(encodeURIComponent(k) + '=' + encodeURIComponent(v)); }); return u.join('&');
      }
    } catch (e) {}
    return null;
  }
  function parseBody(s) {
    if (!s) return null;
    var r = { sel: [], add: [], f: {} };
    s.split('&').forEach(function (kv) {
      if (!kv) return; var i = kv.indexOf('='); var k = dec(i < 0 ? kv : kv.slice(0, i)), v = dec(i < 0 ? '' : kv.slice(i + 1));
      if (/^selected_item\[\d*\]$/.test(k)) r.sel.push(v);
      else if (/^selected_add_item\[\d*\]$/.test(k)) r.add.push(v);
      else if (!(k in r.f)) r.f[k] = v;
    });
    return r;
  }
  function pj(x) { if (x && typeof x === 'object') return x; try { return JSON.parse(x); } catch (e) { return null; } }
  function num(v) { if (v === undefined || v === null || v === '') return null; var n = Number(String(v).replace(/[\s,]/g, '')); return isFinite(n) ? n : null; }

  /* 품목코드 → 단가(option_price: 옵션 추가금 포함 판매가)·옵션 이름 */
  function build(r) {
    var pno = String(r.f.product_no || window.iProductNo || '');
    var name = r.f.product_name || window.product_name || '';
    var cat = (window.iCategoryNo !== undefined && window.iCategoryNo !== null) ? String(window.iCategoryNo) : undefined;
    var main = pj(window.option_stock_data) || {};
    var addAll = pj(window.add_option_data) || {};
    var items = [], ok = true;
    function push(id, nm, q, price, variant, category) {
      var it = { item_id: id, item_name: nm, quantity: q };
      if (price !== null) it.price = price; else ok = false;
      if (variant) it.item_variant = variant;
      if (category !== undefined) it.item_category = category;
      items.push(it);
    }
    if (r.sel.length) {
      r.sel.forEach(function (s) {
        var p = s.split('||'); var q = parseInt(p[0], 10), code = p[1] || '';
        if (!(q > 0)) { ok = false; return; }
        var o = main[code]; var price = o ? num(o.option_price) : null;
        if (price === null && r.f.has_option === 'F') price = num(r.f.product_price);
        push(pno, name, q, price, o && o.option_value ? String(o.option_value) : '', cat);
      });
    } else {
      var q0 = parseInt(r.f.quantity, 10);
      if (!(q0 > 0)) return null;
      var keys = Object.keys(main);
      var price0 = keys.length === 1 ? num(main[keys[0]].option_price) : null;     /* 품목이 하나뿐일 때만 그 단가 */
      if (price0 === null && r.f.has_option === 'F') price0 = num(r.f.product_price);
      push(pno, name, q0, price0, '', cat);
    }
    r.add.forEach(function (s) {
      var p = s.split('||'); var q = parseInt(p[0], 10), code = p[1] || '', apno = String(p[2] || '');
      if (!(q > 0) || !apno) { ok = false; return; }
      var a = addAll[apno] || {}; var ao = pj(a.option_stock_data) || {}; var o = ao[code];
      var price = o ? num(o.option_price) : null;
      push(apno, a.product_name || p[6] || '', q, price, o && o.option_value ? String(o.option_value) : '', undefined);
    });
    if (!items.length) return null;
    var value = 0; items.forEach(function (it) { value += (it.price || 0) * it.quantity; });
    return { items: items, value: ok ? Math.round(value * 100) / 100 : null };
  }

  /* 요청 1건 판정: 담기 요청이면 시도를 잡는다(시도 1개 = 1건) */
  function claim(s) {
    var r = parseBody(s); if (!r || r.f.command !== 'add' || r.f.is_direct_buy === 'T') return null;
    var t = Date.now(), a = att;
    if (a && t - a.ts < WIN_MS) {
      if (a.kind !== 'cart' || a.used) return null;      /* 바로구매·간편결제 뒤 담기 통신, 또는 이미 보낸 시도 */
    } else {
      a = att = { id: rid('kra_r'), ts: t, kind: 'cart', used: false };   /* 클릭을 못 본 담기(다른 버튼) — 요청 기준 1건 */
    }
    a.used = true;
    return { a: a, r: r };
  }
  function done(c, ok) {
    if (!c) return;
    if (!ok) { c.a.used = false; return; }               /* 실패 응답 = 안 보냄, 같은 시도로 다시 담으면 그때 1건 */
    var b = build(c.r); if (!b) return;
    var ec = { currency: 'KRW', items: b.items }; if (b.value !== null) ec.value = b.value;
    try {
      var dl = window.dataLayer = window.dataLayer || [];
      dl.push({ ecommerce: null });
      dl.push({ event: 'fit_add_to_cart', fit_atc_id: c.a.id, ecommerce: ec });
    } catch (e) {}
  }
  function okResp(status, text) {
    if (!(status >= 200 && status < 300)) return false;
    var j = pj(text); if (!j) return true;              /* JSON 아님(예전 형식) = 성공 응답으로 본다 */
    return j.result === undefined || String(j.result) === '0';
  }
  var BASKET = /\/exec\/front\/order\/basket\/?(\?|$)/;

  /* XHR 훅 */
  try {
    var X = XMLHttpRequest.prototype, oOpen = X.open, oSend = X.send;
    X.open = function (m, u) { try { this.__fitUrl = String(u || ''); } catch (e) {} return oOpen.apply(this, arguments); };
    X.send = function (body) {
      try {
        if (BASKET.test(this.__fitUrl || '')) {
          var c = claim(bodyStr(body));
          if (c) { var x = this; x.addEventListener('loadend', function () { var txt = ''; try { txt = x.responseText; } catch (e) {} done(c, okResp(x.status, txt)); }); }
        }
      } catch (e) {}
      return oSend.apply(this, arguments);
    };
  } catch (e) {}
  /* fetch 훅(카페24가 바꿀 때 대비) */
  try {
    if (typeof window.fetch === 'function') {
      var oFetch = window.fetch;
      window.fetch = function (input, init) {
        var c = null;
        try { var u = typeof input === 'string' ? input : (input && input.url) || '';
          if (BASKET.test(u) && init && init.body) c = claim(bodyStr(init.body)); } catch (e) {}
        var pr = oFetch.apply(this, arguments);
        if (c) { try { pr.then(function (res) { return res.clone().text().then(function (t) { done(c, okResp(res.status, t)); }); }, function () { done(c, false); }); } catch (e) {} }
        return pr;
      };
    }
  } catch (e) {}

  function hook() {
    document.addEventListener('click', onClick, true);
    document.addEventListener('mousedown', function (ev) { try { if (ev.target && ev.target.closest && ev.target.closest(PAY_SEL)) mark('pay'); } catch (e) {} }, true);
    document.addEventListener('touchstart', function (ev) { try { if (ev.target && ev.target.closest && ev.target.closest(PAY_SEL)) mark('pay'); } catch (e) {} }, true);
  }
  if (document.readyState !== 'loading') hook(); else document.addEventListener('DOMContentLoaded', hook);
  /* 시험용 노출(동작에 영향 없음) */
  window.__fitCartFix = { parseBody: parseBody, build: build, claim: claim, okResp: okResp };
})();
