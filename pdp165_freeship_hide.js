/* pdp165_freeship_hide.js — product_no=165 ([사전예약] 핏에이블 오브제 와이드 풀업바
   (톡체크아웃 고객 전용)) 상세에서만 스킨 내장 무료배송 프로그레스 바(.free_delivery)를 숨김.
   배경(2026-07-31): 126과 동일한 사전예약/톡체크아웃 전용 상품으로, 무료배송 진행바
   ("20,200원 더 구매하면 무료배송!")가 노출되면 사전예약 단일구매 고객에게 혼선을 줌.
   pdp126_freeship_hide.js와 동일 패턴(대표 지시로 126에 이미 적용된 전례)을 165에 적용.
   범위: 165 자기 상세에서만(가드). 타 상품 영향 0. 스킨 자체는 안 건드림.
   방식: DOM display:none — 스킨 JS가 늦게/재렌더해도 잡도록 반복 실행 + MutationObserver.
   롤백: ScriptTag DELETE 1콜. 전체 try/catch 격리. */
(function () {
  'use strict';
  function on165() {
    var mm = location.search.match(/[?&]product_no=(\d+)/) ||
             location.pathname.match(/\/product\/[^\/]+\/(\d+)(?:\/|$)/);
    return mm && mm[1] === '165';
  }
  function hide() {
    try {
      if (!on165()) return;
      var n = document.querySelectorAll('.free_delivery');
      for (var i = 0; i < n.length; i++) {
        if (n[i].style.display !== 'none') n[i].style.display = 'none';
      }
    } catch (e) {}
  }
  try {
    if (!on165()) return;
    if (document.readyState === 'loading')
      document.addEventListener('DOMContentLoaded', hide);
    else hide();
    hide();
    setTimeout(hide, 400);
    setTimeout(hide, 1200);
    setTimeout(hide, 2500);
    try {
      var mo = new MutationObserver(function () { hide(); });
      mo.observe(document.body, { childList: true, subtree: true });
      setTimeout(function () { try { mo.disconnect(); } catch (e) {} }, 8000);
    } catch (e) {}
  } catch (e) {}
})();
