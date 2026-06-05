/*
 * banner_utm.js — 메인 배너 클릭에 utm 부여 (내부유입 추적 보강)
 * 배경: 메인 이미지 배너(/web/banner/*) 링크는 icid가 없는 경우가 많아(WPB 배너만 icid 있음)
 *       클릭 유입이 "추적 안됨"으로 샌다. 클릭 전 source(배너가 있는 페이지)에서 링크에 utm을 박는다.
 * 규칙: 이미 utm_source/icid 있으면 패스(중복·광고 보호). 외부링크 제외. utm_medium=banner, campaign=배너파일명.
 * 안전: <a> href만 보강(DOM 구조/서버/DB 무관). try/catch 격리.
 * 2026-06-05
 */
(function () {
  try {
    if (window.__bannerUtm) return; window.__bannerUtm = 1;
    function tag() {
      document.querySelectorAll('a').forEach(function (a) {
        var img = a.querySelector('img'); if (!img) return;
        var src = img.getAttribute('src') || ''; if (!/\/web\/banner\//.test(src)) return;
        var href = a.getAttribute('href') || ''; if (!href) return;
        if (/utm_source=/.test(href) || /icid=/.test(href)) return;          // 이미 추적 있으면 패스
        if (/^https?:/.test(href) && !/fitablekorea\.com/.test(href)) return; // 외부링크 제외
        var name = (src.split('/').pop() || 'banner').replace(/\.[a-z0-9]+$/i, '').replace(/[^A-Za-z0-9_.\-]/g, '_').slice(0, 40);
        var sep = href.indexOf('?') >= 0 ? '&' : '?';
        a.setAttribute('href', href + sep + 'utm_source=onsite&utm_medium=banner&utm_campaign=' + name);
      });
    }
    var n = 0, iv = setInterval(function () { tag(); if (++n > 40) clearInterval(iv); }, 200);
    if (document.readyState !== 'loading') tag();
    document.addEventListener('DOMContentLoaded', tag);
  } catch (e) {}
})();
