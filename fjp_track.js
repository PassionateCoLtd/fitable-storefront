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

// ── 8) 마쿠아케 리드 소재 어트리뷰션 비콘 (2026-07-13) ──
//   목적: '어떤 광고소재(utm_content)로 온 유저가 실제 리드(폼제출)까지 갔나'를 first-party로 복원.
//   그라운드트루스=Wix Form Submissions API. 여기선 이메일해시→소재 매핑만 쏘고, 서버 리컨실이
//   Wix 실제 제출과 '이메일 exact 조인'해야 리드로 승격(오탐 비콘은 Wix에 없으면 자동 폐기).
//   T0 실측 반영: wixEmbedsAPI.getVisitorId 미노출·svSession 없음 → 이메일 단독 조인.
//   native submit 이벤트 불신뢰(GA4 form_submit=0 실증) → '通知を受け取る 클릭 + 이메일유효'를 트리거.
//   전 구간 try/catch·기존 §1~7 무수정. 롤백=이 블록 삭제 후 재배포.
(function () {
  var LS, CFT = 'fit_creative', CFB = 'fit_fbclid', CSENT = 'fit_jp_lead_sent';
  var BEACON = 'https://fitable-dashboard.ngrok.app/api/preorder/jp_lead_attr';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  try { LS = window.localStorage; } catch (e) { return; }
  // (a) 소재 영속화(last-touch): URL에 utm_content 있으면 최신값으로 갱신(전환 귀속=마지막 클릭광고).
  //     내부이동으로 파라미터 유실돼도 localStorage가 유지 → 제출시 마지막 광고소재 보존.
  //     ★유입소스 상세(2026-07-14): 전체 UTM·클릭ID·referrer 분류까지 잡아 '오가닉/직접'의 진짜 경로 규명.
  //     referrer 원문 저장 안 함(PII/타사쿼리 방지) — hostname 분류 라벨만.
  function refClass() {
    try {
      var r = document.referrer; if (!r) return 'direct';
      var h = new URL(r).hostname.replace(/^www\./, '');
      var self = (location.hostname || '').replace(/^www\./, '');
      if (self && h === self) return '';                 // 내부이동 → 기존값 보존(덮어쓰기 안 함)
      if (/(^|\.)google\./.test(h)) return 'google';
      if (/(^|\.)yahoo\./.test(h) || /search\.yahoo/.test(h)) return 'yahoo';
      if (/instagram|ig\.me/.test(h)) return 'instagram';
      if (/facebook|(^|\.)fb\.|fb\.me/.test(h)) return 'facebook';
      if (/makuake/.test(h)) return 'makuake';
      if (/t\.co|twitter|x\.com/.test(h)) return 'twitter';
      if (/bing\./.test(h)) return 'bing';
      if (/line\.me|lin\.ee/.test(h)) return 'line';
      if (/tiktok/.test(h)) return 'tiktok';
      return 'other:' + h.slice(0, 40);
    } catch (e) { return ''; }
  }
  try {
    var q = new URLSearchParams(location.search);
    var ct = q.get('utm_content'), fb = q.get('fbclid');
    if (ct) LS.setItem(CFT, ct.slice(0, 120));
    if (fb) LS.setItem(CFB, fb.slice(0, 256));
    // 전체 UTM + gclid(last-touch)
    var UM = { fit_us: 'utm_source', fit_um: 'utm_medium', fit_uc: 'utm_campaign', fit_ut: 'utm_term', fit_gc: 'gclid' };
    for (var mk in UM) { var mv = q.get(UM[mk]); if (mv) LS.setItem(mk, mv.slice(0, 120)); }
    // 기타 매체 클릭ID(야후JP yclid 등) 묶음
    var CX = ['msclkid', 'ttclid', 'yclid', 'li_fat_id'], ext = [];
    for (var ci = 0; ci < CX.length; ci++) { var cv = q.get(CX[ci]); if (cv) ext.push(CX[ci] + ':' + cv.slice(0, 60)); }
    if (ext.length) LS.setItem('fit_cx', ext.join('|').slice(0, 120));
    // referrer 분류: 외부 referrer=last-touch 갱신. 'direct'는 알려진 값 없을 때만(외부소스 안 덮음).
    // 내부이동('')은 아무것도 안 함. ft=최초 1회.
    var rc = refClass();
    if (rc === 'direct') {
      if (!LS.getItem('fit_rc')) LS.setItem('fit_rc', 'direct');
      if (!LS.getItem('fit_ftrc')) LS.setItem('fit_ftrc', 'direct');
    } else if (rc) {
      LS.setItem('fit_rc', rc);
      if (!LS.getItem('fit_ftrc')) LS.setItem('fit_ftrc', rc);
    }
  } catch (e) {}
  function g(k) { try { return LS.getItem(k) || ''; } catch (e) { return ''; } }
  function normEmail(v) { return (v || '').trim().toLowerCase(); }
  function emailFromForm(f) {
    try { var el = f && f.querySelector('input[type="email"]'); var v = normEmail(el && el.value); return EMAIL_RE.test(v) ? v : ''; }
    catch (e) { return ''; }
  }
  function activeForm() {
    try {
      var fs = document.querySelectorAll('form[aria-label="makuake_OPB1"]'), fallback = null;
      for (var i = 0; i < fs.length; i++) {
        if (!fs[i].querySelector('input[type="email"]')) continue;
        fallback = fallback || fs[i];
        if (fs[i].offsetParent !== null) return fs[i];   // 데스크탑/모바일 2폼 중 '화면에 보이는' 폼 우선
      }
      return fallback;
    } catch (e) {}
    return null;
  }
  // (d) Wix hidden 소스필드 서버측 캡처(2026-07-15): sendBeacon 미도달(추적실패) 대비 폼 자체에 소스를
  //     실어 제출 레코드(Wix 그라운드트루스)에 확보. Wix는 React 제어라 DOM value만 넣으면 무시 →
  //     ★네이티브 value setter + input/change 이벤트로 React state 갱신해야 제출 payload에 실림.
  //     자기발견 프리픽스 'fitsrc1:' → 리컨실이 form_field ID 몰라도 값 스캔으로 채택(프로브 왕복 제거).
  //     PII 안전: 이메일·원문 referrer 미포함(fire()와 동일 소스, ref_class는 도메인라벨).
  function srcBlob() {
    try {
      var p = 'creative=' + encodeURIComponent(g(CFT)) +
        '&rc=' + encodeURIComponent(g('fit_rc')) +
        '&us=' + encodeURIComponent(g('fit_us')) +
        '&um=' + encodeURIComponent(g('fit_um')) +
        '&fb=' + (g(CFB) ? '1' : '0') +
        '&lp=' + encodeURIComponent(location.pathname);
      return 'fitsrc1:' + p;
    } catch (e) { return ''; }
  }
  function setNative(el, val) {
    try {
      var proto = (el.tagName === 'TEXTAREA') ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      var d = Object.getOwnPropertyDescriptor(proto, 'value');
      if (d && d.set) d.set.call(el, val); else el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (e) { try { el.value = val; } catch (e2) {} }
  }
  function fillSrc(f) {
    try {
      f = f || activeForm(); if (!f) return;
      // 그램이 title='fit_src'로 필드 생성 → Wix가 aria-label/placeholder/name/data-testid 중 어딘가에 반영.
      var el = f.querySelector(
        'input[aria-label="fit_src"],textarea[aria-label="fit_src"],'
        + 'input[placeholder="fit_src"],textarea[placeholder="fit_src"],'
        + 'input[name*="fit_src" i],textarea[name*="fit_src" i]');
      if (!el) return;
      var blob = srcBlob(); if (!blob || blob === 'fitsrc1:creative=&rc=&us=&um=&fb=0&lp=' + encodeURIComponent(location.pathname)) {
        /* 소스 전무면 굳이 안 채움(진짜 direct는 서버측도 미상) */
      }
      if (el.value !== blob) setNative(el, blob);
    } catch (e) {}
  }
  // 폼 늦은 렌더/재렌더로 값 리셋 대비: 초기 + 15초간 1초 폴링(하이드레이션 창) + 클릭/제출 직전 재주입.
  try { fillSrc(); var _ft = 0, _fi = setInterval(function () { _ft++; fillSrc(); if (_ft >= 15) clearInterval(_fi); }, 1000); } catch (e) {}
  function sha256(s) {
    try {
      if (!(window.crypto && crypto.subtle)) return Promise.resolve('');
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (h) {
        return Array.prototype.map.call(new Uint8Array(h), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
      });
    } catch (e) { return Promise.resolve(''); }
  }
  function sent() { try { return JSON.parse(LS.getItem(CSENT) || '[]'); } catch (e) { return []; } }
  function markSent(k) {
    try { var a = sent(); if (a.indexOf(k) > -1) return false; a.push(k); LS.setItem(CSENT, JSON.stringify(a.slice(-30))); return true; }
    catch (e) { return true; }
  }
  function fire(emailHash, variant) {
    if (!emailHash) return;
    var creative = g(CFT), key = emailHash + '|' + creative;
    if (sent().indexOf(key) > -1) return;                   // 이미 전송됨(2폼 중복·재클릭 dedup)
    var payload = { email_sha256: emailHash, visitor_id: '', creative: creative, fbclid: g(CFB),
      confirmed: 1, form_variant: variant || '', ts: Date.now(), page: location.pathname,
      utm_source: g('fit_us'), utm_medium: g('fit_um'), utm_campaign: g('fit_uc'), utm_term: g('fit_ut'),
      gclid: g('fit_gc'), click_ext: g('fit_cx'), ref_class: g('fit_rc'), ft_ref_class: g('fit_ftrc') };
    var body = JSON.stringify(payload), ok = false;
    try { if (navigator.sendBeacon) ok = navigator.sendBeacon(BEACON, new Blob([body], { type: 'text/plain' })); } catch (e) {}
    if (!ok && window.fetch) { try { fetch(BEACON, { method: 'POST', body: body, keepalive: true, mode: 'no-cors', headers: { 'Content-Type': 'text/plain' } }); ok = true; } catch (e) {} }
    if (ok) markSent(key);                                  // 전송 성공시에만 dedup 기록 → 실패시 재클릭 재전송
  }
  // (b) 트리거: '通知を受け取る' 클릭 + 이메일 유효 → 비콘. Wix 조인이 최종 진실 게이트.
  document.addEventListener('click', function (e) {
    if (!e.isTrusted) return;
    var t = e.target; if (!t || !t.closest) return;
    var btn = t.closest('button,[role="button"],input[type="submit"],.wixui-button'); if (!btn) return;
    var txt = (btn.textContent || btn.getAttribute('aria-label') || '');
    if (!/通知を受け取る|先行登録|事前登録/.test(txt)) return;
    var f = (btn.closest && btn.closest('form[aria-label="makuake_OPB1"]')) || activeForm();
    fillSrc(f);                                             // 제출 직전 소스필드 최신값 재주입(서버측 확보)
    var email = emailFromForm(f);
    if (!email) return;
    var variant = (window.innerWidth <= 750) ? 'mobile' : 'desktop';
    sha256(email).then(function (h) { fire(h, variant); });
  }, true);
  // (c) 추적실패 완화(2026-07-14): Enter 제출·click 트리거 미스 대비 submit 이벤트도 fire.
  //     fire()가 emailHash+creative로 dedup하므로 click과 겹쳐도 이중전송 없음. (Wix가 submit을
  //     가로채면 안 뜰 수 있어 완전 제로화는 아님 — 골드스탠다드는 Wix hidden field, 별건.)
  document.addEventListener('submit', function (e) {
    try {
      var f = e.target; if (!f || !f.getAttribute || f.getAttribute('aria-label') !== 'makuake_OPB1') return;
      fillSrc(f);                                           // 캡처페이즈(Wix보다 먼저) 최신값 재주입
      var email = emailFromForm(f); if (!email) return;
      var variant = (window.innerWidth <= 750) ? 'mobile' : 'desktop';
      sha256(email).then(function (h) { fire(h, variant + '_sbmt'); });
    } catch (err) {}
  }, true);
})();
/*ENDFJPTRK*/
