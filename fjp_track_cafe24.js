/*FJPTRK-C24*/
/* 핏에이블 일본몰(Cafe24 shop5 · fitablejp.com / m.fitablejp.com) 계측 전용.
   무수술 = 화면 미변경, 리스너만. 전송은 dataLayer.push 단일 경로
   → GTM(GTM-W2H92G8X) 태그가 GA4(G-1SCGQRMJYL / property 511369990)로 중계.
   ⛔ 이 파일은 gtag / fbq 를 절대 직접 호출하지 않는다.
      (한국몰 add_to_cart 3중 발화 사고의 원인이 «여러 소스가 같은 이벤트를 각자 쏜 것»이었다.)

   ── 모듈 A : GA4 이커머스 (한국몰 SEO Head 「GA4 dataLayer by YamujinChoa」의 일본판)
      dataLayer 이벤트명·페이로드 모양을 한국몰과 «글자까지 동일»하게 맞춘다.
        view_item2 / add_to_cart2 / view_cart2 / remove_from_cart2 / begin_checkout2 / purchase2
      다른 점은 currency 가 JPY 라는 것 하나뿐.
   ── 모듈 B : jp01_pdp_* 마이크로 퍼널 (Wix 판 fjp_track.js 의 Cafe24 이식)
      이미지·섹션·화면·영상·클릭·이탈. 저장표 pdp_{img,sec,screen,track}_events_daily_jp 가 그대로 받는다.

   롤백 = GTM 컨테이너 이전 버전 재게시(또는 로더 태그 일시중지).
   2026-09-06 신규.
*/

/* 이 파일은 «일본몰 전용»이다. GTM 컨테이너·트리거로 이미 막혀 있지만, 사고로 다른 몰에
   실려도 아무 일이 없도록 도메인 가드를 하나 더 둔다(한국몰 회귀 0 보장의 마지막 겹). */
