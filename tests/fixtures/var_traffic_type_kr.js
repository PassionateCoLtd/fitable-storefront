function() {
  try {
    /* 검증용 예외 스위치. 🔴 카페24가 상세 주소의 낯선 파라미터를 떨어뜨려서(9/6 실측)
       주소 파라미터만으로는 못 쓴다 → 브라우저에 심는 표식을 «정본»으로 둔다. */
    try { if (localStorage.getItem('fit_track') === '1') return undefined; } catch (e) {}
    var sp = new URLSearchParams(location.search);
    /* 2026-11-01: 한국몰 주소면 쿠키를 .fitablekorea.com 에 둬서 www·m 이 같이 본다(일본 v54 와 같음) */
    var DOM = /(^|\.)fitablekorea\.com$/i.test(location.hostname || '') ? '; domain=.fitablekorea.com' : '';
    if (sp.get('fit_track') === '1') {
      try { localStorage.removeItem('fit_internal'); } catch (e) {}
      document.cookie = 'fit_internal=; Max-Age=0; path=/';
      if (DOM) document.cookie = 'fit_internal=; Max-Age=0; path=/' + DOM;
      return undefined;
    }
    if (sp.get('fit_internal') === '1') {
      try { localStorage.setItem('fit_internal', '1'); } catch (e) {}
      document.cookie = 'fit_internal=1; Max-Age=31536000; path=/' + DOM;   /* www·m 공유 */
    }
    /* 🔴 Aside 는 navigator.webdriver 를 false 로 가린다(9/6 실측) — 브라우저 이름표로 잡는다.
       실측 UA: "... HeadlessChrome/151.0.0.0 Safari/537.36" */
    /* ⚠️ Electron 은 빼둔다 — LINE·Slack 같은 «앱 안 브라우저»가 Electron 이라 진짜 고객을 지울 수 있다 */
    if (/Headless|PhantomJS|Puppeteer|Playwright/i.test(navigator.userAgent || '')) return 'internal';
    if (navigator.webdriver === true) return 'internal';
    try { if (localStorage.getItem('fit_internal') === '1') return 'internal'; } catch (e) {}
    if (/(^|;\s*)fit_internal=1(?:;|$)/.test(document.cookie)) return 'internal';   /* 2026-11-01: \\s 이중 백슬래시 오타 수정 */
  } catch (e) {}
  return undefined;
}