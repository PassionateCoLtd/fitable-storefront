/* listtrack.js — GA4 view_item_list / select_item 발사 (측정 전용·화면 무변경)
 * 목적: "어느 진열/리스트가 클릭을 만드나" 측정. 메인/카테고리/검색 리스트 노출(view_item_list)과
 *       상품 클릭(select_item)을 신규 jsDelivr ScriptTag로 수집. GA4(G-V7D156FCFX, KR)만 대상.
 * ★격리(addpayinfo.js 격리 템플릿 그대로 답습): gtag + send_to:'G-V7D156FCFX'로 GA4에만 핀.
 *   dataLayer.push 절대 금지 — view_item_list/select_item은 GA4 **표준** ecommerce명이라
 *   dataLayer에 들어가면 GTM enhanced-ecommerce 트리거가 듣고 Meta ViewContent로 샐 수 있음.
 * ⚠️pdp_track.js의 ev()는 dataLayer.push를 하지만 이벤트명이 커스텀(<pfx>_pdp_*)이라 무해했다.
 *   listtrack은 표준명을 쓰므로 그 패턴을 베끼면 위험 — 여긴 절대 하지 않는다.
 * ★LOG_ONLY: true면 gtag 대신 console.log만(첫 배포 콘솔검증용). 확인 후 false로 재커밋+PUT.
 * dedup: view_item_list=컨테이너 element WeakMap/Map(리스트당 페이지로드 1발, 문자열id 아님 —
 *   Cafe24는 같은 상품이 여러 진열에 들어가면 동일 anchorBoxId_가 DOM에 중복되기 때문).
 *   select_item=동일 상품 700ms debounce.
 * 경로가드: 리스트(anchorBoxId_) 존재 && !주문서(/order/) && !PDP(연관상품 기본 OFF, TRACK_PDP_RELATED).
 * item_id 검증(2026-07-04, curl로 라이브 product_no=126 PDP 실측):
 *   페이지에 경쟁하는 두 개의 native ecommerce dataLayer 스크립트가 공존한다 —
 *   (1) "GA4 dataLayer by YamujinChoa": window 'load' 시점에 item_id=iProductNo(raw product_no, 예 '126')로
 *       view_item2/add_to_cart2 push. cart_fix.js가 참조하는 마지막 ecommerce는 페이지 완전로드 후
 *       시점상 이쪽이 최신값이 될 개연성이 높다(inline 즉시실행인 (2)보다 항상 나중에 push됨).
 *   (2) inline 즉시실행 min-schema 스크립트: item_id=product_code 우선(예 'P00000FZ')으로 표준명 view_item 1회.
 *   → 100% 확정은 아니라서(두 스크립트 공존) 스펙 §5 안전 기본값대로 raw product_no 채택.
 *   ⚠️배포전 검증필요: GA4 DebugView에서 cart_fix.js가 실제로 내보내는 item_id가 raw product_no와
 *   일치하는지 재확인할 것(불일치 시 buildItemFromCard의 item_id 라인만 교체).
 * 롤백: ScriptTag DELETE 1콜(신규 파일이라 이전 SHA 없음).
 */
