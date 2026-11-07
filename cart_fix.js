/* cart_fix.js v5 (2026-11-07) — 한국몰 상세 화면 «담기 1번 = add_to_cart 1건».
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
   v5: 바로구매 클릭은 buy_click으로 분리. begin_checkout은 실제 주문서 진입만 기록.
   v3(2026-11-01 리뷰 수정):
     · 옵션 없는 추가구성상품(예: 31 스틸 푸쉬업바)은 단가표가 없다 → 요청 품목코드 = add_option_data[상품].item_code 일 때만 product_sale_price.
     · 클릭 없는 담기 요청은 «15초 안 + 상품번호·품목코드 집합이 같을 때»만 하나로 묶는다(일본 v54 와 같은 규칙).
       화면과 다른 상품 요청은 요청의 상품번호·품목코드·수량으로 만들고 금액은 비운다.
     · fetch(Request)·fetch(URL, init)도 읽는다(Request 는 clone 으로, 원래 요청은 건드리지 않고 늦추지 않음).
     · XHR 재사용: 요청마다 붙인 리스너는 끝나면 뗀다. 완료는 «readyState 4 + 같은 세대»일 때 한 번만.
     · 성공은 «JSON 이고 result 가 0 이상인 숫자»일 때만(카페24 basket_result_action 의 aData.result >= 0 과 같음).
       JSON 이 아니거나 result 가 없으면 실패로 본다. responseType=json 이면 response 를 읽는다.
   v4(2026-11-01 2회차 리뷰 수정):
     · 새로 본 「장바구니」 클릭 시도를 «15초 안 같은 요청» 묶기보다 먼저 본다 → 화면과 다른 상품을 15초 안에 두 번 클릭해 담아도 2건(ID 2개).
       클릭 바로 뒤 첫 다른 상품 요청은 요청 기준 ID(클릭 시도는 화면 상품 요청 몫으로 남김, v3 R4 그대로), 같은 요청이 새 클릭 뒤 또 오면 그 클릭 ID.
     · 3회차 리뷰: 클릭 시도를 지나간 다른 상품 요청은 마지막 하나가 아니라 전부 기억(B→C→B 되풀이가 새 담기로 세지던 문제).
       새 클릭 뒤 다른 상품 되풀이 요청은 클릭을 쓰지 않고 요청 기준 1건(클릭은 화면 상품 요청 몫 — 클릭 1번에 다른 상품+화면 상품을 15초 안 두 번 해도 4건).
       다른 상품 요청의 «지나감» 기억·되풀이 판정은 클릭이 이미 화면 상품에 쓰였어도 15초 안 클릭이면 그 클릭 기준. 실패한 요청은 기억에서 뺀다.
     · fetch(new Request(url, {body: FormData})) — 사본의 Content-Type 이 multipart 면 formData() 로 읽는다(원래 요청은 그대로·기다리지 않음).
       XHR·fetch 에 FormData 를 바로 넘기는 경우는 예전부터 bodyStr 로 읽는다.
   되돌리기 = rollback_kr.py(스크립트태그 src 를 직전 커밋으로, POST 확인 → 옛 태그 DELETE). */
