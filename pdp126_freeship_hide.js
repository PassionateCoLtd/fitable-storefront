/* pdp126_freeship_hide.js — product_no=126 (오브제 와이드 풀업바) 상세에서만
   새 스킨 내장 무료배송 프로그레스 바(.free_delivery)를 숨김.
   배경(2026-07-15 대표 지시): 새 스킨이 상품상세에 "10만원 이상 구매 시 무료배송 / 40,100원
   더 구매하면 무료배송!" 진행바를 노출 → 사전예약 단일구매 고객이 "배송비 내야 하나" 오인해
   이탈. 게다가 바 기준값이 10만원 하드코딩인데 실제 무료배송 기준은 7만원(free_shipping_price
   =70000)이라 부정확. 126(사전예약)은 아예 제거가 맞다는 판단.
   범위: 126 자기 상세에서만(가드). 타 상품 영향 0. 스킨 자체는 안 건드림.
   방식: DOM display:none (레이아웃 잔여공간 없이) — 스킨 JS가 늦게/재렌더해도 잡도록 반복 실행.
   롤백: ScriptTag DELETE 1콜. 전체 try/catch 격리. */
(function () {
  'use strict';
  function on126() {
    var mm = location.search.match(/[?&]product_no=(\d+)/) ||
             location.pathname.match(/\/product\/[^\/]+\/(\d+)(?:\/|$)/);
    return mm && mm[1] === '126';
  }
  function hide() {
    try {
      if (!on126()) return;
      var n = document.querySelectorAll('.free_delivery');
      for (var i = 0; i < n.length; i++) {
        if (n[i].style.display !== 'none') n[i].style.display = 'none';
      }
    } catch (e) {}
  }
  try {
    if (!on126()) return;
    if (document.readyState === 'loading')
      document.addEventListener('DOMContentLoaded', hide);
    else hide();
    hide();
    setTimeout(hide, 400);
    setTimeout(hide, 1200);
    setTimeout(hide, 2500);
    // 스킨 JS가 바를 뒤늦게 그리거나 다시 채우는 경우 대비 — 상품영역 관찰
    try {
      var mo = new MutationObserver(function () { hide(); });
      mo.observe(document.body, { childList: true, subtree: true });
      setTimeout(function () { try { mo.disconnect(); } catch (e) {} }, 8000);
    } catch (e) {}
  } catch (e) {}
})();