(function () {
  'use strict';
  var LOG_ONLY = true; // ★첫 배포는 콘솔검증. view_item_list/select_item 단발 확인 후 false로 재커밋+PUT.
  var GA = 'G-V7D156FCFX';
  var MAX_ITEMS = 50;             // view_item_list items[] 상한(GA4 히트 크기 방어)
  var CLICK_DEDUP_MS = 700;       // 동일 상품 연타 방지
  var TRACK_PDP_RELATED = false;  // PDP 연관상품 리스트 측정 스위치(기본 OFF). 켜면 item_list_id='pdp-related' 고정

  try {
    if (window.__fitListTrack) return; // 중복 ScriptTag 주입 방어(싱글턴)
    window.__fitListTrack = 1;

    var CARD_SEL = 'li[id^="anchorBoxId_"]';
    var CONTAINER_SEL = 'ul.prdList, .xans-product-listmain, .xans-product-listnormal, ' +
      '.xans-product-listrecent, [class*="xans-product-list"]';

    // ── §4 경로 가드 ──
    if (!document.querySelector(CARD_SEL)) return; // 1차·자기제한 가드: 리스트 자체가 없으면 즉시 종료

    var path = location.pathname;
    if (/\/order\//.test(path)) return; // 주문서 제외

    // PDP 본문 제외. ★스펙 원문 정규식(\d+\/?(?:$|\?))은 라이브 실측(2026-07-04, product_no=126) 결과
    //   실제 SEO PDP URL이 /product/<slug>/<no>/category/<cate_no>/display/<n>/ 형태로 상품번호 뒤에
    //   세그먼트가 더 붙어 매칭 실패함을 확인 → 상품번호 뒤 구분자를 '/'|end|'?' 로 완화(의도는 동일:
    //   list.html/search.html은 여전히 안 걸림 — 이 두 경로는애초 '[^\/]+\/\d+' 형태 자체가 안 나옴).
    var isPDP = /\/product\/detail\.html/.test(path) ||
      (/\/product\/[^\/]+\/\d+(?:\/|$|\?)/.test(path) && !/\/product\/(list|search)\.html/.test(path));
    if (isPDP && !TRACK_PDP_RELATED) return;

    // ── 유일한 전송구 ──
    function send(name, params) {
      try {
        var p = params || {};
        p.send_to = GA;               // ★GA4 핀 — 다른 gtag 대상(Google Ads 등)으로 팬아웃 차단
        p.transport_type = 'beacon';  // 클릭→네비게이션 전에도 유실 방지
        if (LOG_ONLY) { console.log('[listtrack]', name, p); return; } // 콘솔검증 모드 — GA4 미발사
        if (typeof gtag === 'function') gtag('event', name, p);
        // ⚠️ dataLayer.push 하지 않는다 (표준 ecommerce명 → GTM→Meta 팬아웃 경로 원천 차단, 상단 헤더 참고)
      } catch (e) {}
    }

    // ── 텍스트 유틸: Cafe24 접근성 히든라벨(.displaynone, 예 "상품명 :") 제거 후 textContent ──
    function cleanText(el) {
      if (!el) return '';
      try {
        var clone = el.cloneNode(true);
        var hidden = clone.querySelectorAll('.displaynone');
        for (var i = 0; i < hidden.length; i++) { hidden[i].parentNode.removeChild(hidden[i]); }
        return (clone.textContent || '').replace(/\s+/g, ' ').trim();
      } catch (e) { return (el.textContent || '').trim(); }
    }

    // ── §5 price: 애매하면 omit(오값 전송 금지) ──
    function parsePrice(card) {
      try {
        // 스펙 예시 셀렉터 우선, 라이브 실측(2026-07-04)상 실제 판매가 표기는 li[rel="최적할인가"|"판매가"]
        // (li[rel="소비자가"]는 할인 전 원가·취소선 — 판매가 아니므로 제외)
        var el = card.querySelector('.xans-product-listmain .price, span.price') ||
          card.querySelector('li[rel="최적할인가"] span, li[rel="판매가"] span, li[rel="할인판매가"] span');
        if (!el) return undefined;
        var n = parseInt(cleanText(el).replace(/[^0-9]/g, ''), 10);
        return (n > 0) ? n : undefined;
      } catch (e) { return undefined; }
    }

    // ── §2.4 item_name: #anchorBoxName_<no>는 실제로 id가 아니라 <a name="anchorBoxName_<no>">라
    //   [name=...] 매칭도 함께 시도, 최종 폴백은 .name/.description .name ──
    function pickName(card, no) {
      var el = document.getElementById('anchorBoxName_' + no) ||
        card.querySelector('[name="anchorBoxName_' + no + '"]') ||
        card.querySelector('.description .name, .name');
      return cleanText(el);
    }

    // ── §2.3 페이지 타입 판정(item_list_id 저카디널리티 규칙) ──
    var pageType = (function () {
      if (isPDP && TRACK_PDP_RELATED) return 'pdp-related';
      var q = location.search;
      if (/\/product\/search\.html/.test(path) || /[?&]keyword=/.test(q)) return 'search';
      if (/\/category\/[^\/]+\/\d+\//.test(path) || /[?&]cate_no=(\d+)/.test(q)) return 'category';
      if (path === '/' || /\/index\.html/.test(path)) return 'main';
      return 'list';
    })();
    var cateNo = (function () {
      var m = path.match(/\/category\/[^\/]+\/(\d+)\//) || location.search.match(/[?&]cate_no=(\d+)/);
      return m ? m[1] : '0';
    })();

    // ── §2.3 헤딩 탐색(best-effort). ★스펙 예시(h2,h3,.title,.headline)에 h1 보강 —
    //   라이브 실측(2026-07-04) 메인 진열모듈 헤딩은 h1("가장 인기있는 상품" 등)이라 h2/h3만으론 못 잡음.
    //   ★카드 내부 accessibility 라벨도 class="title"(예 "상품명 :")을 공유해 오검출 위험 →
    //   CARD_SEL 내부에 있는 후보는 명시적으로 제외.
    function findHeading(containerEl) {
      try {
        var scope = containerEl.closest('section,div') || containerEl.parentElement;
        if (!scope) return '';
        var cands = scope.querySelectorAll('h1,h2,h3,.title,.headline');
        for (var i = 0; i < cands.length; i++) {
          if (cands[i].closest && cands[i].closest(CARD_SEL)) continue; // 카드 내부 라벨 제외
          var t = cleanText(cands[i]);
          if (t) return t.slice(0, 60);
        }
        return '';
      } catch (e) { return ''; }
    }

    var ordinalMain = 0, ordinalList = 0;
    function assignListMeta(container) {
      if (pageType === 'pdp-related') return { id: 'pdp-related', name: '연관상품' };
      if (pageType === 'search') return { id: 'search-results', name: '검색결과' }; // ★검색어 절대 미포함
      var heading = findHeading(container);
      if (pageType === 'category') return { id: 'category-' + cateNo, name: heading || ('카테고리 ' + cateNo) };
      if (pageType === 'main') { ordinalMain += 1; return { id: 'main-' + ordinalMain, name: heading || ('메인진열 ' + ordinalMain) }; }
      ordinalList += 1;
      return { id: 'list-' + ordinalList, name: heading || ('리스트 ' + ordinalList) };
    }

    // ── §2.4 items[] 구성 ──
    var listMap = new Map();      // containerEl -> list{el,id,name,items[],fired}
    var cardListOf = new WeakMap(); // cardEl -> list (select_item 조회용, dedup은 element identity 기준)

    function buildItemFromCard(card, index, listMeta) {
      var no = (card.id.match(/\d+/) || [])[0] || '';
      var item = {
        item_id: no, // raw product_no — 상단 헤더 "item_id 검증" 참고, 배포전 검증필요
        item_name: pickName(card, no),
        index: index,
        item_list_id: listMeta.id,
        item_list_name: listMeta.name
      };
      var price = parsePrice(card);
      if (price !== undefined) item.price = price; // 애매하면 키 자체를 생략
      card.dataset.viIdx = index; // select_item이 동일 index로 재사용
      return item;
    }

    // ── §2.5 IO 발사·dedup ──
    var io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          var entry = entries[i];
          if (!entry.isIntersecting) continue;
          var list = listMap.get(entry.target);
          if (!list || list.fired) continue;
          list.fired = true;
          io.unobserve(entry.target);
          send('view_item_list', { item_list_id: list.id, item_list_name: list.name, items: list.items });
        }
      }, { threshold: 0 }); // 카테고리 리스트가 뷰포트보다 길어도 상단 진입 시점을 "봤다"로 인정
    } else if (LOG_ONLY) {
      console.log('[listtrack] IntersectionObserver 미지원 — view_item_list skip(측정누락, 매출영향 0)');
    }

    // ── §2.2 리스트 컨테이너 발견 + §2.6 AJAX "더보기" 합류 ──
    function discoverLists() {
      var cards = document.querySelectorAll(CARD_SEL);
      var groups = new Map(); // containerEl -> 새로 발견된 카드[]
      var order = [];
      for (var i = 0; i < cards.length; i++) {
        var card = cards[i];
        if (cardListOf.has(card)) continue; // 이미 매핑된 카드(중복 id 함정 회피: element identity 기준)
        var container = card.closest(CONTAINER_SEL) || card.parentElement;
        if (!container) continue;
        if (!groups.has(container)) { groups.set(container, []); order.push(container); }
        groups.get(container).push(card);
      }
      order.forEach(function (container) {
        var newCards = groups.get(container);
        var existing = listMap.get(container);
        if (existing) {
          // 기존 컨테이너에 새 카드만 합류(정적 리스트면 이 분기 자체가 안 탐). 이미 fired여도 재발사 안 함.
          for (var i = 0; i < newCards.length && existing.items.length < MAX_ITEMS; i++) {
            var it = buildItemFromCard(newCards[i], existing.items.length + 1, existing);
            existing.items.push(it);
            cardListOf.set(newCards[i], existing);
          }
          return;
        }
        var meta = assignListMeta(container);
        var list = { el: container, id: meta.id, name: meta.name, items: [], fired: false };
        listMap.set(container, list);
        for (var j = 0; j < newCards.length && list.items.length < MAX_ITEMS; j++) {
          var item = buildItemFromCard(newCards[j], list.items.length + 1, list);
          list.items.push(item);
          cardListOf.set(newCards[j], list);
        }
        if (io) io.observe(container);
      });
    }
    discoverLists();

    // ── §2.6 지연 로딩/더보기 감시(cheap gate + debounce) ──
    if ('MutationObserver' in window) {
      var moTimer = null;
      var mo = new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var added = mutations[i].addedNodes;
          for (var j = 0; j < added.length; j++) {
            var n = added[j];
            if (n.nodeType !== 1) continue;
            if ((n.matches && n.matches(CARD_SEL)) || (n.querySelector && n.querySelector(CARD_SEL))) {
              if (moTimer) clearTimeout(moTimer);
              moTimer = setTimeout(discoverLists, 250);
              break;
            }
          }
        }
      });
      mo.observe(document.body, { childList: true, subtree: true }); // attributes 관찰 안 함
    }

    // ── §3 select_item: document 캡처 위임 1개, read-only ──
    var lastClick = { no: null, t: 0 };
    document.addEventListener('click', function (e) {
      var card = e.target.closest && e.target.closest(CARD_SEL);
      if (!card) return;
      var list = cardListOf.get(card);
      if (!list) return; // 추적 리스트 소속 아님(PDP연관 OFF 등) — 조용히 무시

      // §3.2 빠른-액션 제외: 장바구니/관심/줌/옵션/품절 버튼은 select 아님
      if (e.target.closest('[class*="cart"],[class*="wish"],[class*="icon"],[class*="zoom"],[class*="option"],[class*="soldout"]')) return;

      // 상품 링크 클릭만 인정 (링크 원형 불변 — UTM/icid 보호를 위해 preventDefault/stopPropagation 절대 호출 안 함)
      var a = e.target.closest('a[href]');
      var isProductLink = a && /\/product\/|product_no=/.test(a.getAttribute('href') || '');
      var isNameAnchor = e.target.closest('[name^="anchorBoxName_"],[id^="anchorBoxName_"]');
      if (!isProductLink && !isNameAnchor) return;

      // §3.3 dedup: 동일 상품 700ms 내 재클릭 무시
      var no = (card.id.match(/\d+/) || [])[0];
      var now = Date.now();
      if (lastClick.no === no && now - lastClick.t < CLICK_DEDUP_MS) return;
      lastClick = { no: no, t: now };

      var idx = parseInt(card.dataset.viIdx, 10) || 1;
      var item = list.items[idx - 1] || buildItemFromCard(card, idx, list); // 동일 index·동일 payload 재사용
      send('select_item', { item_list_id: list.id, item_list_name: list.name, items: [item] });
    }, true);
  } catch (e) { /* 전체 격리 — 셀렉터가 깨져도 조용히 실패(측정누락=매출영향 0) */ }
})();
