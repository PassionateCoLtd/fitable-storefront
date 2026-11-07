/* v2: actual payment selection / submit attempt, separately. GA4 only, no customer fields.
 * A new order-form load is a new attempt; never suppress another order by amount/item fingerprint.
 * add_payment_info = method selected (or unchanged default submitted); checkout_submit = button attempt.
 * Neither means payment succeeded. Purchase stays with the verified purchase senders.
 */
(function () {
  'use strict';
  try {
    if (!/^(www\.|m\.)?fitablekorea\.com$/.test(location.hostname) ||
        !/^\/order\/orderform(?:\.html)?\/?$/.test(location.pathname) || window.top !== window.self) return;
    if (window.__fitAddPayInfo) return;
    window.__fitAddPayInfo = 2;
    var checkout = 'krco_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
    var lastMethod = null, lastSubmit = 0, seq = 0;
    var methods = /^(cash|card|icash|tcash|naverpay|kakaopay|cell|payco|samsungpay|tosspay)$/;
    function payment(el) {
      if (!el || el.disabled || (el.type === 'radio' && !el.checked)) return null;
      var value = String(el.value || '').toLowerCase();
      return methods.test(value) ? value : null;
    }
    function currentMethod() {
      return payment(document.querySelector('input[name="addr_paymethod"]:checked, select[name="addr_paymethod"]'));
    }
    function payload(pm, source) {
      var p = {send_to: 'G-V7D156FCFX', transport_type: 'beacon', currency: 'KRW',
        checkout_id: checkout, event_id: checkout + '_' + (++seq), payment_type: pm,
        action_source: source, tracking_version: 'kr_behavior_v2'};
      var el = document.querySelector('#total_order_sale_price_view, #total_order_price');
      var text = el && String(el.textContent || '').replace(/[\s,원₩]/g, '');
      if (text && /^\d+(\.\d+)?$/.test(text)) p.value = Number(text);
      var dl = window.dataLayer || [];
      for (var i = dl.length - 1; i >= 0; i--) {
        var e = dl[i];
        if (e && e.event === 'begin_checkout2' && e.ecommerce && e.ecommerce.items) {
          p.items = e.ecommerce.items; break;
        }
      }
      return p;
    }
    function send(name, pm, source) {
      if (!pm || typeof window.gtag !== 'function') return false;
      try { window.gtag('event', name, payload(pm, source)); return true; } catch (e) { return false; }
    }
    function selected(pm, source) {
      if (pm && pm !== lastMethod && send('add_payment_info', pm, source)) lastMethod = pm;
    }
    document.addEventListener('change', function (e) {
      var t = e.target;
      if (!t || t.name !== 'addr_paymethod' || !(t.type === 'radio' || t.tagName === 'SELECT')) return;
      selected(payment(t), 'selection');
    }, true);
    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest && e.target.closest('#btn_payment, #ec-shop_btn_layer_payment');
      if (!t) return;
      var pm = currentMethod(), now = Date.now();
      selected(pm, 'submit_default');
      if (now - lastSubmit >= 1000 && send('checkout_submit', pm, 'button_attempt')) lastSubmit = now;
    }, true);
  } catch (e) { /* Telemetry must never block checkout. */ }
})();
