/*FJPTRK*/
/* 핏에이블 JP(fitablejp.com · Wix) 측정 전용. 무수술=화면 미변경, 리스너만.
   GA4(G-1SCGQRMJYL / property 511369990 Fitable_Japan) 익명 커스텀 이벤트.
   전송=dataLayer.push → GTM(GTM-W2H92G8X)의 'GA4 | CE | jp01_pdp' 포워딩 태그가 GA4로 중계
   (이중계수 방지를 위해 스크립트에서 gtag 직접호출은 하지 않음. 포워딩 태그가 정본).
   이벤트 prefix = jp01_pdp_*. 스크롤 깊이는 GA4 Data API가 미등록 param을 못 읽으므로
   '이벤트 이름'에 인코딩(jp01_pdp_scroll_25/50/75/100). 이미지/섹션/화면/클릭은 param.
   KR pdp_track.js의 Wix 이식판. 롤백=GTM Custom HTML 태그 pause 또는 이전 SHA 되돌리기. */
(function () {
  if (window.__fjptrk) return; window.__fjptrk = 1;
  // 메인 LP(루트)에서만 측정. 로더가 All Pages라 faq/aboutus/stepmill 등에서도 실행되는데,
  // 거기서 view가 발화하면 퍼널 분모가 사이트 전체 PV로 오염됨(KR CONFIG 게이트 등가).
  // 다른 상세 페이지 추가 시 이 화이트리스트만 넓히면 됨(단 img_idx는 페이지별 DOM순서라
  // 페이지를 섞으면 이미지 맵이 혼동 → 페이지 추가 시 페이지 구분 차원 필요).
  if ((location.pathname.replace(/\/+$/, '') || '/') !== '/') return;
  var PFX = 'jp01';

  // 모든 추적 param 키. 이벤트마다 자기 것만 싣고 나머지는 비운다 — GTM dataLayer는 푸시를
  // 병합 보존하므로, 안 비우면 직전 이벤트의 click_url/img_idx 등이 다음 이벤트(view/scroll 등)에
  // 묻어 GA4 커스텀측정기준이 오염됨. GTM DLV(setDefaultValue=false)는 undefined면 param 생략.
  var PARAM_KEYS = ['img_idx', 'img_label', 'sec_idx', 'sec_label', 'pdp_screen',
                    'click_text', 'click_url', 'click_id', 'click_label'];
  // dataLayer 단일 경로. params는 최상위 키로 푸시(GTM Data Layer 변수가 읽음).
  function ev(suffix, params) {
    try {
      var name = PFX + '_pdp_' + suffix;
      var base = {};
      for (var i = 0; i < PARAM_KEYS.length; i++) base[PARAM_KEYS[i]] = undefined;
      (window.dataLayer = window.dataLayer || []).push(
        Object.assign(base, { event: name }, params || {}));
    } catch (e) {}
  }

  // 1) 진입(분모)
  ev('view');

  // ── 공통 라벨러: 파일명 컨벤션 없는 Wix에서 이미지/섹션을 사람이 읽을 이름으로 ──
  //    alt/aria-label → wixstatic 미디어 해시(/media/<hash>~mv2) → 조상 comp-id → null
  function labelOf(el) {
    try {
      var a = (el.getAttribute && (el.getAttribute('alt') || el.getAttribute('aria-label')) || '').trim();
      if (a) return a.slice(0, 60);
      var s = el.currentSrc || el.src || (el.getAttribute && el.getAttribute('srcset')) || '';
      if (!s && el.style && el.style.backgroundImage) s = el.style.backgroundImage;
      var m = s.match(/\/media\/([a-z0-9_]+)~mv2/i);
      if (m) return m[1];
      var c = el.closest && el.closest('[id^="comp-"]');
      if (c) return c.id;
    } catch (e) {}
    return null;
  }

  // ── 도달(view)+체류(dwell 3초 연속) 레이어 팩토리 ──
  //    엘리먼트별 고유 uid로 idx/라벨/가시카운트 관리(이미지·섹션 레이어 완전 분리).
  var __uid = 0;
  function uidOf(el) { return el.__fjpUid || (el.__fjpUid = ++__uid); }
  function makeLayer(viewSuffix, dwellSuffix, idxKey, labelKey) {
    if (!('IntersectionObserver' in window)) return { observe: function () {} };
    var seen = {}, dwelled = {}, timer = {}, vis = {}, idxMap = {}, labMap = {}, n = 0;
    var io = new IntersectionObserver(function (es) {
      for (var i = 0; i < es.length; i++) {
        var en = es[i], u = uidOf(en.target), idx = idxMap[u];
        if (!idx) continue;
        var prev = vis[u] || 0;
        var now = Math.max(0, prev + (en.isIntersecting ? 1 : -1));
        vis[u] = now;
        var p = {}; p[idxKey] = idx; p[labelKey] = labMap[u] || ('idx_' + idx);
        if (en.isIntersecting && !seen[u]) { seen[u] = 1; ev(viewSuffix, p); }
        if (prev === 0 && now > 0 && !dwelled[u] && !timer[u]) {
          timer[u] = setTimeout((function (k, pp) {
            return function () { if (!dwelled[k]) { dwelled[k] = 1; ev(dwellSuffix, pp); } };
          })(u, p), 3000);
        } else if (prev > 0 && now === 0 && timer[u]) {
          clearTimeout(timer[u]); timer[u] = null;
        }
      }
    }, { threshold: 0.3 });
    return {
      observe: function (el, label) {
        var u = uidOf(el); if (idxMap[u]) return;   // 1회만 부여(idx=DOM순서)
        idxMap[u] = ++n; labMap[u] = label; io.observe(el);
      }
    };
  }

  // 2) 이미지 단위 도달/체류 — "어떤 이미지에서 이탈" 핵심 (img_idx 1..N = DOM 순서)
  var imgLayer = makeLayer('img_view', 'img_dwell', 'img_idx', 'img_label');
  // 3) 섹션 단위 도달/체류 — CSS 배경이미지 섹션까지 커버 (Wix .wixui-section 14개)
  var secLayer = makeLayer('sec_view', 'sec_dwell', 'sec_idx', 'sec_label');
  function scan() {
    try {
      var imgs = document.getElementsByTagName('img');
      for (var i = 0; i < imgs.length; i++) imgLayer.observe(imgs[i], labelOf(imgs[i]));
      var secs = document.querySelectorAll('section[data-block-level-container], .wixui-section');
      for (var j = 0; j < secs.length; j++) secLayer.observe(secs[j], secs[j].id || null);
    } catch (e) {}
  }
  function start() {
    scan();
    try {
      // Wix hydration/lazy 주입분 포착 후 30초 뒤 정리(과다 관찰 방지)
      var mo = new MutationObserver(scan);
      mo.observe(document.body, { childList: true, subtree: true,
        attributes: true, attributeFilter: ['src', 'srcset', 'style'] });
      setTimeout(function () { try { mo.disconnect(); scan(); } catch (e) {} }, 30000);
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  // 4) 스크롤 깊이 25/50/75/100 (window 스크롤 — Wix 일반 흐름 확인됨)
  var hit = {};
  function onScroll() {
    var de = document.documentElement, b = document.body;
    var top = window.pageYOffset || de.scrollTop || (b && b.scrollTop) || 0;
    var max = Math.max(b ? b.scrollHeight : 0, de.scrollHeight) - window.innerHeight;
    if (max <= 0) return;
    var pct = Math.round(top / max * 100);
    [25, 50, 75, 100].forEach(function (d) { if (!hit[d] && pct >= d) { hit[d] = 1; ev('scroll_' + d); } });
  }

  // 5) 화면(뷰포트) 단위 깊이 — 이미지 무관, 순수 위치 기준 폴백.
  //    화면 idx = floor(scrollTop/뷰포트높이)+1. 도달=1회, 체류=3초+ 연속.
  var scrSeen = {}, scrDwell = {}, scrCur = null, scrTimer = null;
  function scrVH() { return window.innerHeight || document.documentElement.clientHeight || 760; }
  function scrTop() { return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0; }
  function scrOnChange() {
    var idx = Math.floor(scrTop() / scrVH()) + 1;
    if (idx === scrCur) return;
    scrCur = idx;
    if (!scrSeen[idx]) { scrSeen[idx] = 1; ev('screen_view', { pdp_screen: idx }); }
    if (scrTimer) { clearTimeout(scrTimer); scrTimer = null; }
    scrTimer = setTimeout(function () {
      if (scrCur === idx && !scrDwell[idx]) { scrDwell[idx] = 1; ev('screen_dwell', { pdp_screen: idx }); }
    }, 3000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scrOnChange);
  else scrOnChange();

  // 스크롤 핸들러(4·5 공유, rAF 스로틀, passive)
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { try { onScroll(); scrOnChange(); } catch (e) {} ticking = false; });
  }, { passive: true });

  // 6) 클릭 — "클릭되는 모든 것" + 핵심 CTA 위치별 명명. 캡처단계 위임, 실클릭(isTrusted)만.
  function txt(el) {
    try {
      var t = (el.getAttribute && el.getAttribute('aria-label')) || el.textContent ||
              (el.getAttribute && el.getAttribute('alt')) || '';
      return (t || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    } catch (e) { return ''; }
  }
  function isOutbound(href) {
    try { var u = new URL(href, location.href); return u.host && u.host !== location.host && /^https?:/.test(u.protocol); }
    catch (e) { return false; }
  }
  function pointerAncestor(t) {
    try { for (var n = t; n && n !== document.body; n = n.parentElement) { if (getComputedStyle(n).cursor === 'pointer') return n; } }
    catch (e) {} return null;
  }
  function deriveLabel(el, text, href) {
    try {
      if (href) { var u = new URL(href, location.href);
        return (u.host === location.host ? ('nav:' + u.pathname) : ('out:' + u.host)).slice(0, 60); }
    } catch (e) {}
    if (text) return text;
    if (el.id) return (el.tagName.toLowerCase() + '#' + el.id).slice(0, 60);
    return el.tagName ? el.tagName.toLowerCase() : 'el';
  }
  var firedCTA = {};
  function ctaOnce(suffix, p) { if (firedCTA[suffix]) return; firedCTA[suffix] = 1; ev(suffix, p || {}); }

  document.addEventListener('click', function (e) {
    if (!e.isTrusted) return;
    var t = e.target; if (!t || !t.closest) return;
    var el = t.closest('a,button,[role="button"],input[type="submit"],input[type="button"],[onclick],.wixui-button,[data-testid="linkElement"]')
          || pointerAncestor(t);
    if (!el) return;
    var text = txt(el);
    var href = el.tagName === 'A' ? (el.getAttribute('href') || '') : '';
    var id = el.id || '';
    var lab = deriveLabel(el, text, href);

    // 핵심 CTA(위치별, 1회) — 사전예약/통知/외부 펀딩/내비
    try {
      if ((el.closest && el.closest('form[aria-label="makuake_OPB1"]')) ||
          /通知を受け取る|先行登録|事前登録/.test(text)) ctaOnce('cta_register', { click_label: 'register' });
      if (/makuake\.com/i.test(href)) ctaOnce('cta_makuake', { click_url: href, click_label: 'makuake' });
      else if (/camp-?fire\.jp/i.test(href)) ctaOnce('cta_campfire', { click_url: href, click_label: 'campfire' });
      else if (href && isOutbound(href)) ev('cta_outbound', { click_url: href, click_label: lab });
      if (el.getAttribute && el.getAttribute('data-testid') === 'linkElement' && href) {
        var navm = href.match(/\/(faq|aboutus|stepmill|stepmillpro)\b/i);
        if (navm) ev('nav', { click_label: navm[1].toLowerCase() });
      }
    } catch (err) {}

    // 모든 클릭(범용)
    ev('click', { click_text: text, click_url: href, click_id: id, click_label: lab });
  }, true);

  // 7) 폼 제출(이메일 사전예약) — Enter 제출까지 포착. 입력값은 절대 읽지 않음(PII 금지).
  document.addEventListener('submit', function (e) {
    if (!e.isTrusted) return;
    try {
      var f = e.target;
      if (f && f.matches && (f.matches('form[aria-label="makuake_OPB1"]') || f.querySelector('input[type="email"]')))
        ctaOnce('form_submit', { click_label: 'makuake_OPB1' });
    } catch (err) {}
  }, true);
})();
/*ENDFJPTRK*/
