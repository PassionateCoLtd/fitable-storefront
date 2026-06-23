/*PDPTRK*/
/* 핏에이블 PDP 측정 전용(무수술=화면 미변경, 리스너만). GA4(G-V7D156FCFX) 익명 커스텀 이벤트.
   product_no→프리픽스 맵에 등록된 상품에서만 동작. 깊이/탭은 GA4 Data API가
   미등록 파라미터를 못 읽으므로 '이벤트 이름'으로 분리(<pfx>_pdp_scroll_25 등).
   롤백=ScriptTag DELETE. 상품 추가=CONFIG에 product_no:프리픽스 한 줄 추가 후 재배포. */
(function () {
  var CONFIG = { '69': 'ab01', '101': 'smp01', '126': 'wpb01' };   // product_no → 이벤트 프리픽스
  // 상품번호: 쿼리(?product_no=) 우선, 없으면 SEO 경로(/product/<슬러그>/<no>/)에서 추출
  var mm = location.search.match(/[?&]product_no=(\d+)/) ||
           location.pathname.match(/\/product\/[^\/]+\/(\d+)(?:\/|$)/);
  var pno = mm && mm[1];
  var PFX = pno && CONFIG[pno];
  if (!PFX) return;
  if (window.__pdptrk === pno) return; window.__pdptrk = pno;

  var GA = 'G-V7D156FCFX';
  function ev(suffix, params) {
    var name = PFX + '_pdp_' + suffix;
    try {
      var p = params || {};
      p.send_to = GA; p.transport_type = 'beacon'; p.pdp_pno = pno;
      if (typeof gtag === 'function') gtag('event', name, p);
      (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: name }, params || {}));
    } catch (e) {}
  }

  // 1) PDP 진입(분모)
  ev('view');

  // 2) 클릭: 구매하기 / 장바구니 / 탭(이름으로 분리)
  var TABMAP = { prdDetail: 'detail', prdReview: 'review', prdQna: 'qna', prdGuide: 'guide' };
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    // WPB(126) 신청 CTA 위치별 클릭 — 무수술 측정. 실클릭(isTrusted)만 집계해 합성클릭 중복 제외
    // (예: #wpb-member-banner a → wpb-show-manual.click() 프로그램 호출). 셀렉터는 126 LP에만 존재.
    if (PFX === 'wpb01' && e.isTrusted) {
      if (t.closest('#wpb-sticky-cta')) { ev('cta_sticky'); return; }
      if (t.closest('#wpb-submit-btn')) { ev('cta_form_submit'); return; }
      if (t.closest('#wpb-show-manual') || t.closest('#wpb-member-banner a')) { ev('cta_form_open'); return; }
      if (t.closest('a[data-ref="pdp_kakao_sync_bottom"]')) { ev('cta_kakao_bottom'); return; }
      if (t.closest('#wpb-kakao-cta')) { ev('cta_kakao_hero'); return; }
    }
    if (t.closest('#actionBuy,#actionBuyClone,#actionBuyCloneFixed,#action_buy_btn,.now_buy')) { ev('buy_click'); return; }
    if (t.closest('#actionCart,#actionCartClone')) { ev('cart_click'); return; }
    var tab = t.closest('a[data-link^="#prd"]');
    if (tab) {
      var key = (tab.getAttribute('data-link') || '').replace('#', '');
      var slug = TABMAP[key] || key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'etc';
      ev('tab_' + slug);
    }
  }, true);

  // 3) 옵션 선택
  document.addEventListener('change', function (e) {
    var s = e.target;
    if (s && s.matches && s.matches('select[option_select_element], select[product_option_area], .prd_option select')) {
      ev('option_select');
    }
  }, true);

  // 4) 스크롤 깊이 25/50/75/100 (저스크롤 가설 검증)
  var hit = {};
  function onScroll() {
    var de = document.documentElement, b = document.body;
    var top = window.pageYOffset || de.scrollTop || b.scrollTop || 0;
    var max = Math.max(b.scrollHeight, de.scrollHeight) - window.innerHeight;
    if (max <= 0) return;
    var pct = Math.round(top / max * 100);
    [25, 50, 75, 100].forEach(function (d) { if (!hit[d] && pct >= d) { hit[d] = 1; ev('scroll_' + d); } });
  }
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { onScroll(); ticking = false; });
  }, { passive: true });

  // 5) 리뷰영역 도달(1회)
  function watchReview() {
    try {
      var rv = document.getElementById('prdReview');
      if (!rv || !('IntersectionObserver' in window)) return;
      var io = new IntersectionObserver(function (es) {
        for (var i = 0; i < es.length; i++) {
          if (es[i].isIntersecting) { ev('review_view'); io.disconnect(); break; }
        }
      }, { threshold: 0.2 });
      io.observe(rv);
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchReview);
  else watchReview();

  // 6) 섹션별 관심(도달+체류) — WPB(126) 본문은 lazy 주입이라 MutationObserver로 신규 이미지 포착.
  //    섹션 = 본문 이미지 파일명 verNNNN/<섹션>-<순번>의 앞자리(1~6). view=도달, dwell=섹션이 3초+ 연속 노출(실관심).
  if (PFX === 'wpb01' && 'IntersectionObserver' in window) {
    try {
      var secSeen = {}, secDwell = {}, secTimer = {}, secVis = {};
      var secOf = function (im) {
        var s = im.currentSrc || im.src || (im.getAttribute && im.getAttribute('ec-data-src')) || '';
        var m = s.match(/ver\d+\/(\d+)-/); return m ? m[1] : null;
      };
      var fireDwell = function (s) { return function () { if (!secDwell[s]) { secDwell[s] = 1; ev('sec' + s + '_dwell'); } }; };
      var secIO = new IntersectionObserver(function (es) {
        for (var i = 0; i < es.length; i++) {
          var en = es[i], sec = en.target.__wsec; if (!sec) continue;
          var prev = secVis[sec] || 0;
          var now = Math.max(0, prev + (en.isIntersecting ? 1 : -1));
          secVis[sec] = now;
          if (en.isIntersecting && !secSeen[sec]) { secSeen[sec] = 1; ev('sec' + sec + '_view'); }
          if (prev === 0 && now > 0 && !secDwell[sec] && !secTimer[sec]) {
            secTimer[sec] = setTimeout(fireDwell(sec), 3000);
          } else if (prev > 0 && now === 0 && secTimer[sec]) {
            clearTimeout(secTimer[sec]); secTimer[sec] = null;
          }
        }
      }, { threshold: 0.3 });
      var scanSec = function () {
        var imgs = document.getElementsByTagName('img');
        for (var i = 0; i < imgs.length; i++) {
          var im = imgs[i]; if (im.__wsecObs) continue;
          var sec = secOf(im); if (!sec) continue;
          im.__wsec = sec; im.__wsecObs = 1; secIO.observe(im);
        }
      };
      scanSec();
      var secMO = new MutationObserver(scanSec);
      secMO.observe(document.body, { childList: true, subtree: true });
      // 본문 lazy 주입 끝나면 MO 정리(과다 관찰 방지) + 마지막 1회 스캔
      setTimeout(function () { try { secMO.disconnect(); scanSec(); } catch (e) {} }, 20000);
    } catch (e) {}
  }
})();
/*ENDPDPTRK*/
