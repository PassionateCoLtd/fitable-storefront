/*AB01PDPTRK*/
/* AB슬라이드 PDP(product_no=69) 측정 전용 — 화면 무변경(이벤트 리스너만).
   GA4(G-V7D156FCFX)로 익명 커스텀 이벤트 발사. PII 없음. 롤백=ScriptTag DELETE.
   목적: PDP 내부 마이크로 퍼널(옵션선택→스크롤도달→구매클릭)·저스크롤 가설 검증. */
(function () {
  // product_no=69 PDP에서만 동작
  if (!/[?&]product_no=69(?:&|$)/.test(location.search)) return;
  if (window.__ab01trk) return; window.__ab01trk = 1;

  var GA = 'G-V7D156FCFX';
  function ev(name, params) {
    try {
      var p = params || {};
      p.send_to = GA; p.transport_type = 'beacon'; p.ab01_pno = 69;
      if (typeof gtag === 'function') gtag('event', name, p);
      (window.dataLayer = window.dataLayer || []).push(
        Object.assign({ event: name }, params || {})
      );
    } catch (e) {}
  }

  // 1) PDP 진입 마커(분모)
  ev('ab01_pdp_view', {});

  // 2) 클릭: 구매하기 / 장바구니 / 탭
  //  GA4 Data API는 미등록 파라미터를 못 읽으므로 탭/깊이는 '이벤트 이름'으로 분리.
  var TABMAP = { prdDetail: 'detail', prdReview: 'review', prdQna: 'qna', prdGuide: 'guide' };
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('#actionBuy,#actionBuyClone,#actionBuyCloneFixed,#action_buy_btn,.now_buy')) {
      ev('ab01_pdp_buy_click', {});
      return;
    }
    if (t.closest('#actionCart,#actionCartClone')) {
      ev('ab01_pdp_cart_click', {});
      return;
    }
    var tab = t.closest('a[data-link^="#prd"]');
    if (tab) {
      var key = (tab.getAttribute('data-link') || '').replace('#', '');
      var slug = TABMAP[key] || key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'etc';
      ev('ab01_pdp_tab_' + slug, {});
    }
  }, true);

  // 3) 옵션(색상 등) 선택 — 메인/애드온 셀렉트 변경
  document.addEventListener('change', function (e) {
    var s = e.target;
    if (s && s.matches && s.matches('select[option_select_element], select[product_option_area], .prd_option select')) {
      ev('ab01_pdp_option_select', {
        ab01_opt: s.getAttribute('option_title') || 'option',
        ab01_opt_pno: s.getAttribute('option_product_no') || ''
      });
    }
  }, true);

  // 4) 스크롤 깊이 25/50/75/100 — 저스크롤 가설 검증
  var hit = {};
  function onScroll() {
    var de = document.documentElement, b = document.body;
    var top = window.pageYOffset || de.scrollTop || b.scrollTop || 0;
    var max = Math.max(b.scrollHeight, de.scrollHeight) - window.innerHeight;
    if (max <= 0) return;
    var pct = Math.round(top / max * 100);
    [25, 50, 75, 100].forEach(function (m) {
      if (!hit[m] && pct >= m) { hit[m] = 1; ev('ab01_pdp_scroll_' + m, {}); }
    });
  }
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { onScroll(); ticking = false; });
  }, { passive: true });

  // 5) 리뷰 영역 도달(1회)
  function watchReview() {
    try {
      var rv = document.getElementById('prdReview');
      if (!rv || !('IntersectionObserver' in window)) return;
      var io = new IntersectionObserver(function (es) {
        for (var i = 0; i < es.length; i++) {
          if (es[i].isIntersecting) { ev('ab01_pdp_review_view', {}); io.disconnect(); break; }
        }
      }, { threshold: 0.2 });
      io.observe(rv);
    } catch (e) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchReview);
  } else {
    watchReview();
  }
})();
/*ENDAB01PDPTRK*/
