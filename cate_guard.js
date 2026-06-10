/* 카테고리 메뉴 $allCateObj 레이스 가드 — 2026-06-10 (자비스 관리)
 * 문제: 테마 optimizer 번들 appendSubCate(484줄)가 $allCateObj["cate"+id][3]을
 *       데이터 적재 완료 전에 읽으면 undefined[3] → TypeError → 이후 메뉴 렌더 중단.
 *       (Clarity script_errors 주범, 안드로이드 모바일 집중 — 느린 로드일수록 레이스 폭 큼)
 * 동작: window.$allCateObj 할당 순간을 가로채 Proxy로 감쌈.
 *       있는 키 = 원본 그대로 통과(동작 100% 동일). 없는 키 = throw 대신 빈 문자열 배열
 *       반환([3].length===0 → 해당 항목만 스킵하고 루프 계속) = 순수 방어.
 * 실패 모드: 테마보다 늦게 로드되거나 defineProperty 불가(비구성 속성)면 조용히 no-op.
 *       어떤 경우에도 기존 동작을 바꾸지 않음.
 * 롤백: 어드민 API scripttags DELETE
 */
(function () {
  if (window.__fitableCateGuard) return; window.__fitableCateGuard = 1;
  var SAFE = ['', '', '', '', '', '', '', ''];
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
    var pre = Object.prototype.hasOwnProperty.call(window, '$allCateObj');
    if (pre) cur = wrap(window.$allCateObj);
    Object.defineProperty(window, '$allCateObj', {
      configurable: true,
      get: function () { return cur; },
      set: function (v) { cur = wrap(v); }
    });
  } catch (e) { /* 비구성 속성 등 — no-op, 기존 동작 유지 */ }
})();
