/* WPB 사전예약(카카오싱크) 가입완료 처리 — 2026-06-10 (자비스 관리)
 * 대상: /member/join_result.html 한정 (그 외 페이지 즉시 종료, ScriptTag display_location=ALL이지만 가드로 무영향)
 * member_id 소스(3중 폴백): EC_FRONT_EXTERNAL_SCRIPT_VARIABLE_DATA → aedi hidden div → xans 변수 div
 *   (스킨의 aedi 블록이 {$member_id}를 .aedi-member-id에 렌더 중 — 스킨 무수정으로 읽기만 함)
 * 동작: member_id가 @k로 끝나는 카카오싱크 가입일 때만
 *   ① "✅ 사전예약 완료" 배너 주입(titleArea 아래) ② Meta 픽셀 CR(eventID=crm_<id>, 서버 CAPI와 dedup)
 *   ③ 자비스 카운트 비콘(/api/preorder/member/joined → CPL 분모)
 * 일반 폼가입(@k 아님)·타 페이지엔 아무것도 안 함. 롤백: 어드민 API scripttags DELETE
 */
(function () {
  if (location.pathname.indexOf('/member/join_result') !== 0) return;
  function getMemberId() {
    try {
      var d = window.EC_FRONT_EXTERNAL_SCRIPT_VARIABLE_DATA;
      if (d && d.member_id) return String(d.member_id);
    } catch (e) {}
    var el = document.querySelector('.aedi-member-id') || document.querySelector('.xans-member-var-id');
    return el ? (el.textContent || '') : '';
  }
  function run() {
    var m = getMemberId().replace(/\s+/g, '');
    if (!/@k$/.test(m)) return;
    try {
      var box = document.createElement('div');
      box.id = 'wpb-join-done';
      box.style.cssText = 'text-align:center;padding:28px 20px 6px;font-family:Pretendard,sans-serif;';
      box.innerHTML =
        '<div style="font-size:22px;font-weight:800;margin-bottom:10px;">✅ 사전예약 신청 완료!</div>' +
        '<p style="margin:0;color:#555;font-size:14px;line-height:1.8;">와이드 풀업바 사전예약이 완료됐어요.<br>7월 1일 오픈 때 카카오톡으로 가장 먼저 알려드릴게요.</p>' +
        '<a href="/product/detail.html?product_no=126" style="display:inline-block;margin-top:16px;padding:13px 22px;background:#008BCC;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">와이드 풀업바 보러가기 →</a>';
      var t = document.querySelector('.titleArea');
      if (t && t.parentNode) t.parentNode.insertBefore(box, t.nextSibling);
      else if (document.body) document.body.insertBefore(box, document.body.firstChild);
    } catch (e) {}
    try { if (window.fbq) window.fbq('track', 'CompleteRegistration', {}, { eventID: 'crm_' + m }); } catch (e) {}
    new Image().src = 'https://fitable-dashboard.ngrok.app/api/preorder/member/joined?member_id=' +
      encodeURIComponent(m) + '&ref_param=pdp_kakao_member';
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