var FJP_C24_OK = (function () {
  try { return /(^|\.)fitablejp\.com$/.test(location.hostname) || /\/shop5\//.test(location.pathname); }
  catch (e) { return false; }
})();

/* ══════════════ 모듈 0 — 유입 박제(퍼스트파티 어트리뷰션) ══════════════
   한국몰 attr_capture.js 의 «유입 박제» 부분만 이식한다.
   최초유입(ft_*)과 최종유입(lt_*)을 브라우저에 저장해 두었다가 결제시작·주문완료 이벤트에
   붙인다 — KOMOJU 결제창을 다녀오는 동안 유입정보가 사라져도 「어느 광고가 팔았나」가 남는다.
   🔴 한국몰의 «서버 비콘»(order_attr_beacon)은 이식하지 않았다 — 그건 네이버페이·카카오페이
      «앱 안 브라우저»가 저장값을 날려버리는 문제를 푸는 장치인데, 일본은 그 상황이 없다
      (KOMOJU 는 보통의 페이지 이동이라 저장값이 살아남는다). 자세한 판단은 보고서 참조. */
(function () {
  try {
    if (!FJP_C24_OK) return;
    var LS; try { LS = window.localStorage; } catch (e) { return; }
    var K = 'fjp_attr';
    function refClass() {
      try {
        var r = document.referrer; if (!r) return { source: '(direct)', medium: '(none)' };
        var h = new URL(r).hostname.replace(/^www\./, '');
        var self = (location.hostname || '').replace(/^www\./, '');
        if (self && h === self) return null;
        if (/(^|\.)google\./.test(h)) return { source: 'google', medium: 'organic' };
        if (/(^|\.)yahoo\./.test(h)) return { source: 'yahoo', medium: 'organic' };
        if (/bing\./.test(h)) return { source: 'bing', medium: 'organic' };
        if (/instagram|ig\.me/.test(h)) return { source: 'instagram', medium: 'referral' };
        if (/facebook|(^|\.)fb\.|fb\.me/.test(h)) return { source: 'facebook', medium: 'referral' };
        if (/makuake/.test(h)) return { source: 'makuake', medium: 'referral' };
        if (/camp-?fire\.jp/.test(h)) return { source: 'campfire', medium: 'referral' };
        if (/line\.me|lin\.ee/.test(h)) return { source: 'line', medium: 'referral' };
        if (/t\.co|twitter|x\.com/.test(h)) return { source: 'twitter', medium: 'referral' };
        if (/tiktok/.test(h)) return { source: 'tiktok', medium: 'referral' };
        return { source: h.slice(0, 60), medium: 'referral' };
      } catch (e) { return null; }
    }
    function current() {
      var q = new URLSearchParams(location.search);
      var s = q.get('utm_source'), m = q.get('utm_medium'), c = q.get('utm_campaign'), ct = q.get('utm_content');
      if (s) return { source: s.slice(0,80), medium: (m||'').slice(0,80), campaign: (c||'').slice(0,120), content: (ct||'').slice(0,120) };
      if (q.get('fbclid')) return { source: 'facebook', medium: 'cpc', campaign: '', content: '' };
      if (q.get('gclid')) return { source: 'google', medium: 'cpc', campaign: '', content: '' };
      var r = refClass();
      return r ? { source: r.source, medium: r.medium, campaign: '', content: '' } : null;
    }
    var store = {};
    try { store = JSON.parse(LS.getItem(K) || '{}') || {}; } catch (e) { store = {}; }
    var now = current();
    /* 🔴 몰 안에서 페이지를 옮기면 referrer 가 비어 있는 경우가 있다(주문 흐름은 POST 라 특히).
       그때 (direct) 로 덮으면 «광고로 들어온 사람»이 결제 시점에 직접유입으로 둔갑한다(9/6 실측).
       → 이미 저장된 유입이 있으면 «진짜 새 유입»일 때만 덮는다. */
    if (now && now.source === '(direct)' && store.lt_source) now = null;
    if (now) {
      if (!store.ft_source) {
        store.ft_source = now.source; store.ft_medium = now.medium;
        store.ft_campaign = now.campaign; store.ft_content = now.content;
      }
      store.lt_source = now.source; store.lt_medium = now.medium;
      store.lt_campaign = now.campaign; store.lt_content = now.content;
      try { LS.setItem(K, JSON.stringify(store)); } catch (e) {}
    }
    window.__fjpAttr = function () {
      try { return JSON.parse(LS.getItem(K) || '{}') || {}; } catch (e) { return {}; }
    };
  } catch (e) { window.__fjpAttr = function () { return {}; }; }
})();

/* ══════════════ 모듈 A — GA4 이커머스 ══════════════ */
(function () {
  try {
    if (!FJP_C24_OK) return;
    if (window.__fjpEc) return; window.__fjpEc = 1;

    var CUR = 'JPY';

    function dl() { return (window.dataLayer = window.dataLayer || []); }
    /* 한국몰과 동일: ecommerce 를 먼저 null 로 밀어 직전 이벤트의 items 가 안 묻게 한다 */
    function push(eventType, ecommerceObj, extra) {
      try {
        dl().push({ ecommerce: null });
        var o = { event: eventType, ecommerce: ecommerceObj };
        if (extra) for (var k in extra) if (extra[k] !== undefined && extra[k] !== '') o[k] = extra[k];
        dl().push(o);
      } catch (e) {}
    }
    function attr() { try { return (window.__fjpAttr && window.__fjpAttr()) || {}; } catch (e) { return {}; } }
    function num(v) {
      var n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.\-]/g, ''));
      return isFinite(n) ? n : 0;
    }
    function q(sel, root) { try { return (root || document).querySelector(sel); } catch (e) { return null; } }
    function qa(sel, root) { try { return [].slice.call((root || document).querySelectorAll(sel)); } catch (e) { return []; } }

    /* 상품번호: 쿼리 → SEO 경로(/product/<슬러그>/<no>/) → 카페24 전역 */
    function productNo() {
      var m = location.search.match(/[?&]product_no=(\d+)/) ||
              location.pathname.match(/\/product\/[^\/]+\/(\d+)(?:\/|$)/);
      if (m) return m[1];
      if (typeof window.iProductNo !== 'undefined' && window.iProductNo) return String(window.iProductNo);
      return null;
    }
    function item(id, name, cat, qty, price, variant) {
      return {
        item_id: String(id == null ? '' : id),
        item_name: String(name == null ? '' : name),
        item_category: String(cat == null ? '' : cat),
        quantity: num(qty) || 1,
        price: num(price),
        item_variant: variant == null ? '_' : String(variant)
      };
    }
    function sum(items) {
      var t = 0; for (var i = 0; i < items.length; i++) t += items[i].price * items[i].quantity;
      return t;
    }
    function stripOpt(s) {
      /* 「[オプション: 화이트]」 / 「[옵션: …]」 양쪽 표기 제거 */
      return String(s || '').replace(/^\s*\[[^:\]]*:\s*/, '').replace(/\]\s*$/, '').trim();
    }
    function qty() {
      var el = q('#option_box1_quantity') || q('#quantity') || q('input[name=quantity]');
      var n = el ? num(el.value) : 1;
      return n > 0 ? n : 1;
    }

    /* 직전 페이지에서 «담기»를 눌렀다면 여기서 한 번 보낸다(위 설명 참조) */
    try {
      var _pend = sessionStorage.getItem('fjp_atc_pending');
      if (_pend) {
        sessionStorage.removeItem('fjp_atc_pending');
        var _o = JSON.parse(_pend);
        if (_o && _o.ec && Date.now() - (_o.ts || 0) < 60000) {
          push('add_to_cart2', _o.ec, (window.__fjpAttr && window.__fjpAttr()) || {});
        }
      }
    } catch (e) {}

    var path = location.pathname;
    var isPdp   = /\/product\//.test(path) && !!productNo();
    var isCart  = /\/order\/basket/.test(path);
    var isForm  = /\/order\/orderform/.test(path);
    var isDone  = /\/order\/order_result/.test(path);

    /* ── view_item ─────────────────────────────────────────────── */
    if (isPdp) {
      var pno = productNo();
      var vi = [item(pno,
                     (typeof window.product_name !== 'undefined' ? window.product_name : document.title),
                     (typeof window.iCategoryNo !== 'undefined' ? window.iCategoryNo : ''),
                     qty(),
                     (typeof window.product_price !== 'undefined' ? window.product_price : 0),
                     '_')];
      push('view_item2', { value: sum(vi), currency: CUR, items: vi });

      /* ── add_to_cart : 카페24 담기 ajax(/exec/front/order/basket/) 응답을 훅 ──
         🔴 한국몰 3중 발화 재발 방지 3겹:
            ① 「今すぐ購入」(product_submit(1,…)) 클릭 뒤 1.5초는 담기로 세지 않는다
            ② 같은 페이로드는 2초 안에 한 번만
            ③ XHR·fetch 를 각각 한 번만 감싼다(__fjpHooked) */
      var payFlag = 0, lastSig = '', lastAt = 0;
      document.addEventListener('mousedown', markPay, true);
      document.addEventListener('touchstart', markPay, true);

      /* 🔑 일본몰은 「カートに入れる」가 ajax 가 아니라 «폼 전송»이라 페이지가 통째로 넘어간다.
         그래서 담기 판정은 «클릭»으로 한다 — 메타 AddToCart(GTM 태그 50)와 «같은 판정 조건».
         (실측 2026-09-06: 클릭 후 /order/basket.html 로 이동, XHR 0건) */
      function maybeAtc(e) {
        try {
          if (!e.isTrusted) return;
          var t = e.target; if (!t || !t.closest) return;
          var el = t.closest('a,button,input'); if (!el) return;
          var oc = (el.getAttribute && el.getAttribute('onclick')) || '';
          var cls = (typeof el.className === 'string') ? el.className : '';
          var tx = (el.innerText || el.value || '');
          if (!(/product_submit\s*\(\s*2\s*,/.test(oc) || /(^|\s)cart_btn(\s|$)/.test(cls) ||
                /カートに入れる|カートに追加/.test(tx))) return;
          /* 옵션이 있는데 안 골랐으면 카페24가 담기를 거부한다 → 발화하지 않는다(태그 50 과 동일) */
          var hasOpt = !!q('select[id^=product_option_id], .xans-product-option select');
          if (hasOpt) {
            var tp = q('#totalPrice');
            var txt = tp ? (tp.innerText || tp.textContent || '') : '';
            var mm = txt.match(/[¥￥]\s*([0-9][0-9,]*)/);
            if (!mm || !parseFloat(mm[1].replace(/,/g, ''))) return;
          }
          fireAtc();
        } catch (err) {}
      }
      /* 🔴 click 에서 쏘면 늦다 — 담기는 폼 전송이라 그 순간 페이지가 넘어가고 GA4 전송이 잘린다
         (9/6 실측: 같은 조작인데 어떤 때는 도착하고 어떤 때는 사라졌다).
         눌리는 «순간»(mousedown/touchstart)에 먼저 쏘고, click 은 예비로만 남긴다.
         같은 담기를 두 번 세지 않도록 fireAtc 안의 2초 서명 중복차단이 받아낸다. */
      document.addEventListener('mousedown', maybeAtc, true);
      document.addEventListener('touchstart', maybeAtc, true);
      document.addEventListener('click', maybeAtc, true);
      function markPay(e) {
        try {
          var t = e.target; if (!t || !t.closest) return;
          var el = t.closest('a,button,input'); if (!el) return;
          var oc = (el.getAttribute && el.getAttribute('onclick')) || '';
          var cls = (typeof el.className === 'string') ? el.className : '';
          if (/product_submit\s*\(\s*1\s*,/.test(oc) || /(^|\s)buy_btn(\s|$)/.test(cls) ||
              /npay_btn_item|__checkout_btn_comm/.test(cls)) { payFlag = Date.now(); }
        } catch (err) {}
      }
      /* 🔴 담기를 누르면 «그 자리에서» 페이지가 넘어간다(폼 전송). GA4 는 이벤트를 모아서
         보내기 때문에 그 사이에 전송이 통째로 잘린다(9/6 실측: 같은 조작이 어떤 땐 도착하고
         어떤 땐 사라짐). → 담을 «내용»만 브라우저에 적어두고, «다음 페이지가 열린 뒤»에
         한 번만 보낸다. 페이지가 안 넘어가는 스킨(ajax)이면 1.2초 뒤 그 자리에서 보낸다.
         어느 쪽이든 표식을 지우고 보내므로 두 번 세지 않는다. */
      var PEND = 'fjp_atc_pending';
      function atcPayload() {
        var items = [item(pno,
                          (typeof window.product_name !== 'undefined' ? window.product_name : document.title),
                          (typeof window.iCategoryNo !== 'undefined' ? window.iCategoryNo : ''),
                          qty(),
                          (typeof window.product_price !== 'undefined' ? window.product_price : 0),
                          optionVariant())];
        applyOptionRows(items);
        return { value: sum(items), currency: CUR, items: items };
      }
      function fireAtc() {
        try {
          if (payFlag && Date.now() - payFlag < 1500) return;   /* 즉시구매는 begin_checkout 이 잡는다 */
          var ec = atcPayload();
          var sig = JSON.stringify(ec.items);
          var now = Date.now();
          if (sig === lastSig && now - lastAt < 2000) return;    /* 같은 담기 중복 차단 */
          lastSig = sig; lastAt = now;
          try { sessionStorage.setItem(PEND, JSON.stringify({ ec: ec, ts: now })); } catch (e) {}
          setTimeout(function () {                               /* 페이지가 안 넘어갔으면 여기서 발사 */
            try {
              var raw = sessionStorage.getItem(PEND); if (!raw) return;
              sessionStorage.removeItem(PEND);
              push('add_to_cart2', JSON.parse(raw).ec, attr());
            } catch (e) {}
          }, 1200);
        } catch (e) {}
      }
      function optionVariant() {
        var sel = q('select[id^=product_option_id]');
        if (sel && sel.selectedIndex > 0) return (sel.options[sel.selectedIndex].text || '').trim().slice(0, 80);
        var p = q('tbody.option_products tr.option_product p.product span');
        return p ? (p.textContent || '').trim().slice(0, 80) : '_';
      }
      /* 옵션이 여러 줄이면 줄마다 1 아이템(한국몰 updateOptionFields 와 같은 규칙) */
      function applyOptionRows(items) {
        var rows = qa('tbody.option_products tr.option_product');
        if (!rows.length || !items.length) return;
        var base = items[0], out = [];
        rows.forEach(function (r) {
          var qv = q('input.quantity_opt', r), pv = q('input.option_box_price', r), nv = q('p.product span', r);
          out.push(item(base.item_id, base.item_name, base.item_category,
                        qv ? num(qv.value) || base.quantity : base.quantity,
                        pv ? num(pv.value) || base.price : base.price,
                        nv ? (nv.textContent || '').trim() : base.item_variant));
        });
        qa('tbody.add_products tr.add_product').forEach(function (r) {
          var idv = q('input.add_product_id', r), nv = q('p.product', r),
              qv = q('input.quantity_add', r), pv = q('input.add_product_option_box_price', r);
          out.push(item(idv ? idv.value : '', nv ? (nv.textContent || '').trim() : '', '',
                        qv ? num(qv.value) || 1 : 1, pv ? num(pv.value) : 0,
                        nv ? (nv.textContent || '').trim() : ''));
        });
        items.length = 0; Array.prototype.push.apply(items, out);
      }
      hookBasketXhr(fireAtc);
    }

    /* ── view_cart / remove_from_cart ───────────────────────────── */
    if (isCart) {
      var B = window.aBasketProductData;
      if (B && B.length) {
        var vc = [];
        for (var i = 0; i < B.length; i++) {
          vc.push(item(B[i].product_no, B[i].product_name, B[i].main_cate_no,
                       B[i].quantity, B[i].product_sum_price,
                       stripOpt(B[i].option_str && B[i].option_str[0])));
        }
        push('view_cart2', { value: sum(vc), currency: CUR, items: vc });

        hookBasketXhr(function () {
          try {
            var pfx = window.BASKET_CHK_ID_PREFIX || 'basket_chk_';
            var rm = [];
            qa('[id^="' + pfx + '"]').forEach(function (chk, k) {
              if (chk.checked && B[k]) {
                rm.push(item(B[k].product_no, B[k].product_name, B[k].main_cate_no,
                             B[k].quantity, B[k].product_sum_price,
                             stripOpt(B[k].option_str && B[k].option_str[0])));
              }
            });
            if (rm.length) push('remove_from_cart2', { value: sum(rm), currency: CUR, items: rm });
          } catch (e) {}
        });
      }
    }

    /* ── begin_checkout ────────────────────────────────────────── */
    if (isForm) {
      var O = window.aBasketProductOrderData;
      var bc = [];
      if (O && O.length) {
        for (var j = 0; j < O.length; j++) {
          bc.push(item(O[j].product_no, O[j].product_name, O[j].main_cate_no,
                       O[j].quantity, O[j].product_sum_price,
                       stripOpt(O[j].option_str && O[j].option_str[0])));
        }
      }
      if (bc.length) push('begin_checkout2', { value: sum(bc), currency: CUR, items: bc }, attr());

      /* add_payment_info — 결제수단을 고른 순간(한국몰 addpayinfo.js 등가). 세션 1회. */
      var apiFired = 0;
      function firePayInfo(pt) {
        if (apiFired || !bc.length) return; apiFired = 1;
        push('add_payment_info2', { value: sum(bc), currency: CUR, items: bc, payment_type: pt || '' }, attr());
      }
      document.addEventListener('change', function (e) {
        try {
          if (!e.isTrusted) return;
          var t = e.target; if (!t) return;
          var isPay = (t.name && /paymethod|payment|pay_method|settle/i.test(t.name)) ||
                      (t.id && /paymethod|payment/i.test(t.id)) ||
                      (t.closest && t.closest('[id*=payment], [class*=payment], .xans-order-paymethod'));
          if (!isPay) return;
          var lab = '';
          try {
            if (t.tagName === 'SELECT' && t.selectedIndex >= 0) lab = (t.options[t.selectedIndex].text || '').trim();
            else { var l = t.closest('li,label,tr'); lab = l ? (l.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40) : (t.value || ''); }
          } catch (e2) {}
          firePayInfo(lab);
        } catch (err) {}
      }, true);
    }

    /* ── purchase ──────────────────────────────────────────────── */
    if (isDone) {
      var E = window.EC_FRONT_EXTERNAL_SCRIPT_VARIABLE_DATA || {};
      var op = E.order_product;
      if (op && op.length) {
        var optTexts = [];
        qa('li[title="옵션"] > p.option, li[title="オプション"] > p.option, p.option').forEach(function (p) {
          var t = (p.textContent || '').trim();
          if (/^\s*\[/.test(t)) optTexts.push(stripOpt(t));
        });
        var pi = [], rev = op.slice().reverse();
        rev.forEach(function (p, idx) {
          pi.push(item(p.product_no, p.product_name, p.category_no_3 || p.category_no_2,
                       p.quantity, p.product_price, optTexts[idx] || ''));
        });
        var payEl = q('.pannelArea .ec-base-table span');
        push('purchase2', {
          transaction_id: E.order_id || '',
          value: sum(pi),
          currency: CUR,
          payment_type: payEl ? (payEl.textContent || '').trim() : '',
          items: pi
        }, attr());
      }
    }

    /* 담기/장바구니 ajax 훅 — XHR·fetch 각각 1회만 감싼다 */
    function hookBasketXhr(cb) {
      var HIT = /\/exec\/front\/order\/basket\//;
      try {
        if (!XMLHttpRequest.prototype.__fjpHooked) {
          XMLHttpRequest.prototype.__fjpHooked = 1;
          var send = XMLHttpRequest.prototype.send;
          XMLHttpRequest.prototype.send = function () {
            try {
              this.addEventListener('load', function () {
                try { if (HIT.test(this.responseURL || '')) fanout(); } catch (e) {}
              });
            } catch (e) {}
            return send.apply(this, arguments);
          };
        }
        if (window.fetch && !window.fetch.__fjpHooked) {
          var of = window.fetch;
          var nf = function (input) {
            var u = (typeof input === 'string') ? input : (input && input.url) || '';
            return of.apply(this, arguments).then(function (r) {
              try { if (HIT.test(u) || HIT.test((r && r.url) || '')) fanout(); } catch (e) {}
              return r;
            });
          };
          nf.__fjpHooked = 1; window.fetch = nf;
        }
      } catch (e) {}
      (window.__fjpBasketCbs = window.__fjpBasketCbs || []).push(cb);
      function fanout() {
        (window.__fjpBasketCbs || []).forEach(function (f) { try { f(); } catch (e) {} });
      }
    }
  } catch (e) {}
})();


