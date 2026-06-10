/* 카테고리 메뉴 $allCateObj 레이스 가드+수리 v2 — 2026-06-10 (자비스 관리)
 * 문제: 테마 cateJsPkg가 AJAX(SubCategory)로 $allCateObj를 채우는데, 150ms setTimeout 후
 *       appendSubCate가 무조건 실행됨. 느린 기기/네트워크면 빈 객체 → 484줄
 *       $allCateObj["cate"+id][3] = undefined[3] → TypeError → 메뉴 빌드+토글 전부 사망.
 *       (Clarity script_errors 주범, 안드로이드 집중)
 * 전략 2겹:
 *  ① 방어: window.$allCateObj 접근자+Proxy — 없는 키 읽기 시 throw 대신 안전배열.
 *     (이 스크립트가 테마 init보다 먼저 실행된 경우 throw 자체를 차단)
 *  ② 수리: DOM ready+400ms부터 폴링. AJAX로 데이터가 채워진 뒤, 자식이 있어야 할
 *     메뉴 li에 <ul>이 없으면(=빌드 실패) 테마 appendSubCate와 동일 마크업으로 재구축
 *     + 토글(slideToggle) 바인딩. 테마가 정상 빌드했으면 아무것도 안 함(이중빌드 차단).
 * 실패 모드: 어떤 단계든 에러 시 조용히 중단 — 기존 동작 그대로.
 * 롤백: 어드민 API scripttags DELETE (script_no 1781073925718814)
 */
(function () {
  if (window.__fitableCateGuard) return; window.__fitableCateGuard = 2;
  var SAFE = ['', '', '', ''];

  /* ① 방어 */
  function wrap(v) {
    if (!v || typeof v !== 'object' || typeof Proxy === 'undefined') return v;
    try {
      return new Proxy(v, {
        get: function (t, k) {
          if (typeof k === 'string' && k.indexOf('cate') === 0 && !(k in t)) return SAFE;
          return t[k];
        }
      });
    } catch (e) { return v; }
  }
  try {
    var cur;
    if (Object.prototype.hasOwnProperty.call(window, '$allCateObj')) cur = wrap(window.$allCateObj);
    Object.defineProperty(window, '$allCateObj', {
      configurable: true,
      get: function () { return cur; },
      set: function (v) { cur = wrap(v); }
    });
  } catch (e) { /* 비구성 속성 등 — 방어층만 포기, 수리층은 계속 */ }

  /* ② 수리 */
  function jqq() { return window.jq || window.jQuery || null; }

  function repair() { // true=종료, false=재시도
    var obj = window.$allCateObj;
    if (!obj) return false;
    var keys = Object.keys(obj);
    if (!keys.length) return false;                       // AJAX 아직 → 재시도
    var root = document.querySelector('#category .position > ul');
    if (!root) return true;                               // 이 페이지에 메뉴 없음

    // childMap 로컬 구축 (테마 pushChildCate 동일 로직, 원본 무변형)
    var childMap = {};
    for (var i = 0; i < keys.length; i++) {
      var v = obj[keys[i]];
      if (!v || v[1] == null || v[1] == 1) continue;      // parent==1 → 최상위
      (childMap[v[1]] = childMap[v[1]] || []).push(v[0]);
    }

    // 빌드 실패 감지: 자식이 있어야 할 li인데 하위 <ul>이 없다
    var lis = root.querySelectorAll(":scope > li[id*='cate']");
    var broken = false;
    for (var i = 0; i < lis.length; i++) {
      var id = lis[i].getAttribute('data-cate');
      if (childMap[id] && childMap[id].length && !lis[i].querySelector(':scope > ul')) { broken = true; break; }
    }
    if (!broken) return true;                             // 테마가 정상 빌드 → 손대지 않음

    // 재구축 (테마 appendSubCate 마크업 동일: <span></span><ul><li id data-cate><a>)
    var jQ = jqq();
    function build(li, depth) {
      var id = li.getAttribute('data-cate');
      var kids = childMap[id] || [];
      if (!kids.length || li.querySelector(':scope > ul')) return;
      var span = document.createElement('span');
      var ul = document.createElement('ul');
      li.appendChild(span); li.appendChild(ul);
      for (var i = 0; i < kids.length; i++) {
        var c = kids[i], e = obj['cate' + c];
        var cli = document.createElement('li');
        cli.id = 'cate' + c; cli.setAttribute('data-cate', String(c));
        var a = document.createElement('a');
        a.href = '/product/list.html?cate_no=' + c;
        a.textContent = e ? e[2] : '';
        cli.appendChild(a); ul.appendChild(cli);
        if (depth < 3) build(cli, depth + 1);
      }
      // 토글 — 테마 toggleSubCate 동일 동작. 우리가 만든 span에만 바인딩(이중 바인딩 없음)
      if (jQ) {
        jQ(span).on('click', function () {
          jQ(this).parent().find('> ul').slideToggle();
          jQ(this).toggleClass('on');
        });
      } else {
        span.addEventListener('click', function () {
          var u = this.parentNode.querySelector(':scope > ul');
          if (u) u.style.display = (getComputedStyle(u).display === 'none') ? 'block' : 'none';
          this.classList.toggle('on');
        });
      }
    }
    for (var i = 0; i < lis.length; i++) build(lis[i], 1);
    return true;
  }

  var tries = 0;
  function tick() {
    tries++;
    var done = true;
    try { done = repair(); } catch (e) { /* 수리 에러 → 중단(무해 우선) */ }
    if (!done && tries < 40) setTimeout(tick, 500);       // 최대 ~20초 폴링
  }
  // 테마의 ready+150ms 시도가 끝난 뒤에 판정하도록 +400ms
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', function () { setTimeout(tick, 400); });
  else setTimeout(tick, 400);
})();
