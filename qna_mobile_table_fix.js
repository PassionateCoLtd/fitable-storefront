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
 * 🔴 방식 선택의 근거 — 처음엔 `col:nth-child(N)` 로 칸마다 폭을 새로 지정했다. 즉
 *   «숨은 셀이 빠지면 남은 셀이 앞 칸 번호로 당겨진다» 는 전제 위에 선 코드였다.
 *   Chromium 은 그대로 동작했지만 **WebKit(아이폰 사파리)은 다르게 매핑해서 제목 칸이
 *   170px 가 아니라 57px 에 그쳤다**(행 높이도 69/83/56/69/56 로 안 고쳐짐).
 *   그래서 전제 자체를 버렸다. 지금 방식은 열 번호를 하나도 쓰지 않는다 —
 *   못박힌 폭을 전부 풀고(col{width:auto}) 표를 화면 폭에 가둘 뿐이다.
 *   내용이 없는 유령 칸은 auto 레이아웃에서 저절로 0 이 된다.
 *   ⚠️ 이 표를 다시 손볼 일이 있어도 «몇 번째 칸» 으로 지목하지 말 것. 엔진마다 갈린다.
 *
 * 범위: .xans-product-qna 안의 목록 표만. 리뷰 게시판·주문내역 등 같은 스킨의 다른 표는 무관.
 *   PC 는 미디어쿼리(≤767px) 밖 → 1280px 실측에서 수정 전후 수치 완전 동일(6칸 전부 표시).
 *   문의 0건이라 표가 아예 없는 상품(155 등)은 규칙이 걸릴 대상이 없어 무영향.
 *
 * 실측(390x844, Chromium·WebKit 양쪽 동일): table 584→360, 제목 칸 0→177px,
 *   제목/작성일 겹침 해소, 행 높이 균일, 가로 스크롤 없음(scrollWidth 390 유지).
 *   최악 케이스 5종(비밀글 자물쇠 / 첨부 아이콘 / 공백 없는 긴 제목 / 아이콘 3개 동시 /
 *   긴 카테고리명) 두 엔진 모두 겹침 0·넘침 0. 상품 126·30 확인.
 *
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
    /* 핵심 2줄 — 못박힌 열 폭을 풀고 표를 화면 안에 가둔다 */
    Q + '{width:100% !important;table-layout:auto !important;}',
    Q + ' > colgroup > col{width:auto !important;}',
    /* 좁은 화면에서 여백이 제목 자리를 먹지 않게 */
    Q + ' th,',
    Q + ' td{padding-left:3px !important;padding-right:3px !important;}',
    /* 공백 없는 긴 제목도 칸 안에서 접히게 */
    Q + ' td.subject{word-break:break-all;}',
    /* 헤더와 날짜는 접히면 오히려 지저분하다 */
    Q + ' th,',
    Q + ' td.txtInfo{white-space:nowrap !important;}',
    /* RE·NEW·비밀글 딱지가 원본 크기(34~45px)라 제목을 다음 줄로 밀어낸다.
       본문 이미지까지 줄이지 않도록 제목 칸 안으로만 한정 */
    Q + ' td.subject img{height:12px !important;width:auto !important;vertical-align:middle;}',
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