/* ══════════════ 모듈 B — jp01_pdp_* 마이크로 퍼널 (상세페이지 한정) ══════════════ */
(function () {
  try {
    if (!FJP_C24_OK) return;
    if (window.__fjptrkC24) return; window.__fjptrkC24 = 1;

    /* 상세페이지에서만 — 여기서 view 가 새면 퍼널 분모가 사이트 전체 PV 로 오염된다 */
    var pm = location.search.match(/[?&]product_no=(\d+)/) ||
             location.pathname.match(/\/product\/[^\/]+\/(\d+)(?:\/|$)/);
    var PNO = pm ? pm[1] : (window.iProductNo ? String(window.iProductNo) : null);
    if (!PNO || !/\/product\//.test(location.pathname)) return;

    var PFX = 'jp01';
    var TAG = 'p' + PNO + '|';          /* 라벨 앞에 상품번호 — 상품 3개가 같은 표에 섞여도 갈린다 */

    var PARAM_KEYS = ['img_idx', 'img_label', 'sec_idx', 'sec_label', 'pdp_screen',
                      'click_text', 'click_url', 'click_id', 'click_label',
                      'vid_idx', 'vid_label', 'vid_pct',
                      'exit_max_sec', 'exit_max_img', 'exit_max_screen',
                      'exit_scroll_pct', 'exit_dwell_ms', 'exit_reason',
                      'latency_ms', 'cta_kind', 'rage_count', 'product_no'];

    function ev(suffix, params) {
      try {
        var base = {};
        for (var i = 0; i < PARAM_KEYS.length; i++) base[PARAM_KEYS[i]] = undefined;
        base.product_no = PNO;                 /* 모든 이벤트에 상품번호 */
        (window.dataLayer = window.dataLayer || []).push(
          Object.assign(base, { event: PFX + '_pdp_' + suffix }, params || {}));
      } catch (e) {}
    }

    var T0 = Date.now();
    var MX = { pct: 0, screen: 0, img_idx: 0, sec_idx: 0, vid_idx: 0 };

    ev('view');

    function root() { return document.getElementById('prdDetail') || document.getElementById('contents') || document.body; }

    /* 라벨: alt(9/6 에 80개 심어둠) → 파일명 → 조상 id */
    function labelOf(el) {
      try {
        var a = (el.getAttribute && (el.getAttribute('alt') || el.getAttribute('aria-label')) || '').trim();
        if (a) return (TAG + a).slice(0, 60);
        var s = el.currentSrc || el.src || (el.getAttribute && (el.getAttribute('data-src') || el.getAttribute('srcset'))) || '';
        if (!s && el.style && el.style.backgroundImage) s = el.style.backgroundImage;
        var m = String(s).match(/\/([^\/?#]+)\.(jpg|jpeg|png|gif|webp|mp4)/i);
        if (m) return (TAG + m[1]).slice(0, 60);
        var c = el.closest && el.closest('[id]');
        if (c && c.id) return (TAG + c.id).slice(0, 60);
      } catch (e) {}
      return null;
    }

    var __uid = 0;
    function uidOf(el) { return el.__fjpUid || (el.__fjpUid = ++__uid); }
    function makeLayer(viewSuffix, dwellSuffix, idxKey, labelKey) {
      if (!('IntersectionObserver' in window)) return { observe: function () {} };
      var seen = {}, dwelled = {}, timer = {}, vis = {}, idxMap = {}, labMap = {}, n = 0;
      var io = new IntersectionObserver(function (es) {
        for (var i = 0; i < es.length; i++) {
          var en = es[i], u = uidOf(en.target), idx = idxMap[u];
          if (!idx) continue;
          var prev = vis[u] || 0;
          var now = Math.max(0, prev + (en.isIntersecting ? 1 : -1));
          vis[u] = now;
          var p = {}; p[idxKey] = idx; p[labelKey] = labMap[u] || (TAG + 'idx_' + idx);
          if (en.isIntersecting && idx > (MX[idxKey] || 0)) MX[idxKey] = idx;
          if (en.isIntersecting && !seen[u]) { seen[u] = 1; ev(viewSuffix, p); }
          if (prev === 0 && now > 0 && !dwelled[u] && !timer[u]) {
            timer[u] = setTimeout((function (k, pp) {
              return function () { if (!dwelled[k]) { dwelled[k] = 1; ev(dwellSuffix, pp); } };
            })(u, p), 3000);
          } else if (prev > 0 && now === 0 && timer[u]) {
            clearTimeout(timer[u]); timer[u] = null;
          }
        }
      }, { threshold: 0.3 });
      return {
        observe: function (el, label) {
          var u = uidOf(el); if (idxMap[u]) return;
          idxMap[u] = ++n; labMap[u] = label;
          try { el['__fjp_' + idxKey] = n; el['__fjp_' + labelKey] = label; } catch (e) {}
          io.observe(el);
        }
      };
    }

    var imgLayer = makeLayer('img_view', 'img_dwell', 'img_idx', 'img_label');
    var secLayer = makeLayer('sec_view', 'sec_dwell', 'sec_idx', 'sec_label');
    var vidLayer = makeLayer('vid_view', 'vid_dwell', 'vid_idx', 'vid_label');

    function attachVideo(v) {
      try {
        if (v.__fjpVid) return; v.__fjpVid = 1;
        vidLayer.observe(v, labelOf(v));
        var lab = labelOf(v), ms = { 25: 0, 50: 0, 75: 0, done: 0 }, played = 0;
        function vp(suffix, extra) {
          var p = { vid_idx: v.__fjp_vid_idx || null, vid_label: lab || null };
          if (extra) for (var k in extra) p[k] = extra[k];
          ev(suffix, p);
        }
        v.addEventListener('play', function () { if (played) return; played = 1; vp('vid_play'); }, { passive: true });
        v.addEventListener('timeupdate', function () {
          try {
            var d = v.duration; if (!d || !isFinite(d) || d <= 0) return;
            var pct = v.currentTime / d * 100;
            [25, 50, 75].forEach(function (m) { if (!ms[m] && pct >= m) { ms[m] = 1; vp('vid_progress', { vid_pct: m }); } });
            if (!ms.done && pct >= 95) { ms.done = 1; vp('vid_complete', { vid_pct: 100 }); }
          } catch (e) {}
        }, { passive: true });
        v.addEventListener('ended', function () { if (!ms.done) { ms.done = 1; vp('vid_complete', { vid_pct: 100 }); } }, { passive: true });
      } catch (e) {}
    }

    /* 섹션 = 상세 본문의 «최상위 블록» 중 높이 150px 이상.
       Wix 의 .wixui-section 에 해당하는 카페24 등가물. 셀렉터가 없으므로 높이로 고른다. */
    function sections() {
      var r = root(), out = [];
      try {
        var kids = r.children ? [].slice.call(r.children) : [];
        /* 상세 본문이 래퍼 한 겹에 통째로 들어있는 흔한 모양이면 한 겹 내려간다 */
        if (kids.length === 1 && kids[0].children && kids[0].children.length > 2) kids = [].slice.call(kids[0].children);
        for (var i = 0; i < kids.length; i++) {
          var h = kids[i].offsetHeight || 0;
          if (h >= 150) out.push(kids[i]);
        }
      } catch (e) {}
      return out;
    }

    function scan() {
      try {
        var r = root();
        var imgs = r.getElementsByTagName('img');
        for (var i = 0; i < imgs.length; i++) {
          if ((imgs[i].offsetWidth || 0) < 40) continue;      /* 아이콘·1px 추적픽셀 제외 */
          imgLayer.observe(imgs[i], labelOf(imgs[i]));
        }
        var secs = sections();
        for (var j = 0; j < secs.length; j++) secLayer.observe(secs[j], (TAG + (secs[j].id || ('sec_' + (j + 1)))).slice(0, 60));
        var vids = r.getElementsByTagName('video');
        for (var k = 0; k < vids.length; k++) attachVideo(vids[k]);
      } catch (e) {}
    }

    function start() {
      scan();
      try {
        var mo = new MutationObserver(scan);
        mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'srcset', 'style'] });
        setTimeout(function () { try { mo.disconnect(); scan(); } catch (e) {} }, 30000);
      } catch (e) {}
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();

    /* 스크롤 깊이 25/50/75/100 — GA4 Data API 가 미등록 param 을 못 읽어 이벤트 «이름»에 인코딩 */
    var hit = {};
    function onScroll() {
      var de = document.documentElement, b = document.body;
      var top = window.pageYOffset || de.scrollTop || (b && b.scrollTop) || 0;
      var max = Math.max(b ? b.scrollHeight : 0, de.scrollHeight) - window.innerHeight;
      if (max <= 0) return;
      var pct = Math.round(top / max * 100);
      if (pct > MX.pct) MX.pct = pct;
      [25, 50, 75, 100].forEach(function (d) { if (!hit[d] && pct >= d) { hit[d] = 1; ev('scroll_' + d); } });
    }

    /* 화면(뷰포트) 단위 깊이 — 이미지 무관 폴백 */
    var scrSeen = {}, scrDwell = {}, scrCur = null, scrTimer = null;
    function scrVH() { return window.innerHeight || document.documentElement.clientHeight || 760; }
    function scrTop() { return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0; }
    function scrOnChange() {
      var idx = Math.floor(scrTop() / scrVH()) + 1;
      if (idx === scrCur) return;
      scrCur = idx;
      if (idx > MX.screen) MX.screen = idx;
      if (!scrSeen[idx]) { scrSeen[idx] = 1; ev('screen_view', { pdp_screen: idx }); }
      if (scrTimer) { clearTimeout(scrTimer); scrTimer = null; }
      scrTimer = setTimeout(function () {
        if (scrCur === idx && !scrDwell[idx]) { scrDwell[idx] = 1; ev('screen_dwell', { pdp_screen: idx }); }
      }, 3000);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scrOnChange);
    else scrOnChange();

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () { try { onScroll(); scrOnChange(); } catch (e) {} ticking = false; });
    }, { passive: true });

    /* 클릭 — 모든 클릭 + 핵심 CTA(담기·즉시구매·옵션·탭·리뷰) */
    function txt(el) {
      try {
        var t = (el.getAttribute && el.getAttribute('aria-label')) || el.textContent ||
                (el.getAttribute && el.getAttribute('alt')) || '';
        return (t || '').replace(/\s+/g, ' ').trim().slice(0, 60);
      } catch (e) { return ''; }
    }
    function isOutbound(href) {
      try { var u = new URL(href, location.href); return u.host && u.host !== location.host && /^https?:/.test(u.protocol); }
      catch (e) { return false; }
    }
    function deriveLabel(el, text, href) {
      try {
        if (href) { var u = new URL(href, location.href);
          return (u.host === location.host ? ('nav:' + u.pathname) : ('out:' + u.host)).slice(0, 60); }
      } catch (e) {}
      if (text) return text;
      if (el.id) return (el.tagName.toLowerCase() + '#' + el.id).slice(0, 60);
      return el.tagName ? el.tagName.toLowerCase() : 'el';
    }
    function posCtx(el) {
      var out = { pdp_screen: scrCur || null };
      try {
        var s = null;
        var secs = sections();
        for (var i = secs.length - 1; i >= 0; i--) { if (secs[i].contains && secs[i].contains(el)) { s = secs[i]; break; } }
        if (s && s.__fjp_sec_idx) { out.sec_idx = s.__fjp_sec_idx; out.sec_label = s.__fjp_sec_label || null; }
        var scope = (s && s.querySelectorAll) ? s : root();
        var imgs = scope.querySelectorAll ? scope.querySelectorAll('img') : [];
        for (var qq = imgs.length - 1; qq >= 0; qq--) {
          if (imgs[qq].__fjp_img_idx) { out.img_idx = imgs[qq].__fjp_img_idx; out.img_label = imgs[qq].__fjp_img_label || null; break; }
        }
      } catch (e) {}
      return out;
    }

    var rageBuf = [], rageCool = 0;
    function rageCheck(e, ctx) {
      var now = Date.now(), x = e.clientX || 0, y = e.clientY || 0;
      rageBuf.push({ t: now, x: x, y: y });
      if (rageBuf.length > 12) rageBuf.shift();
      var near = 0;
      for (var i = 0; i < rageBuf.length; i++) {
        var c = rageBuf[i];
        if (now - c.t <= 700 && Math.abs(c.x - x) <= 32 && Math.abs(c.y - y) <= 32) near++;
      }
      if (near >= 3 && now - rageCool > 3000) { rageCool = now; ev('rage_click', Object.assign({ rage_count: near }, ctx || {})); }
    }

    var firedCTA = {};
    function ctaOnce(suffix, p) { if (firedCTA[suffix]) return; firedCTA[suffix] = 1; ev(suffix, p || {}); }

    document.addEventListener('click', function (e) {
      if (!e.isTrusted) return;
      var t = e.target; if (!t || !t.closest) return;
      var el = t.closest('a,button,[role="button"],input[type="submit"],input[type="button"],[onclick],li.tab1,li.tab2,li.tab3,li.tab4');
      if (!el) return;
      var text = txt(el);
      var href = el.tagName === 'A' ? (el.getAttribute('href') || '') : '';
      var id = el.id || '';
      var lab = deriveLabel(el, text, href);
      var ctx = posCtx(el);
      var lat = Date.now() - T0;
      var oc = (el.getAttribute && el.getAttribute('onclick')) || '';
      var cls = (typeof el.className === 'string') ? el.className : '';

      try {
        var kind = '';
        if (/product_submit\s*\(\s*2\s*,/.test(oc) || /(^|\s)cart_btn(\s|$)/.test(cls) || /カートに入れる|カートに追加/.test(text)) {
          kind = 'cart';
          ctaOnce('cta_cart', Object.assign({ click_label: 'cart', latency_ms: lat }, ctx));
        } else if (/product_submit\s*\(\s*1\s*,/.test(oc) || /(^|\s)buy_btn(\s|$)/.test(cls) || /今すぐ購入|購入する/.test(text)) {
          kind = 'buy';
          ctaOnce('cta_buy', Object.assign({ click_label: 'buy', latency_ms: lat }, ctx));
        } else if (href && isOutbound(href)) {
          ev('cta_outbound', Object.assign({ click_url: href, click_label: lab }, ctx));
        }
        var TABLI = { tab1: 'detail', tab2: 'review', tab3: 'qna', tab4: 'guide' };
        for (var tk in TABLI) {
          if (el.classList && el.classList.contains(tk)) { ev('tab_' + TABLI[tk], ctx); break; }
        }
        if (kind) ev('cta_click_all', Object.assign({ cta_kind: kind, click_text: text, latency_ms: lat }, ctx));
      } catch (err) {}

      ev('click', Object.assign({ click_text: text, click_url: href, click_id: id, click_label: lab }, ctx));
      try { rageCheck(e, ctx); } catch (e2) {}
    }, true);

    /* 옵션 선택 — 사람이 고른 것만(스크립트 자동선택 제외) */
    document.addEventListener('change', function (e) {
      if (!e.isTrusted) return;
      var s = e.target;
      try {
        if (s && s.matches && s.matches('select[id^=product_option_id], select[option_select_element], .xans-product-option select')) {
          ev('option_select', { click_text: txt(s.options ? s.options[s.selectedIndex] : s) });
        }
      } catch (err) {}
    }, true);

    /* 리뷰영역 도달(1회) */
    (function () {
      try {
        if (!('IntersectionObserver' in window)) return;
        var tryBind = function () {
          var rv = document.getElementById('prdReview');
          if (!rv) return false;
          var io = new IntersectionObserver(function (es) {
            for (var i = 0; i < es.length; i++) if (es[i].isIntersecting) { ev('review_view'); io.disconnect(); break; }
          }, { threshold: 0.2 });
          io.observe(rv); return true;
        };
        if (!tryBind()) setTimeout(tryBind, 4000);
      } catch (e) {}
    })();

    /* 이탈 스냅샷 */
    var exitArmed = 1;
    function exitSnapshot(reason) {
      if (!exitArmed) return; exitArmed = 0;
      ev('exit', {
        exit_reason: reason,
        exit_max_sec: MX.sec_idx || 0,
        exit_max_img: MX.img_idx || 0,
        exit_max_screen: MX.screen || 0,
        exit_scroll_pct: MX.pct || 0,
        exit_dwell_ms: Date.now() - T0
      });
    }
    document.addEventListener('visibilitychange', function () {
      try {
        if (document.visibilityState === 'hidden') exitSnapshot('hidden');
        else if (document.visibilityState === 'visible') exitArmed = 1;
      } catch (e) {}
    }, true);
    window.addEventListener('pagehide', function () { try { exitSnapshot('pagehide'); } catch (e) {} }, true);
  } catch (e) {}
})();


/* ══════════════ 모듈 D — GA4 user_id (한국몰 userid.js 이식) ══════════════
   로그인 회원의 카페24 «암호화된 회원식별값»을 한 번 더 해시해 GA4 user_id 로 세팅.
   기기를 바꿔가며 산 사람이 두 사람으로 세지는 것을 막는다.
   ⛔ 원본 값은 어디에도 남기지 않는다(콘솔·저장소·dataLayer 전부). 이벤트도 쏘지 않는다. */
(function () {
  try {
    if (!FJP_C24_OK) return;
    if (window.__fjpUid1) return; window.__fjpUid1 = 1;
    function raw() {
      try {
        var a = (window.CAFE24 && window.CAFE24.FRONT_EXTERNAL_SCRIPT_VARIABLE_DATA) ||
                window.EC_FRONT_EXTERNAL_SCRIPT_VARIABLE_DATA ||
                window.FRONT_EXTERNAL_SCRIPT_VARIABLE_DATA || {};
        return String(a.common_member_id_crypt || '');
      } catch (e) { return ''; }
    }
    function go() {
      var v = raw();
      if (!v) return;                        /* 비회원 = 아무것도 안 함 */
      if (!(window.crypto && window.crypto.subtle)) return;
      window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)).then(function (b) {
        try {
          var h = Array.prototype.map.call(new Uint8Array(b), function (x) {
            return ('0' + x.toString(16)).slice(-2); }).join('');
          if (typeof window.gtag === 'function') window.gtag('set', { user_id: h });
        } catch (e) {}
      }).catch(function () {});
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
    else go();
    setTimeout(go, 3000);                    /* 카페24 전역이 늦게 채워지는 화면 대비 */
  } catch (e) {}
})();
