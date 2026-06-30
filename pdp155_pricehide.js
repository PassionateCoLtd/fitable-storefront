/* pdp155_pricehide.js — product_no=155 (와이드 풀업바 전용 풀업 밴드) 상세 정리.
   155 자기 상세에서만(가드) 스킨 공통 위젯 숨김:
   1) .price-wr            — 깨진 커스텀 가격블록(소비자가/할인가/할인율).
   2) .detail_custom_event — 이벤트 카운트다운 + "한정수량 / 구매 가능 수량 개"(빈값) 박스.
   3) .now_buy             — "오늘 N명이 주문했어요" 정적 사회적증명.
   + 어느 상세든 "추가상품(크로스셀)" 위젯에 155가 끼면 그 항목의 .salePrice(중복가격)만 숨김.
   표준 판매가(.xans-product-detaildesign)·즉시할인은 유지. 다른 상품 영향 0(155 가드).
   스킨 자체는 안 건드림 → 125 등 타 상품은 위젯 그대로. 롤백=ScriptTag DELETE.
   2026-06-30 대표 지시(155만 깔끔하게: 가격/이벤트/주문수/한정수량 위젯 제거). */
(function () {
  var HIDE = ['.price-wr', '.detail_custom_event', '.now_buy'];
  function onOwnPage155() {
    var mm = location.search.match(/[?&]product_no=(\d+)/) ||
             location.pathname.match(/\/product\/[^\/]+\/(\d+)(?:\/|$)/);
    return mm && mm[1] === '155';
  }
  function hideAddon155SalePrice() {
    var imgs = document.querySelectorAll('#ec-add-product-composed-product-155');
    for (var i = 0; i < imgs.length; i++) {
      var info = imgs[i].closest ? imgs[i].closest('.information') : null;
      if (info) {
        var sp = info.querySelector('.salePrice');
        if (sp) sp.style.display = 'none';
      }
    }
  }
  function run() {
    if (onOwnPage155()) {
      for (var h = 0; h < HIDE.length; h++) {
        var n = document.querySelectorAll(HIDE[h]);
        for (var i = 0; i < n.length; i++) { n[i].style.display = 'none'; }
      }
    }
    hideAddon155SalePrice();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
  setTimeout(run, 800);
  setTimeout(run, 2000);
})();
