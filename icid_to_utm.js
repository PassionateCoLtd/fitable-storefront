/*
 * icid_to_utm.js — Cafe24 내부유입 추적 보강
 * 배경: 상품진열(product_listmain)·배너·팝업 등 사이트 내부 링크는 Cafe24가 자동으로 icid를
 *       붙이지만(예: ?icid=MAIN.product_listmain_1) 우리 신청 시스템은 utm만 읽어 "추적 안됨"으로
 *       샌다. 착지 시 icid를 utm으로 변환(history.replaceState)해 기존 utm 캡처가 잡게 한다.
 * 안전: utm_source가 이미 있으면(광고 등) 절대 덮지 않음. URL 파라미터만 보강(DOM/서버 무관).
 * 2026-06-05
 */
(function () {
  try {
    if (window.__icid2utm) return; window.__icid2utm = 1;
    var p = new URLSearchParams(location.search);
    var icid = p.get('icid');
    if (!icid) return;                 // 내부유입 표식 없으면 패스 (광고 직링크 등)
    if (p.get('utm_source')) return;   // 이미 utm 있으면(광고) 절대 안 덮음 — 광고 attribution 보호

    var medium = 'internal';
    if (/product_listmain/i.test(icid)) medium = 'product_list';
    else if (/banner|rolling|visual|mainimg/i.test(icid)) medium = 'banner';
    else if (/popup/i.test(icid)) medium = 'popup';
    else if (/category|cate/i.test(icid)) medium = 'category';
    else if (/recommend|relation/i.test(icid)) medium = 'recommend';

    p.set('utm_source', 'onsite');
    p.set('utm_medium', medium);
    p.set('utm_campaign', icid.replace(/[^A-Za-z0-9_.\-]/g, '_').slice(0, 60));

    history.replaceState(null, '', location.pathname + '?' + p.toString() + location.hash);
  } catch (e) {}
})();
