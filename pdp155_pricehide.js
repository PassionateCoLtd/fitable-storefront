/* pdp155_pricehide.js — product_no=155 (와이드 풀업바 전용 풀업 밴드) 가격 표시 정리.
   1) 155 자기 상세: 스킨 공통 커스텀 가격블록(.price-wr: 소비자가/할인가/할인율, 값 깨짐) 숨김.
   2) 어느 상세든 "추가상품(크로스셀)" 위젯에 155가 끼면, 그 항목의 할인판매가(.salePrice, 중복가격)
      만 숨겨 판매가(12,900원) 하나만 노출. ※ 155의 즉시할인은 그대로 유지(표시만 정리).
   표준 판매가(.xans-product-detaildesign)는 유지. 다른 상품/항목 영향 0(155 가드).
   롤백=ScriptTag DELETE. 2026-06-30 대표 지시("155만, 할인 유지하고 가격 하나만"). */
(function () {
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
      var n = document.querySelectorAll('.price-wr');
      for (var i = 0; i < n.length; i++) { n[i].style.display = 'none'; }
    }
    hideAddon155SalePrice();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
  setTimeout(run, 800);
  setTimeout(run, 2000);
})();
