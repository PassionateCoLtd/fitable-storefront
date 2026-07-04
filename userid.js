/* userid.js — GA4 user_id 크로스디바이스 스티칭 (측정 전용·화면 무변경)
 * 목적: 로그인 회원의 Cafe24 암호화 회원식별값(common_member_id_crypt)을 SHA-256 해시해
 *       GA4 user_id 필드로 세팅. (not set)/(data not available) 미귀속 버킷 중
 *       로그인 회원 구매분의 크로스디바이스 세션 스티칭 복원. GA4 스트림 G-V7D156FCFX 전용.
 * 소스(실측 확정, 2026-07-04): window.CAFE24.FRONT_EXTERNAL_SCRIPT_VARIABLE_DATA.common_member_id_crypt
 *       폴백: window.EC_FRONT_EXTERNAL_SCRIPT_VARIABLE_DATA / window.FRONT_EXTERNAL_SCRIPT_VARIABLE_DATA
 *       로그인 시 채워짐(이미 Cafe24 암호화값). 로그아웃=빈 문자열 → no-op(게스트 병합 방지).
 * ★격리: gtag('set',{user_id}) 필드 세팅만. config 재실행/dataLayer.push 전혀 없음
 *   → 어느 GTM 컨테이너도 재초기화/트리거되지 않고 page_view도 안 쏨(GTM 2컨테이너 무교란).
 * ★LOG_ONLY: true면 gtag 대신 console.log만(첫 배포 콘솔검증용). 라이브 DebugView에서
 *   user_id 부착 확인 후 false로 재커밋+PUT. raw 값은 절대 로그 안 함(hash8만).
 * ★PII: raw id는 지역변수에서만 취급. console/localStorage/cookie/dataLayer 어디에도 남기지 않음.
 * 롤백: ScriptTag DELETE 1콜(신규 파일이라 이전 SHA 없음).
 */
(function () {
  'use strict';
  var LOG_ONLY = false; // ★첫 배포는 true(콘솔검증). 라이브 DebugView에서 user_id 부착 확인 후 false로 재커밋+PUT.

  try {
    if (window.__fituid) return; // 재진입/중복 ScriptTag 주입 가드(bfcache 안전, 재해싱 차단)
    window.__fituid = 1;

    if (!(window.crypto && window.crypto.subtle)) return; // 보안컨텍스트 없음(구형/http/일부 인앱웹뷰) → no-op

    // ── 회원 id 획득: 실측 확정 소스 + 폴백 (getMemberId 단일 함수로 소스 격리) ──
    function getMemberId() {
      var v = '';
      try {
        v = (window.CAFE24 && window.CAFE24.FRONT_EXTERNAL_SCRIPT_VARIABLE_DATA &&
             window.CAFE24.FRONT_EXTERNAL_SCRIPT_VARIABLE_DATA.common_member_id_crypt) || '';
      } catch (e) {}
      if (!v) {
        try {
          v = (window.EC_FRONT_EXTERNAL_SCRIPT_VARIABLE_DATA &&
               window.EC_FRONT_EXTERNAL_SCRIPT_VARIABLE_DATA.common_member_id_crypt) || '';
        } catch (e) {}
      }
      if (!v) {
        try {
          v = (window.FRONT_EXTERNAL_SCRIPT_VARIABLE_DATA &&
               window.FRONT_EXTERNAL_SCRIPT_VARIABLE_DATA.common_member_id_crypt) || '';
        } catch (e) {}
      }
      return v;
    }

    // ── sentinel 방어(치명): 게스트/무효값 전부 no-op — 상수 id로 전 익명유저가 병합되는 사고 차단 ──
    function isValid(v) {
      if (!v) return false; // '', 0, null, undefined 전부 여기서 걸러짐
      var s = String(v).trim().toLowerCase();
      if (!s || s === '0' || s === 'guest' || s === 'null' || s === 'undefined') return false;
      return true;
    }

    var raw = getMemberId();
    if (!isValid(raw)) return; // 게스트/미획득 → 아무것도 세팅 안 함(no-op)

    // ── 정규화 + 네임스페이스 접두 → SHA-256 ──
    var normalized = String(raw).trim().toLowerCase();
    var toDigest = 'fitable:' + normalized;

    function toHex(buf) {
      return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    }

    window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(toDigest)).then(function (buf) {
      try {
        var hex = toHex(buf); // 64자 hex — .then() 안에서 완성 후에만 세팅(Promise 동기삽입 금지)
        if (LOG_ONLY) {
          console.log('[userid]', { member: !!raw, source: 'common_member_id_crypt', hash8: hex.slice(0, 8) });
          // ⚠️ raw crypt·풀해시 로그 금지 — hash8(8자)만
        } else if (typeof window.gtag === 'function') {
          window.gtag('set', { 'user_id': hex }); // 필드 세팅만. config 재호출/dataLayer.push 없음
        }
      } catch (e) {}
    }).catch(function () { /* digest 실패 — no-op, 결제/렌더 영향 0 */ });
  } catch (e) { /* 전체 격리 — 어떤 오류도 페이지/결제 흐름에 영향 없음 */ }
})();
