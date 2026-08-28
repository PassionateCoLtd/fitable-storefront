/* qna_mobile_table_fix.js — 모바일 상품 Q&A 목록 표 「제목」 열 붕괴 수리.
 *
 * 증상(2026-08-28 대표 제보): 모바일 상세 → Q&A 탭에서 헤더 「제목」이 세로로 쪼개지고,
 *   제목 글자가 오른쪽 「작성일」 위에 겹쳐 찍힌다. 행 높이도 73/134/57/118/57 로 제각각.
 *
 * 원인: 표의 열 정의(colgroup)는 6칸을 인라인 style 로 못박고 있다
 *   — 번호 70 / 카테고리 134 / 제목 auto / 작성자 140 / 작성일 170 / 조회 70 = 합 584px.
 *   모바일 스킨은 「작성자」와 「조회」 셀에만 display:none 을 건다. 그런데 숨긴 칸의
 *   colgroup 폭은 표 전체 폭에서 빠지지 않는다 → table 이 584px 로 계산되고,
 *   화면(360px)을 넘긴 만큼이 폭이 «유일하게 auto» 인 제목 칸에서 깎여 0px 가 된다.
 *   0px 칸의 내용은 잘리지 않고 흘러넘쳐 옆 칸 위에 그려진다. 세 증상이 전부 이 하나에서 나온다.
 *
 * ⚠️ 표 레이아웃에서 display:none 셀은 구조에서 빠지므로, 실제로 그려지는 4개 셀이
 *   col:nth-child(1)(2)(3)(4) 에 차례로 매핑된다(즉 「작성일」이 4번째 col 의 140px 를 먹는다).
 *   남은 col 5·6 은 내용 없는 유령 칸으로 폭만 더한다 → 이 둘을 0 으로 죽이는 게 핵심.
 *
 * 방식: 모바일(≤767px)에서만 열 폭을 화면 폭에 맞게 다시 지정. CSS 한 덩이 주입이 전부고
 *   DOM·이벤트·마크업은 건드리지 않는다. 스타일은 전역이라 카페24가 표를 다시 그려도 유지된다.
 * 범위: .xans-product-qna 안의 목록 표만. 리뷰 게시판·주문내역 등 같은 스킨의 다른 표는 무관.
 *   PC 는 미디어쿼리 밖 → 1280px 실측에서 수정 전후 수치 완전 동일(6칸 전부 표시, 제목 696px).
 * 실측(iPhone UA 390x844): table 584→360, 제목 칸 0→170px, 제목/작성일 겹침 해소,
 *   행 높이 전부 57 균일, 가로 스크롤 없음(scrollWidth 390 유지). 상품 126·30 동일 확인.
 * 멱등: 같은 id 의 style 이 이미 있으면 skip. 롤백: ScriptTag DELETE 1콜. 전체 try/catch 격리.
 */
(function () {
  'use strict';
  if (window.__qnaTableFix) return;
  window.__qnaTableFix = 1;

  var ID = 'fitable-qna-table-fix';
  var Q = '.xans-product-qna .ec-base-table > table';

  var CSS = [
    '@media screen and (max-width:767px){',
    Q + '{table-layout:fixed !important;width:100% !important;}',
    Q + ' > colgroup > col:nth-child(1){width:42px !important;}',   /* 번호 */
    Q + ' > colgroup > col:nth-child(2){width:70px !important;}',   /* 카테고리 */
    Q + ' > colgroup > col:nth-child(3){width:auto !important;}',   /* 제목 — 남는 폭 전부 */
    Q + ' > colgroup > col:nth-child(4){width:78px !important;}',   /* 작성일(숨은 작성자 칸을 이어받음) */
    Q + ' > colgroup > col:nth-child(5){width:0 !important;}',      /* 유령 칸 */
    Q + ' > colgroup > col:nth-child(6){width:0 !important;}',      /* 유령 칸 */
    Q + ' th,',
    Q + ' td{padding-left:2px !important;padding-right:2px !important;}',
    Q + ' td.subject{word-break:break-all;}',
    /* RE·NEW 딱지가 원본 크기(34~45px)라 제목을 다음 줄로 밀어낸다 */
    Q + ' tbody img{height:12px !important;width:auto !important;vertical-align:middle;margin:0 2px 0 0;}',
    '}'
  ].join('\n');

  try {
    if (document.getElementById(ID)) return;
    var s = document.createElement('style');
    s.id = ID;
    s.type = 'text/css';
    s.appendChild(document.createTextNode(CSS));
    (document.head || document.getElementsByTagName('head')[0] || document.documentElement).appendChild(s);
  } catch (e) {
    /* 스타일 하나 못 넣는다고 페이지를 멈추지 않는다 */
  }
})();