(function () {
  if (window.__fitableCartFix) return; window.__fitableCartFix = 5;
  var WIN_MS = 15000;
  var att = null;      /* 담기 시도 {id, ts, kind:'cart'|'buy'|'pay', used} */

  /* 클릭은 성공한 결제 시작이 아니다. 금액/수량을 클릭에서 추정하지 않는다. */
  function fireBegin() {
    if (typeof window.gtag !== 'function') return false;
    window.gtag('event', 'buy_click', { send_to: 'G-V7D156FCFX',
      transport_type: 'beacon', tracking_version: 'kr_behavior_v2',
      product_id: typeof window.iProductNo !== 'undefined' ? String(window.iProductNo) : '' });
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

  function codeOne(c) { return String(c == null ? '' : c).replace(/\s+/g, '').toUpperCase(); }
  /* 요청 식별: 상품번호 + 품목코드 집합(정규화·중복 제거·정렬). 추가구성상품은 «상품번호:품목코드» */
  function reqKey(r) {
    var m = {}, o = [];
    function put(c) { c = codeOne(c); if (c && !m[c]) { m[c] = 1; o.push(c); } }
    r.sel.forEach(function (s) { put(String(s).split('||')[1]); });
    r.add.forEach(function (s) { var p = String(s).split('||'); put((p[2] || '') + ':' + (p[1] || '')); });
    return codeOne(r.f.product_no) + '|' + o.sort().join(',');
  }
  function screenPno() { var v = window.iProductNo; return (v === undefined || v === null) ? '' : codeOne(v); }
  function otherProd(r) { var s = screenPno(), p = codeOne(r.f.product_no); return !!(s && p && s !== p); }
  /* 화면과 다른 상품: 요청의 상품번호·품목코드·수량만. 화면 단가표는 그 상품 것이 아니라 금액은 비운다(틀린 금액보다 빈칸) */
  function buildReqOnly(r) {
    var pno = String(r.f.product_no || ''), nm = r.f.product_name || '', items = [];
    r.sel.forEach(function (s) { var p = s.split('||'), q = parseInt(p[0], 10); if (q > 0) items.push({ item_id: pno, item_name: nm, quantity: q, item_variant: p[1] || '' }); });
    if (!r.sel.length) { var q0 = parseInt(r.f.quantity, 10); items.push({ item_id: pno, item_name: nm, quantity: q0 > 0 ? q0 : 1 }); }
    r.add.forEach(function (s) { var p = s.split('||'), q = parseInt(p[0], 10); if (q > 0 && p[2]) items.push({ item_id: String(p[2]), item_name: p[6] || '', quantity: q, item_variant: p[1] || '' }); });
    return items.length ? { items: items, value: null } : null;
  }

  /* 품목코드 → 단가(option_price: 옵션 추가금 포함 판매가)·옵션 이름 */
  function build(r) {
    if (otherProd(r)) return buildReqOnly(r);
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
      /* 옵션 없는 추가구성상품: 단가표가 없고 품목코드 하나(item_code)뿐 → 같은 코드일 때만 실제 판매가 */
      if (price === null && !o && a.has_option === 'F' && code && codeOne(code) === codeOne(a.item_code)) price = num(a.product_sale_price);
      push(apno, a.product_name || p[6] || '', q, price, o && o.option_value ? String(o.option_value) : '', undefined);
    });
    if (!items.length) return null;
    var value = 0; items.forEach(function (it) { value += (it.price || 0) * it.quantity; });
    return { items: items, value: ok ? Math.round(value * 100) / 100 : null };
  }

  /* 요청 1건 판정: 담기 요청이면 시도를 잡는다(시도 1개 = 1건) */
  var recent = [];   /* 최근 15초 안에 센 요청 {key, ts, c} — 같은 상품번호·품목코드 집합의 되풀이 요청만 묶는다 */
  function claim(s) {
    var r = parseBody(s); if (!r || r.f.command !== 'add' || r.f.is_direct_buy === 'T') return null;
    var t = Date.now(), a = att, key = reqKey(r), other = otherProd(r), so = null;   /* so = 이 요청을 seen 에 적은 클릭 시도(실패하면 지운다) */
    for (var i = recent.length - 1; i >= 0; i--) if (t - recent[i].ts >= WIN_MS) recent.splice(i, 1);
    var fresh = !!(a && t - a.ts < WIN_MS);
    if (fresh && a.kind !== 'cart' && !other) return null;               /* 바로구매·간편결제 클릭 뒤 화면 상품 담기 통신 */
    var freshCart = !!(fresh && a.kind === 'cart'), openCart = freshCart && !a.used;   /* 다른 상품 요청은 클릭을 쓰지 않으므로 freshCart 만, 화면 상품 요청은 openCart */
    if (openCart && !other) a.used = true;                              /* 「장바구니」 클릭 시도에 붙인다 */
    else {
      var dup = false; for (var j = 0; j < recent.length; j++) if (recent[j].key === key) dup = true;
      /* v4: 새 클릭 시도를 «15초 안 같은 요청» 묶기보다 먼저 본다. 같은 요청이 다시 왔어도 그 사이 새 「장바구니」 클릭이 있었으면
         그 클릭의 담기다(화면과 다른 상품을 15초 안에 두 번 클릭 = 2건). 단 그 클릭을 이미 같은 요청이 한 번 거쳐 갔으면(seen, 지나간 요청 전부) 되풀이로 본다. */
      if (dup) {
        if (!other || !freshCart || (a.seen && a.seen[key])) return null;   /* 화면 상품 되풀이(열린 클릭 없음)·새 클릭 없음·이 클릭을 이미 지나간 요청 = 되풀이 */
        so = a; (a.seen || (a.seen = {}))[key] = 1; a = { id: rid('kra_r'), ts: t, kind: 'cart', used: true };   /* 다른 상품 되풀이 = 클릭은 화면 상품 몫으로 남기고 요청 기준 1건 */
      }
      else {
        if (freshCart && other) { so = a; (a.seen || (a.seen = {}))[key] = 1; }      /* 다른 상품 요청이 클릭 시도를 지나감 — 화면 상품 요청 몫으로 남겨 둔다(지나간 요청 전부 기억) */
        a = { id: rid('kra_r'), ts: t, kind: 'cart', used: true };      /* 클릭을 못 본 담기·다른 상품 — 요청 기준 1건(열린 클릭 시도는 그대로) */
      }
    }
    var c = { a: a, r: r, key: key, so: so, fin: false };
    recent.push({ key: key, ts: t, c: c }); if (recent.length > 50) recent.shift();
    return c;
  }
  function done(c, ok) {
    if (!c || c.fin) return; c.fin = true;                 /* 완료 처리는 요청마다 한 번만 */
    if (!ok) {                                             /* 실패 응답 = 안 보냄, 다시 담으면 그때 1건 */
      c.a.used = false;
      if (c.so && c.so.seen) delete c.so.seen[c.key];     /* 실패한 요청은 «클릭을 지나갔다»에서도 뺀다 → 같은 클릭에서 다시 담으면 1건 */
      for (var i = recent.length - 1; i >= 0; i--) if (recent[i].c === c) recent.splice(i, 1);
      return;
    }
    var b = build(c.r); if (!b) return;
    var ec = { currency: 'KRW', items: b.items }; if (b.value !== null) ec.value = b.value;
    try {
      var dl = window.dataLayer = window.dataLayer || [];
      dl.push({ ecommerce: null });
      dl.push({ event: 'fit_add_to_cart', fit_atc_id: c.a.id, ecommerce: ec });
    } catch (e) {}
  }
  /* 카페24 담기 응답 실측(11/1 probe_qty2): {"result":0,"isLogin":"F",...}. 카페24 자기 코드(basket_result_action)도 result >= 0 만 성공.
     같은 상품이 이미 있을 때의 «장바구니에 동일한 상품이 있습니다» 확인은 따로 /exec/front/order/Basketduplicate/ 로 묻고
     ({"result":true}) 확인을 누르면 그때 보통 담기 요청이 나간다 → 확인 요청은 아래 정규식(basket/)에 안 걸린다. */
  function okResp(status, body) {
    if (!(status >= 200 && status < 300)) return false;
    var j = pj(body); if (!j || typeof j !== 'object') return false;     /* JSON 아님·빈 응답 = 성공으로 안 본다 */
    var rs = j.result;
    if (typeof rs === 'number') return isFinite(rs) && rs >= 0;
    if (typeof rs === 'string' && /^\s*-?\d+\s*$/.test(rs)) return Number(rs) >= 0;
    return false;
  }
  function xhrBody(x) {
    try { var rt = x.responseType; if (rt === 'json') return x.response; if (!rt || rt === 'text') return x.responseText; } catch (e) {}
    return null;
  }
  var BASKET = /\/exec\/front\/order\/basket\/?(\?|$)/;

  /* XHR 훅 */
  try {
    var X = XMLHttpRequest.prototype, oOpen = X.open, oSend = X.send;
    X.open = function (m, u) { try { this.__fitUrl = String(u || ''); } catch (e) {} return oOpen.apply(this, arguments); };
    X.send = function (body) {
      var c = null, h = null, x = this, gen = 0;
      function off() { try { x.removeEventListener('readystatechange', h); x.removeEventListener('loadend', h); } catch (e) {} }
      try {
        if (BASKET.test(x.__fitUrl || '')) {
          c = claim(bodyStr(body));
          if (c) {
            /* 요청마다 리스너 한 벌(세대 번호) — 끝나면 뗀다. 같은 XHR 을 다음 요청에 다시 쓰면(onload 안 open 등)
               앞 요청의 늦은 loadend 가 새 요청 리스너를 부르므로, 완료는 «readyState 4 + 같은 세대»일 때만 본다. */
            gen = x.__fitGen = (x.__fitGen || 0) + 1;
            h = function () {
              if (c.fin) { off(); return; }
              if (x.__fitGen !== gen) { off(); done(c, false); return; }   /* 끝을 못 본 채 다음 요청에 재사용됨 = 안 보냄 */
              if (x.readyState !== 4) return;                               /* 아직이거나 앞 요청의 늦은 이벤트 */
              off(); done(c, okResp(x.status, xhrBody(x)));
            };
            x.addEventListener('readystatechange', h); x.addEventListener('loadend', h);
          }
        }
      } catch (e) {}
      try { return oSend.apply(x, arguments); }
      catch (err) { try { if (h) { off(); done(c, false); } } catch (e2) {} throw err; }
    };
  } catch (e) {}
  /* fetch 훅(카페24가 바꿀 때 대비) */
  try {
    if (typeof window.fetch === 'function') {
      var oFetch = window.fetch;
      window.fetch = function (input, init) {
        var c = null, pend = null;
        try {
          var isReq = typeof Request !== 'undefined' && input instanceof Request;
          var u = typeof input === 'string' ? input : isReq ? input.url : (input && typeof input.href === 'string') ? input.href : (input != null ? String(input) : '');
          if (BASKET.test(u)) {
            if (init && init.body != null) c = claim(bodyStr(init.body));            /* init.body 가 Request 본문보다 우선(fetch 규칙) */
            else if (isReq && !input.bodyUsed) {                                     /* Request 본문은 사본으로 읽는다 — 원래 요청은 그대로·기다리지 않고 보낸다 */
              var cl = input.clone(), ct = '';
              try { ct = String((cl.headers && cl.headers.get('content-type')) || ''); } catch (e) {}
              /* multipart(FormData 본문) = 사본을 formData() 로 읽어 같은 글자 꼴로 바꾼다. 그 밖은 text() */
              var rd = (/multipart\/form-data/i.test(ct) && typeof cl.formData === 'function') ? cl.formData().then(bodyStr) : cl.text();
              pend = rd.then(function (t) { return claim(t); }, function () { return null; });
            }
          }
        } catch (e) {}
        var pr = oFetch.apply(this, arguments);
        if (c || pend) {
          try {
            var cp = pend || Promise.resolve(c);
            pr.then(function (res) {
              var rc = null; try { rc = res.clone(); } catch (e) {}                 /* 페이지가 본문을 읽기 전에 사본(우리 then 이 먼저 붙음) */
              cp.then(function (cc) {
                if (!cc) return; if (!rc) { done(cc, false); return; }
                rc.text().then(function (t) { done(cc, okResp(res.status, t)); }, function () { done(cc, false); });
              });
            }, function () { cp.then(function (cc) { if (cc) done(cc, false); }); });
          } catch (e) {}
        }
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
  window.__fitCartFix = { parseBody: parseBody, build: build, claim: claim, done: done, okResp: okResp, reqKey: reqKey };
})();
