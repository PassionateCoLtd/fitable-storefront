/* otb01_pdp.js — 테이블바이크 오브제(OTB01) 사전예약 반응테스트 랜딩 보정.
 * 대상: 상품 176 한정(다른 상품에선 즉시 종료).
 * 하는 일 4가지
 *   ① 구매 맥락 UI 가림 — 이 페이지는 판매가 아니라 «순번 신청»을 받는다.
 *      selling=F 라 서버가 구매/장바구니는 이미 displaynone 으로 내려보내고,
 *      남는 SOLD OUT·가격·Total·무료배송 게이지·옵션칸만 CSS 로 덮는다.
 *   ② 하단 고정 CTA 바(PC·모바일 공통) 주입.
 *   ③ CTA 클릭 시 신청 링크에 «확인 코드»(유입경로+버튼위치+시각)를 붙여 준다.
 *      → 응답 한 줄마다 어느 광고·어느 버튼에서 왔는지가 남는다.
 *   ④ 모바일 자동 변환된 움직이는 이미지가 원본보다 2배 무거워, 원본으로 되돌린다.
 *   ⑤ 스킨 «사전예약» 모듈 가림 — 값이 비어 「개」「%」만 뜨고 버튼은 로그인 벽에 막혀 안 눌린다.
 *      스킨 하단 고정바까지 같이 가려 바를 1개(우리 것)로 만든다.
 *   ⑥ PC 상단 재구성 — 대표이미지가 상세 1번째 이미지와 같은 파일이라 같은 장면이 두 번 나온다.
 *      대표컷·썸네일 줄을 PC에서만 접어 제목 다음에 상세가 바로 오게 한다(모바일은 갤러리라 유지).
 *   ⑦ 스킨의 `#prdDetail .cont > *{display:none}` 때문에 모바일 detail2 에서 상세가
 *      통째로 안 보이던 것을 상품 176 한정으로 되살린다.
 * 금지(스킨 충돌): 우리 요소 class/id 에 buy_btn·cart_btn·option·ec-base-layer 금지,
 *   DOM 노드 remove() 금지(스킨 타이머가 null 가드 없이 참조 → 오류 폭주). 숨김은 display:none 만.
 * 롤백 = 이 ScriptTag DELETE 한 줄.
 */
