/* pdp155_pricehide.js — product_no=155 (와이드 풀업바 전용 풀업 밴드) 상세에서만
   스킨 공통 커스텀 가격블록(.price-wr: 소비자가/할인가/할인율)을 숨긴다.
   155는 이 블록 값이 깨져 보임(소비자가 0원·할인가 12,800·00%)이고 바로 밑에 표준
   판매가(12,900원)가 정상 노출되므로 윗 블록만 제거. 다른 상품 영향 0(155 가드).
   표준 판매가(.xans-product-detaildesign)는 유지. 롤백=ScriptTag DELETE.
   2026-06-30 대표 지시("155만 숨김"). */
(function () {
  var mm = location.search.match(/[?&]product_no=(\d+)/) ||
           location.pathname.match(/\/product\/[^\/]+\/(\d+)(?:\/|$)/);
  if (!mm || mm[1] !== '155') return;
  function hide() {
    var n = document.querySelectorAll('.price-wr');
    for (var i = 0; i < n.length; i++) { n[i].style.display = 'none'; }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hide);
  else hide();
  setTimeout(hide, 800);
  setTimeout(hide, 2000);
})();
