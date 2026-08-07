/* pdp_option_autoselect.js — PDP 필수 옵션에 고를 것이 하나뿐이면 자동 선택.

   왜: 사전예약 상품은 차수별 옵션이 품절로 빠지면서 "선택 가능한 옵션 1개"만 남는데도
   기본값이 미선택이다(예 126 = '출시 기념가 (10000원 할인)' 하나뿐). 고객이 네이버·카카오페이
   「바로구매」를 먼저 누르면 결제창 대신 "필수 옵션을 선택해주세요." 알럿만 뜨고 끝난다.
   2026-08-06 실측: 그 튕김이 하루 58건(간편결제 발화 113건의 51%). 하루 약 60명이 여기서 샌다.
   덤으로 그 튕김이 np/kp_checkout_start 를 발화시켜 리포트의 '결제창 열기'를 두 배로 부풀렸다
   (2026-08-07 규명). 옵션이 자동 선택되면 마찰과 유령 발화가 같이 사라진다.

   🔴 발동 조건은 "선택 가능한 옵션이 정확히 1개"다. 2개 이상이면 손대지 않는다 —
      고객의 선택을 대신하지 않는다. 품절 옵션·구분선·플레이스홀더는 후보에서 뺀다.
   🔴 추가상품(addproduct_option_id_*)은 건드리지 않는다. 그건 안 사도 되는 항목이라
      자동 선택하면 장바구니에 원치 않는 물건이 붙는다. 상품 자체 옵션(product_option_idN)만.

   롤백 = ScriptTag DELETE (또는 src 를 이전 SHA 로 되돌림). DOM 은 select.value 만 만진다.
   2026-08-07. */
(function () {
  var PLACEHOLDER = { '*': 1, '**': 1, '': 1 };   // 안내문·구분선. Cafe24 고정값.
  var SOLDOUT = /품절|sold\s*out/i;
  var RETRY_MS = [0, 300, 800, 1500, 3000];       // 스킨이 옵션을 늦게 그리는 경우 대비
  var done = false;

  function realOptions(sel) {
    var out = [];
    for (var i = 0; i < sel.options.length; i++) {
      var o = sel.options[i];
      if (o.disabled) continue;
      if (PLACEHOLDER[o.value]) continue;
      if (SOLDOUT.test(o.text)) continue;
      out.push(o);
    }
    return out;
  }

  function autoselect() {
    var sels, i, sel, opts, touched = 0;
    try {
      sels = document.querySelectorAll('select[id^="product_option_id"]');
    } catch (e) { return 0; }
    for (i = 0; i < sels.length; i++) {
      sel = sels[i];
      // 이미 고른 상태(사람이 골랐든 우리가 골랐든)면 손대지 않는다.
      if (sel.value && !PLACEHOLDER[sel.value]) continue;
      opts = realOptions(sel);
      if (opts.length !== 1) continue;             // 🔴 정확히 1개일 때만
      try {
        sel.value = opts[0].value;
        // Cafe24 스킨은 change 로 총액·옵션행을 다시 그린다. jQuery 바인딩도 네이티브
        // 이벤트를 받는다(2026-08-07 PC·모바일 실측: 총액이 0 → 69,900원 (1개)로 갱신).
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        touched++;
      } catch (e) { /* 한 셀렉트가 실패해도 나머지는 계속 */ }
    }
    return touched;
  }

  function run() {
    if (done) return;
    if (autoselect() > 0) done = true;
  }

  function schedule() {
    for (var i = 0; i < RETRY_MS.length; i++) {
      (function (ms) { setTimeout(run, ms); })(RETRY_MS[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule);
  } else {
    schedule();
  }
})();