(function () {
  var TARGETS = ['176'];
  var CFG = {
    form: 'https://docs.google.com/forms/d/e/1FAIpQLSc9UPRzbGt6gG8_wTQqXB75LZMai0jsncnYMw-wKjv13oUtJw/viewform',
    codeEntry: 'entry.2069746961',
    label: '얼리버드 순번 받기',
    left: '12월 사전예약 오픈 · 200대 한정',
    sessionKey: 'otb01_utm',
    showAfter: 0,            // 0 = 첫 화면부터 바로 노출(대표 지시 2026-09-02 — 한참 내려야 나오던 것)
    gifFix: { '_1788345209.gif': '/web/upload/NNEditor/20260902/695b19f34ce4fe3a351a9a2bbc9fa6bc.gif',
              '_1788345210.gif': '/web/upload/NNEditor/20260902/fd2623b4cff392b561e76d61080733f9.gif' }
  };
  var HIDE = [
    '.xans-product-detail .infoArea > .xans-product-action:not(.wish_btn)',
    '.ec-base-button.gColumn', 'a.buy_btn', 'a.cart_btn', 'span.sold', '.sns_pay',
    '#NaverChk_Button', '#appPaymentButtonBox', '.fit-order-dock', '.fit-order-summary',
    '.fit-order-close', '.xans-product-detail .xans-product-detaildesign', '#btn_restock',
    '#totalProducts', '#totalPrice', '.free_delivery', '.price-wr', '.detail_custom_event',
    '.now_buy', '.xans-product-detail .infoArea > .xans-product-action.wish_btn',
    '.xans-product-detail .xans-product-option.option_wrap', '.menu_tab',
    /* 스킨 «사전예약» 모듈 — 값이 비어 「개」「%」만 덩그러니 뜨고(한정수량·할인율 미입력),
       버튼은 「로그인해야 한다」만 띄우고 로그인 페이지로 넘어가지도 않는다. 우리 CTA 와 역할도 겹친다.
       카운터(0명 알림 신청)까지 같이 가린다 — 이 버튼을 없앤 이상 영원히 0이라 정보가 아니라 결함이다. */
    '.xans-product-detail .booking_info',
    '.xans-product-detail .booking_btn',
    /* 같은 «값이 안 채워진 사전예약 모듈» 무리. 제목만 있고 내용이 통째로 비어 있다.
       .count_time = 「사전예약 마감까지」 + 빈 date_info·num_wrap (사전예약 기간 미설정)
       .add_info   = 글자 없는 빈 줄
       ⚠️ 나중에 관리자에서 «사전예약 기간»을 실제로 넣으면 카운트다운이 동작하게 되는데
          이 줄이 그것까지 가린다 — 그때는 .count_time 만 빼면 된다. */
    '.xans-product-detail > .count_time',
    '.xans-product-detail > .add_info',
    /* ③ 스킨 하단 고정바(PC z-index:9999 / 모바일 detail2 z-index:2147483000).
       우리 #otb01-bar 와 겹쳐 바가 2개로 보인다. 직계 자식으로 좁혀 다른 .item_info 오용을 피한다. */
    '.xans-product-detail > .item_info'
  ];

  /* ② PC 전용 가림 — 모바일에선 같은 요소가 «실제 상품 갤러리»(스와이프 캐러셀)라 가리면 화면이 통째로 빈다.
     ⚠️ 뷰포트 미디어쿼리로 가르면 안 된다 — m. 도메인을 태블릿 폭(≥768px)으로 열면 갤러리가 지워진다.
     PC/모바일은 «호스트»로 갈리는 사이트라 호스트로 판정한다. */
  var HIDE_PC = [
    /* 대표이미지: 상세 1번째 이미지와 «파일이 같다»(md5 c9592e36…, 2026-09-02 실측).
       게다가 원본 860px 을 1385px 로 늘려 그려 흐리다. 같은 그림을 두 번 보여줄 이유가 없다. */
    '.xans-product-detail .detailArea .xans-product-image',
    /* 추가이미지 썸네일 줄: image_upload_type=A 라 대표컷과 같은 원본이고, 추가이미지 2장도
       상세 본문에 이미 있는 구간이다. 상세가 바로 시작되도록 PC에서만 접는다. */
    '.xans-product-detail > .xans-product-addimage.listImg'
  ];
  var IS_PC = !/^m\./i.test(location.hostname);

  function pno() {
    var m = location.search.match(/[?&]product_no=(\d+)/) ||
            location.pathname.match(/\/product\/[^\/]+\/(\d+)(?:\/|$)/);
    return m ? m[1] : '';
  }
  if (TARGETS.indexOf(pno()) === -1) return;
  if (window.__otb01pdp) return; window.__otb01pdp = 1;

  /* ① 가림 — 리페인트 전에 먹도록 즉시 삽입 */
  try {
    var st = document.createElement('style');
    st.id = 'otb01-hide';
    st.textContent = HIDE.join(',') + '{display:none!important;}' +
      (IS_PC ? HIDE_PC.join(',') + '{display:none!important;}' : '') +
      /* ④ 상세가 통째로 안 보이던 것 되살리기 — 스킨 «모바일» 스타일시트에
         `#prdDetail .cont > * {display:none}` 규칙이 있어서, 상세 HTML 을 <div id="otb01-pdp">
         하나로 감싼 우리 본문이 「.cont 의 직계 자식」으로 그대로 걸린다(모바일 detail2 에서만 발동).
         스킨 전역 CSS 는 손대지 않는다 — 이 스크립트는 상품 176 에서만 도니 영향 범위가 176 뿐이다.
         id 와 div 를 같이 적어 상세 래퍼 id 가 바뀌어도 조용히 다시 깨지지 않게 한다. */
      '#prdDetail .cont > #otb01-pdp,#prdDetail .cont > div{display:block!important;}' +
      'body{-webkit-text-size-adjust:100%;}' +
      '#otb01-bar{position:fixed;left:0;right:0;bottom:0;z-index:1200;background:#161310;' +
      'display:none;align-items:center;justify-content:space-between;gap:16px;' +
      'padding:12px 18px calc(12px + env(safe-area-inset-bottom));' +
      "font-family:'SUIT','Noto Sans KR','Apple SD Gothic Neo',sans-serif;" +
      'box-shadow:0 -6px 24px rgba(0,0,0,.28);}' +
      '#otb01-bar .otb01-l{font-size:12.5px;line-height:1.45;color:#d8d2c8;min-width:0;}' +
      '#otb01-bar .otb01-b{flex:0 0 auto;background:#A89887;color:#fff;border-radius:8px;' +
      'padding:14px 26px;font-size:15px;font-weight:700;text-decoration:none;white-space:nowrap;}' +
      // 모바일 오른쪽 76px 는 비워둔다 — 채널톡 상담 버튼이 그 자리에 떠서 CTA 「…받기」를 가린다(2026-09-02 실측)
      '@media (max-width:520px){#otb01-bar{padding:10px 76px 10px 14px;padding-bottom:calc(10px + env(safe-area-inset-bottom));gap:10px;}' +
      '#otb01-bar .otb01-l{font-size:11.5px;}#otb01-bar .otb01-b{padding:13px 18px;font-size:14px;}}';
    (document.head || document.documentElement).appendChild(st);
  } catch (e) {}

  /* 스킨이 나중에 붙이는 요소 대비 — 지우지 않고 숨기기만, 짧게 폴링 */
  var ticks = 0;
  var poll = setInterval(function () {
    try {
      for (var i = 0; i < HIDE.length; i++) {
        var ns = document.querySelectorAll(HIDE[i]);
        for (var j = 0; j < ns.length; j++) {
          if (ns[j].style.display !== 'none') ns[j].style.display = 'none';
        }
      }
      ['#btn_restock', '.wish_btn a'].forEach(function (s) {
        var n = document.querySelector(s);
        if (n && n.getAttribute('onclick')) n.removeAttribute('onclick');
      });
    } catch (e) {}
    if (++ticks > 40) clearInterval(poll);
  }, 150);

  /* 유입경로 보존 — 처음 들어온 값만 남기고 덮어쓰지 않는다 */
  function utm() {
    try {
      var q = new URLSearchParams(location.search);
      var s = q.get('utm_source'), c = q.get('utm_content');
      /* 저장 형식은 신청폼(otb01_signup_form.js)과 «반드시» 같아야 한다 — {source, content}.
         모양이 갈리면 서로의 값을 못 읽어 광고로 들어온 사람이 direct 로 기록된다.
         그 값이 곧 판정 분모라 CPL 이 통째로 틀어진다. (2026-09-02 보안점검) */
      var saved = JSON.parse(sessionStorage.getItem(CFG.sessionKey) || 'null');
      if ((!saved || !saved.source) && (s || c)) {
        saved = { source: s || '', content: c || '' };
        sessionStorage.setItem(CFG.sessionKey, JSON.stringify(saved));
      }
      return saved || { source: '', content: '' };
    } catch (e) { return { source: '', content: '' }; }
  }
  function stamp() {
    var d = new Date(Date.now() + (new Date().getTimezoneOffset() * 60000) + 32400000);
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) + p(d.getHours()) + p(d.getMinutes());
  }
  function code(loc) {
    var u = utm();
    return [(u.source || 'direct'), (u.content || 'none'), loc, stamp()]
      .join('-').replace(/[^A-Za-z0-9_.\-]/g, '_').slice(0, 90);
  }
  function link(loc) {
    return CFG.form + '?usp=pp_url&' + CFG.codeEntry + '=' + encodeURIComponent(code(loc));
  }

  /* ② 하단 고정 CTA */
  function bar() {
    if (document.getElementById('otb01-bar')) return;
    var b = document.createElement('div');
    b.id = 'otb01-bar';
    var l = document.createElement('div'); l.className = 'otb01-l';
    l.appendChild(document.createTextNode(CFG.left));
    var a = document.createElement('a'); a.className = 'otb01-b';
    a.setAttribute('data-otb-cta', 'sticky');
    a.href = CFG.form; a.target = '_blank'; a.rel = 'noopener';
    a.appendChild(document.createTextNode(CFG.label));
    b.appendChild(l); b.appendChild(a);
    document.body.appendChild(b);

    var bottom = document.querySelector('a[data-otb-cta="bottom"]');
    function onScroll() {
      try {
        var doc = document.documentElement;
        var past = (window.pageYOffset || doc.scrollTop) >= (doc.scrollHeight - window.innerHeight) * CFG.showAfter;
        var atEnd = false;
        if (bottom) { var r = bottom.getBoundingClientRect(); atEnd = r.top < window.innerHeight && r.bottom > 0; }
        b.style.display = (past && !atEnd) ? 'flex' : 'none';
      } catch (e) {}
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
  }

  /* ③ CTA 클릭 — 링크에 확인 코드 부여 + 신청 의사 기록 */
  document.addEventListener('click', function (e) {
    try {
      if (!e.isTrusted || !e.target || !e.target.closest) return;
      var a = e.target.closest('a[data-otb-cta]');
      if (!a) return;
      var loc = a.getAttribute('data-otb-cta') || 'unknown';
      var cd = code(loc);
      a.href = CFG.form + '?usp=pp_url&' + CFG.codeEntry + '=' + encodeURIComponent(cd);
      a.target = '_blank'; a.rel = 'noopener';
      /* 픽셀 Lead 는 여기서 쏘지 않는다 — 실제 «연락처 제출» 시점에만(otb01_signup_form.js).
         버튼만 눌러도 잡으면 광고 최적화가 «누르기만 하는 사람»을 학습한다. */
      if (typeof gtag === 'function') gtag('event', 'otb01_pdp_cta_' + loc, { send_to: 'G-V7D156FCFX', transport_type: 'beacon' });
      (window.dataLayer = window.dataLayer || []).push({ event: 'otb01_cta_click', cta_location: loc, otb01_code: cd });
    } catch (err) {}
  }, true);

  /* ④ 모바일 자동 변환본이 원본보다 무겁다 — 원본으로 되돌린다 */
  function gifFix() {
    try {
      var imgs = document.querySelectorAll('img[src$=".gif"], img[ec-data-src$=".gif"]');
      for (var i = 0; i < imgs.length; i++) {
        var cur = imgs[i].getAttribute('src') || '';
        for (var k in CFG.gifFix) {
          if (cur.indexOf(k) > -1 && cur.indexOf('/mobile/') > -1) imgs[i].setAttribute('src', CFG.gifFix[k]);
        }
      }
    } catch (e) {}
  }

  /* CTA 라벨 보정 — 본문에 옛 문구가 남아 있으면 현재 문구로 */
  function label() {
    try {
      var as = document.querySelectorAll('a[data-otb-cta]');
      for (var i = 0; i < as.length; i++) {
        if (as[i].getAttribute('aria-label') !== CFG.label) as[i].setAttribute('aria-label', CFG.label);
      }
    } catch (e) {}
  }

  function boot() { bar(); gifFix(); label(); setTimeout(function () { gifFix(); label(); }, 1200); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
