/* wpb_social_proof.js — WPB01(126) 사전알림 CTA 위 신청자 신뢰 라인 — 2026-06-11 (자비스 관리)
 * 대상: product_no=126 상품상세 한정(그 외 즉시 종료). "이미 N명이 기다리고 있어요" 1줄을
 *   카카오 신청 CTA(#wpb-kakao-primary) 바로 위에 주입. N = jsDelivr wpb_count.json(@main, 크론 갱신).
 * 감도: 다크 CTA 패널(#0A0A0A)에 native — #008BCC 점 + 무채색 라이트 텍스트 + 흰 숫자.
 *   박스·이모지·빨강·느낌표 없음. 사전예약 밴드왜건(검증) 프레이밍.
 * 안전: DOM 1요소 삽입만(서버/DB/신청 무통신). floor 가드(<500 미표시), 숫자 fetch 실패=라인 미표시.
 *   try/catch 격리, 중복 가드. 롤백: 어드민 API scripttags DELETE.
 */
(function () {
  if (window.__wpbSocialProof) return; window.__wpbSocialProof = 1;
  try {
    var path = location.pathname, qs = location.search;
    var isTarget = /\/126\//.test(path) || /[?&]product_no=126(&|$)/.test(qs);
    if (!isTarget) return;

    var FLOOR = 500; // 데이터 글리치/저값 노출 방지
    // 카운트는 raw github(브랜치 HEAD·max-age 300s·ACAO:*)에서 — jsDelivr @main은 ref 캐시 ~12h라 부적합.
    var COUNT_URL = 'https://raw.githubusercontent.com/PassionateCoLtd/fitable-storefront/main/wpb_count.json';

    function build(total) {
      var n = Number(total).toLocaleString('en-US');
      var w = document.createElement('div');
      w.id = 'wpb-social-proof';
      w.style.cssText = "margin:4px 0 22px;text-align:center;" +
        "font-family:'Pretendard Variable',Pretendard,sans-serif;" +
        "font-size:13px;line-height:1.5;color:#9AA7B8;letter-spacing:-0.01em;";
      w.innerHTML =
        '<span style="display:inline-block;width:5px;height:5px;border-radius:50%;' +
          'background:#008BCC;vertical-align:middle;margin-right:7px;"></span>' +
        '이미 <strong style="color:#fff;font-weight:700;">' + n + '명</strong>이 기다리고 있어요';
      return w;
    }

    function place(node) {
      if (document.getElementById('wpb-social-proof')) return true;
      var ref = document.getElementById('wpb-kakao-primary') ||
                document.getElementById('wpb-kakao-cta');
      if (!ref || !ref.parentNode) return false;
      ref.parentNode.insertBefore(node, ref); // CTA 바로 위
      return true;
    }

    fetch(COUNT_URL, { cache: 'default' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var total = d && (d.total != null ? d.total : d.count);
        if (!total || total < FLOOR) return; // graceful: 미표시
        var node = build(total), tries = 0;
        if (place(node)) return;
        var iv = setInterval(function () {
          if (place(node) || ++tries > 40) clearInterval(iv);
        }, 150);
      })
      .catch(function () { /* graceful: 라인 미표시 */ });
  } catch (e) {}
})();
