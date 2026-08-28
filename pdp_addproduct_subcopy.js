/* pdp_addproduct_subcopy.js — 상품상세 「추가상품」 각 항목의 상품명 아래에
   한 줄 서브카피를 붙인다. 지정 상품(product_no) × 지정 추가상품(상품명)에서만 동작.

   배경(2026-07-27 대표 지시): 추가상품에 상품명·가격만 노출돼 "왜 필요한지"를 페이지가
   말해주지 않는다. 상단 히어로/가격/CTA는 디자인 의도상 건드리지 않고(대표 확인),
   이미 열린 추가상품 영역 안에서만 한 줄로 말한다.

   카피 원칙: 판매 언어("함께 구매하세요") 금지. 밴드=보조(누구에게 필요한지),
   나머지=부위 확장(철봉으로 안 되는 부위). 자사몰 UX 톤에 맞춰 절제된 서술로.
   ⚠️ 카피에 실측 수치(부착률 % 등)는 넣지 않는다 — 값이 변해 과장이 되면 표시광고
      이슈가 되고, public repo라 산출 근거도 남길 수 없어 유지보수가 불가능해진다.

   범위: PRODUCT_NOS 화이트리스트 × COPY 상품명 조각 매칭 = 이중 게이트.
        둘 다 통과 못하면 DOM 미변경. 타 상품 영향 0.
   방식: p.name 뒤에 <div class="fit-addsub"> 삽입. 스킨/상품 데이터 미변경.
        추가상품 목록은 드롭다운 열 때 렌더되므로 MutationObserver로 감시.
   멱등: 같은 항목에 이미 .fit-addsub 있으면 재주입 안 함.
   롤백: ScriptTag DELETE 1콜. 전체 try/catch 격리(에러 나도 페이지 안 깨짐). */
(function () {
  'use strict';

  var PRODUCT_NOS = ['125', '126'];

  // 매칭 키는 "상품명에서 잘 안 바뀌는 최소 조각"만 쓴다.
  // ⚠️ 2026-08-28: AB슬라이드 줄이 한 달간 안 나오고 있었다. 키가
  //    '쿼드 AB슬라이드 초심자용'인데 실제 상품명(20번)은 'AB슬라이드 쿼드 초심자용' —
  //    어순만 다른데 indexOf 가 못 찾고, 못 찾으면 조용히 넘어가도록 만들어 둔 탓에
  //    에러 하나 없이 그 한 줄만 사라졌다. 상품명을 통째로 키에 박지 말 것.
  //    (125·126의 추가상품은 밴드·푸쉬업바·AB슬라이드 3개뿐 → 아래 조각끼리 겹치지 않음)
  var COPY = [
    ['풀업 밴드',   '풀업이 어려운 분들에게 추천'],
    ['푸쉬업바',    '철봉으로는 안 되는 가슴까지'],
    ['AB슬라이드',  '복근까지 채우면 상체 끝']
  ];

  // 상품명 "위"에 얹는 아이브로우(eyebrow) 라벨 — 제품명을 읽기 전에
  // "누구를 위한 것인지"가 먼저 들어오게. 색은 브랜드 라벨 웜그레이.
  var STYLE = 'margin:0 0 3px;font-size:11.5px;line-height:1.4;color:#A8A29E;' +
              'font-family:SUIT,"Plus Jakarta Sans",sans-serif;';

  function currentProductNo() {
    var m = location.search.match(/[?&]product_no=(\d+)/) ||
            location.pathname.match(/\/product\/[^\/]+\/(\d+)(?:\/|$)/);
    return m ? m[1] : null;
  }

  function onTargetProduct() {
    var no = currentProductNo();
    if (!no) return false;
    for (var i = 0; i < PRODUCT_NOS.length; i++) {
      if (PRODUCT_NOS[i] === no) return true;
    }
    return false;
  }

  function copyFor(text) {
    for (var i = 0; i < COPY.length; i++) {
      if (text.indexOf(COPY[i][0]) !== -1) return COPY[i][1];
    }
    return null;
  }

  // 스로틀: MutationObserver가 body 전체를 보므로(우리 주입도 mutation을 유발)
  // 호출 폭주를 막는다. 150ms 안에 재호출되면 무시.
  var lastRun = 0;
  function injectThrottled() {
    var now = +new Date();
    if (now - lastRun < 150) return;
    lastRun = now;
    inject();
  }

  function inject() {
    try {
      if (!onTargetProduct()) return;
      var boxes = document.querySelectorAll('.xans-product-addproduct');
      for (var b = 0; b < boxes.length; b++) {
        var names = boxes[b].querySelectorAll('p.name');
        for (var i = 0; i < names.length; i++) {
          var p = names[i];
          var par = p.parentNode;
          if (!par) continue;
          // 멱등: 같은 컨테이너 안에 이미 우리 요소가 있으면 skip.
          // ⚠️ 위치 기반(nextElementSibling)으로 검사하면 요소가 이동됐을 때
          //    가드가 뚫려 중복 주입된다(2026-07-27 실측). 컨테이너 기준으로 볼 것.
          var dup = false;
          for (var k = 0; k < par.children.length; k++) {
            if (par.children[k].className === 'fit-addsub') { dup = true; break; }
          }
          if (dup) continue;
          var txt = (p.textContent || '').replace(/\s+/g, ' ').trim();
          if (!txt) continue;
          var msg = copyFor(txt);
          if (!msg) continue;               // 지정 안 한 추가상품은 건드리지 않음
          var d = document.createElement('div');
          d.className = 'fit-addsub';
          d.setAttribute('style', STYLE);
          d.textContent = msg;
          par.insertBefore(d, p);           // 상품명 "앞"에 삽입
        }
      }
    } catch (e) {}
  }

  try {
    if (!onTargetProduct()) return;         // 대상 아니면 즉시 종료 — 아무것도 안 함

    if (document.readyState === 'loading')
      document.addEventListener('DOMContentLoaded', inject);
    else inject();

    // 추가상품 목록은 드롭다운을 열 때 렌더된다 → 지연 실행 + 변화 감시
    setTimeout(inject, 400);
    setTimeout(inject, 1200);
    setTimeout(inject, 2500);

    try {
      var mo = new MutationObserver(function () { injectThrottled(); });
      mo.observe(document.body, { childList: true, subtree: true });
      // 사용자가 늦게 열 수 있으므로 freeship_hide(8초)보다 길게 유지
      setTimeout(function () { try { mo.disconnect(); } catch (e) {} }, 60000);
    } catch (e) {}
  } catch (e) {}
})();
