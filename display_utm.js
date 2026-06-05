/*
 * display_utm.js — 메인 상품진열(product_listmain) 클릭에 utm 부여 (소스측·PDP 무관)
 * 배경: 메인 상품진열 링크는 Cafe24가 icid만 달아(utm 없음) 그 유입 신청이 "추적 안됨"으로 샌다.
 * 방식: ★PDP가 아니라 진열이 있는 페이지(홈/MAIN)에서, 클릭 전에 링크 href에 utm을 미리 박는다.
 *       → 클릭 시 PDP에 utm이 URL에 박힌 채 착지(광고 유입과 동일) = 카카오 신청 정상.
 *       (replaceState/PDP 스크립트 일절 없음 = 신청 경로 안 건드림)
 * 안전: <a> href만 보강. utm_source 이미 있으면(광고) 패스. try/catch 격리.
 * 2026-06-05
 */
(function () {
  try {
    if (window.__displayUtm) return; window.__displayUtm = 1;
    function tag() {
      document.querySelectorAll('a[name^="anchorBoxName"], a[href*="icid=MAIN.product_listmain"]').forEach(function (a) {
        var href = a.getAttribute('href') || ''; if (!href) return;
        if (/utm_source=/.test(href)) return;                       // 이미 utm(광고 등) → 패스
        if (!/icid=MAIN\.product_listmain/.test(href)) return;       // 메인 상품진열만
        var sep = href.indexOf('?') >= 0 ? '&' : '?';
        a.setAttribute('href', href + sep + 'utm_source=onsite&utm_medium=product_list&utm_campaign=main_listmain');
      });
    }
    var n = 0, iv = setInterval(function () { tag(); if (++n > 40) clearInterval(iv); }, 200);
    if (document.readyState !== 'loading') tag();
    document.addEventListener('DOMContentLoaded', tag);
  } catch (e) {}
})();
