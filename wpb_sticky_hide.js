/*
 * wpb_sticky_hide.js — 126 상세에서 하단 고정(스티키) 구매바 숨김 (PC·모바일 둘 다)
 * 배경: 2026-07-15 새 자사몰 스킨 배포 시 모바일 폴딩 화면과 기존 스티키 CTA가 겹쳐 오류.
 *       배포 직전 PC·모바일 스티키 CTA를 함께 제거하기 위한 CSS 숨김 주입. (대표 지시)
 *       - PC 스티키(#pc-sticky-cta, pdp_pc_sticky_cta.js)는 별도로 ScriptTag DELETE 처리하나,
 *         혹시 잔존/캐시 대비 여기서도 함께 숨겨 이중 안전.
 *       - 모바일 스티키(.fixed-wr)는 스킨 내장 요소 → CSS display:none 로만 제거 가능.
 * 안전: 프론트에서 해당 DOM만 숨김. 서버/신청/DB 통신 없음. try/catch 격리. 126에서만 동작.
 * 롤백: 이 ScriptTag DELETE 1콜.
 * 2026-07-15
 */
(function(){
  if (window.__wpbStickyHide) return; window.__wpbStickyHide = 1;
  try {
    // ── 대상 상품번호 (와이드풀업바 WPB01=126). ──
    var TARGETS = ['126'];

    var path = location.pathname, qs = location.search;
    var isTarget = TARGETS.some(function(no){
      return new RegExp('/' + no + '/').test(path) ||
             new RegExp('[?&]product_no=' + no + '(&|$)').test(qs);
    });
    if (!isTarget) return;

    // 스킨 리페인트보다 먼저 먹도록 <style> 규칙으로 강제 숨김
    var css = '.fixed-wr{display:none !important;} #pc-sticky-cta{display:none !important;}';
    var st = document.createElement('style');
    st.id = 'wpb-sticky-hide-style';
    st.appendChild(document.createTextNode(css));
    (document.head || document.documentElement).appendChild(st);

    // 인라인 style 우선순위/동적 렌더 대비 폴링 백업
    var SEL = '.fixed-wr, #pc-sticky-cta';
    var kill = function(){
      try { document.querySelectorAll(SEL).forEach(function(e){ e.style.display = 'none'; }); } catch(e){}
    };
    var n = 0, iv = setInterval(function(){ kill(); if (++n > 50) clearInterval(iv); }, 150);
    if (document.readyState !== 'loading') kill();
    document.addEventListener('DOMContentLoaded', kill);
  } catch(e){}
})();
