/*
 * wpb_popup_hide.js — 특정 상품 상세페이지에서만 사전예약 멀티팝업(front_popup) 숨김
 * 배경: 사이트 전역 Cafe24 멀티팝업이 광고로 들어온 사용자에게도 떠서 (1) 마찰 (2) 클릭 시
 *       UTM 없는 URL로 이동해 광고 attribution 소실. Cafe24 멀티팝업은 페이지 타겟팅 미지원이라
 *       PRODUCT_DETAIL ScriptTag로 로드 후 대상 상품에서만 팝업을 display:none 처리한다.
 * 안전: 프론트엔드에서 팝업 DOM만 숨김. 서버/신청/DB와 통신 없음. try/catch로 격리.
 * 2026-06-05
 */
(function(){
  if (window.__wpbPopupHide) return; window.__wpbPopupHide = 1;
  try {
    // ── 대상 상품번호 (와이드풀업바 WPB01=126). 125는 검증완료 후 제거. ──
    var TARGETS = ['126'];

    var path = location.pathname, qs = location.search;
    var isTarget = TARGETS.some(function(no){
      return new RegExp('/' + no + '/').test(path) ||
             new RegExp('[?&]product_no=' + no + '(&|$)').test(qs);
    });
    if (!isTarget) return;

    var SEL = '.ec-multi-popup, .ec-multi-popup-inner, .ec-multi-popup-visual, [class*="front_popup"]';
    var kill = function(){
      try {
        document.querySelectorAll(SEL).forEach(function(e){ e.style.display = 'none'; });
      } catch(e){}
    };

    // 멀티팝업은 로드 후 렌더되므로 일정시간 폴링하며 숨김
    var n = 0, iv = setInterval(function(){ kill(); if (++n > 50) clearInterval(iv); }, 150);
    if (document.readyState !== 'loading') kill();
    document.addEventListener('DOMContentLoaded', kill);
  } catch(e){}
})();
