/* addproduct_toggle_fix.js — 상품상세 「추가상품」 토글 클릭 시 나던 JS 에러 제거.
 *
 * 배경(2026-08-27 규명): 카페24 «기본» 번들 JS(optimizer.php 내 liveAddProduct)는
 *   EC$(this).find('img') 로 토글 안의 아이콘 <img> 를 찾아 src 의 '_close.' <-> '_open.' 을
 *   맞바꾼다. 그런데 2026-07-15 새 커스텀 스킨이 토글 마크업을 이미지에서 <span> 화살표로
 *   교체 → find('img') 가 비고 attr('src') 가 undefined → .replace() 에서 매 클릭마다
 *   TypeError: Cannot read properties of undefined (reading 'replace').
 *   번들은 카페24 소유라 못 고친다. 그래서 «번들이 기대하는 img» 를 마크업에 되돌려준다.
 *
 * 실측 피해: 클릭 1회 = 에러 1건. 자사몰 error-click 이 6월 월 5건 → 7·8월 월 1,400~1,900건으로
 *   폭증한 주범이고, 이 소음이 Clarity 에러 감시를 통째로 무력화해 다른 진짜 버그
 *   (카테고리 iProductNo)가 6주간 묻혔다. 기능 자체는 토글이 먼저 실행돼 정상 동작한다
 *   — 즉 «고객이 못 쓰는» 문제가 아니라 «계측이 안 보이는» 문제다. 과장 금지.
 *
 * 방식: img 가 없는 .toggle 에만 1x1 투명 GIF(data URI)를 display:none 으로 심는다.
 *   src 에 '_close.' 를 프래그먼트로 달아 번들의 replace() 가 정상 동작하게 한다.
 *   네트워크 요청 0, 레이아웃 영향 0, 이벤트 흐름 미개입(스킨 핸들러 그대로 둔다).
 * 범위: 추가상품 토글에 img 가 없을 때만. 원래 마크업(img 있음) 페이지는 손대지 않음.
 * 멱등: 이미 우리 img 가 있으면 skip. 롤백: ScriptTag DELETE 1콜. 전체 try/catch 격리.
 */
(function () {
  'use strict';
  if (window.__addProdToggleFix) return;
  window.__addProdToggleFix = 1;

  var PX = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  var SRC = PX + '#_close.gif';   // 번들이 '_close.' -> '_open.' 으로 바꿔치기할 표식

  function patch() {
    try {
      var toggles = document.querySelectorAll('.xans-product-addproduct .toggle');
      for (var i = 0; i < toggles.length; i++) {
        var t = toggles[i];
        if (t.querySelector('img')) continue;      // 원래 마크업 — 건드리지 않는다
        var img = document.createElement('img');
        img.src = SRC;
        img.alt = '';
        img.setAttribute('aria-hidden', 'true');
        img.setAttribute('data-fit-toggle-fix', '1');
        img.style.display = 'none';
        t.appendChild(img);
      }
    } catch (e) {}
  }

  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', patch);
    } else {
      patch();
    }
    patch();
    setTimeout(patch, 500);
    setTimeout(patch, 1500);
    setTimeout(patch, 3000);
    // 추가상품 영역이 늦게 렌더되는 경우 대비 — 8초만 관찰하고 끊는다
    try {
      var mo = new MutationObserver(function () { patch(); });
      mo.observe(document.body, { childList: true, subtree: true });
      setTimeout(function () { try { mo.disconnect(); } catch (e) {} }, 8000);
    } catch (e) {}
  } catch (e) {}
})();
