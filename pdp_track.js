/*PDPTRK*/
/* 핏에이블 PDP 측정 전용(무수술=화면 미변경, 리스너만). GA4(G-V7D156FCFX) 익명 커스텀 이벤트.
   product_no→프리픽스 맵에 등록된 상품에서만 동작. 깊이/탭은 GA4 Data API가
   미등록 파라미터를 못 읽으므로 '이벤트 이름'으로 분리(<pfx>_pdp_scroll_25 등).
   롤백=ScriptTag DELETE. 상품 추가=CONFIG에 product_no:프리픽스 한 줄 추가 후 재배포. */
(function () {
  // product_no → 이벤트 프리픽스. 같은 상품의 중복 리스팅은 같은 프리픽스로 합쳐 상품 단위 퍼널로 본다
  // (20·69=AB슬라이드 초심자, 100·101=스텝메이트 프로). 상품 추가=한 줄 + pdp_funnel.py PRODUCTS 동기화.
  var CONFIG = {
    '69': 'ab01', '20': 'ab01',          // AB슬라이드 초심자(비밀특가 / 일반가)
    '101': 'smp01', '100': 'smp01',      // 스텝메이트 프로+
    '126': 'wpb01',                      // 와이드 풀업바 (일반 구매페이지)
    '157': 'wpbsen',                     // 와이드 풀업바 시니어(5060) 버전
    '30': 'pul01', '44': 'pul02',        // 문틀철봉 / 문틀철봉+풀업밴드 세트
    '68': 'stm01',                       // 스텝메이트(기본)
    '41': 'adb01',                       // 무게조절 덤벨
    '86': 'cd01'                         // 치닝디핑
  };
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
    // 🔴 2026-08-11 스킨 개편 대응: 현행 버튼은 a.buy_btn / a.cart_btn (구 #actionBuy류 미존재 → 7/15부터 0건).
    //    구 셀렉터도 유지(다른 스킨 페이지 방어). 실클릭만(isTrusted) 집계.
    if (PFX === 'otb01' && e.isTrusted) {
      var oc = t.closest('a[data-otb-cta]');
      if (oc) { ev('cta_' + (oc.getAttribute('data-otb-cta') || 'unknown')); return; }
    }
    if (t.closest('#actionBuy,#actionBuyClone,#actionBuyCloneFixed,#action_buy_btn,.now_buy,a.buy_btn')) { if (e.isTrusted) ev('buy_click'); return; }
    if (t.closest('#actionCart,#actionCartClone,a.cart_btn')) { if (e.isTrusted) ev('cart_click'); return; }
    var tab = t.closest('a[data-link^="#prd"]');
    if (tab) {
      var key = (tab.getAttribute('data-link') || '').replace('#', '');
      var slug = TABMAP[key] || key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'etc';
      ev('tab_' + slug);
      return;
    }
    // 🔴 2026-08-11 현행 탭 구조 대응(li.tab1~4, 앵커 없음 — 구 a[data-link]는 6월 개편 후 0건).
    //    클래스 순서 = 상품정보/리뷰/Q&A/반품·교환정보 (PC·모바일 동일 실측 2026-08-11).
    var tabLi = t.closest('li.tab1,li.tab2,li.tab3,li.tab4');
    if (tabLi && e.isTrusted) {
      var TABLI = { tab1: 'detail', tab2: 'review', tab3: 'qna', tab4: 'guide' };
      for (var tk in TABLI) { if (tabLi.classList && tabLi.classList.contains(tk)) { ev('tab_' + TABLI[tk]); break; } }
    }
  }, true);

  // 3) 옵션 선택
  document.addEventListener('change', function (e) {
    // 🔴 사람이 고른 것만 센다. 스크립트가 dispatch 한 change(isTrusted=false)는 제외 —
    //    pdp_option_autoselect.js 가 실질 1개 옵션을 자동 선택하는데, 그걸 세면
    //    option_select 가 PDP 조회수만큼 부풀어 '옵션까지 본 사람' 지표가 거짓이 된다.
    //    (capture 단계라 bubbles:false 로도 여기 도달한다 — isTrusted 가 유일한 구분선)
    if (!e.isTrusted) return;
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

  // 5-b) 리뷰 위젯 상호작용 프록시 (2026-08-11) — 크레마 리뷰는 cross-origin iframe(review8.cre.ma)이라
  //      내부 클릭(더보기·정렬·도움돼요)을 GA4가 직접 못 본다. 부모 문서에서 3가지 프록시로 근사:
  //      review_click  = 리뷰 iframe 안을 클릭해 포커스가 넘어간 횟수(window blur + activeElement 판별, 세션 상한 10회)
  //      review_expand = 리뷰 iframe 높이가 유의미하게 늘어난 횟수(더보기/사진열람/페이지전환 근사, 상한 10회)
  //      review_dwell  = 렌더된 리뷰 위젯이 뷰포트에 3초+ 연속 노출(1회)
  //      전부 무수술(리스너만). 크레마 위젯이 없는 상품에선 자동으로 아무것도 안 함.
  try {
    var rvIframes = function () {
      var out = [], fr = document.getElementsByTagName('iframe');
      for (var i = 0; i < fr.length; i++) { if (/cre\.ma/.test(fr[i].src || '')) out.push(fr[i]); }
      return out;
    };
    // ① 클릭 진입: iframe 클릭 시 부모 window가 blur되고 activeElement가 그 iframe이 된다.
    var rvClicks = 0;
    window.addEventListener('blur', function () {
      try {
        var ae = document.activeElement;
        if (ae && ae.tagName === 'IFRAME' && /cre\.ma/.test(ae.src || '') && rvClicks < 10) {
          rvClicks++; ev('review_click');
          // 같은 iframe 연속 클릭도 세기 위해 포커스를 부모로 되돌린다(화면 영향 없음)
          setTimeout(function () { try { window.focus(); ae.blur(); } catch (e2) {} }, 300);
        }
      } catch (e1) {}
    });
    // ② 높이 증가(더보기·사진 열람 근사): 초기 렌더 후 +80px 이상 증가만 카운트
    var rvExpands = 0;
    var armResize = function () {
      if (!('ResizeObserver' in window)) return;
      rvIframes().forEach(function (f) {
        if (f.__rvRO) return; f.__rvRO = 1;
        var base = null;
        var ro = new ResizeObserver(function (es) {
          try {
            var h = es[0].contentRect.height;
            if (base === null) { if (h > 0) base = h; return; }
            if (h > base + 80 && rvExpands < 10) { rvExpands++; ev('review_expand'); }
            if (h > base) base = h;
          } catch (e3) {}
        });
        ro.observe(f);
      });
    };
    // ③ 리뷰 위젯 3초+ 체류(렌더된 위젯만: 높이 100px+)
    var rvDwellDone = 0, rvDwellTimer = null;
    var armDwell = function () {
      if (!('IntersectionObserver' in window)) return;
      rvIframes().forEach(function (f) {
        if (f.__rvIO) return; f.__rvIO = 1;
        var io = new IntersectionObserver(function (es) {
          for (var i = 0; i < es.length; i++) {
            var vis = es[i].isIntersecting && es[i].target.getBoundingClientRect().height > 100;
            if (vis && !rvDwellDone && !rvDwellTimer) {
              rvDwellTimer = setTimeout(function () { rvDwellDone = 1; ev('review_dwell'); }, 3000);
            } else if (!vis && rvDwellTimer) { clearTimeout(rvDwellTimer); rvDwellTimer = null; }
          }
        }, { threshold: 0.3 });
        io.observe(f);
      });
    };
    // 크레마 iframe은 지연 생성 → 주기 재스캔(30초까지, 이후 정리)
    var rvScanN = 0;
    var rvScan = setInterval(function () {
      try { armResize(); armDwell(); } catch (e4) {}
      if (++rvScanN >= 10) clearInterval(rvScan);
    }, 3000);
  } catch (e) {}

  // 6) 섹션별 관심(도달+체류) — WPB(126) 본문은 lazy 주입이라 MutationObserver로 신규 이미지 포착.
  //    섹션 = 본문 이미지 파일명 verNNNN/<섹션>-<순번>의 앞자리(1~6). view=도달, dwell=섹션이 3초+ 연속 노출(실관심).
  if (PFX === 'wpb01' && 'IntersectionObserver' in window) {
    try {
      var secSeen = {}, secDwell = {}, secTimer = {}, secVis = {};
      var secOf = function (im) {
        // ★ ec-data-src(진짜 CDN URL)를 먼저 본다. Cafe24 모바일 레이지로딩이 미노출 본문
        //   이미지의 src를 base64 placeholder로 두고 진짜 URL을 ec-data-src에 보관하기 때문.
        //   (src 우선이면 하단 섹션이 placeholder에 막혀 집계 누락 → sec1만 잡히던 버그)
        var s = (im.getAttribute && im.getAttribute('ec-data-src')) || im.currentSrc || im.src || '';
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
      // childList=본문 블록 주입, attributes(src/ec-data-src)=lazy 교체까지 포착(방어적 이중화)
      secMO.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'ec-data-src'] });
      // 본문 lazy 주입 끝나면 MO 정리(과다 관찰 방지) + 마지막 1회 스캔
      setTimeout(function () { try { secMO.disconnect(); scanSec(); } catch (e) {} }, 30000);
    } catch (e) {}
  }

  // 7) 화면(뷰포트) 단위 깊이 관심 — 전 상품 공통(이미지 파일명 무관, 순수 위치 기준).
  //    화면 idx = floor(scrollTop / 뷰포트높이) + 1 (1-base). 도달=그 화면이 뷰에 들어옴(1회),
  //    체류(dwell)=한 화면에 3초+ 연속 머무름(1회). 깊이는 GA4 커스텀측정기준 pdp_screen(param)로 보내
  //    이벤트명 폭증(상품×화면)을 피하고 Data API가 화면별로 읽게 한다. WPB 의미섹션(위)과 상호보완.
  try {
    var scrSeen = {}, scrDwell = {}, scrCur = null, scrTimer = null;
    var scrVH = function () { return window.innerHeight || document.documentElement.clientHeight || 760; };
    var scrTop = function () { return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0; };
    var scrNow = function () { return Math.floor(scrTop() / scrVH()) + 1; };
    var scrOnChange = function () {
      var idx = scrNow();
      if (idx === scrCur) return;
      scrCur = idx;
      if (!scrSeen[idx]) { scrSeen[idx] = 1; ev('screen_view', { pdp_screen: idx }); }
      if (scrTimer) { clearTimeout(scrTimer); scrTimer = null; }
      scrTimer = setTimeout(function () {
        if (scrCur === idx && !scrDwell[idx]) { scrDwell[idx] = 1; ev('screen_dwell', { pdp_screen: idx }); }
      }, 3000);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scrOnChange);
    else scrOnChange();
    var scrTick = false;
    window.addEventListener('scroll', function () {
      if (scrTick) return; scrTick = true;
      requestAnimationFrame(function () { scrOnChange(); scrTick = false; });
    }, { passive: true });
  } catch (e) {}
})();
/*ENDPDPTRK*/
