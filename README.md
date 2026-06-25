# fitable-storefront

핏에이블 자사몰(Cafe24) 스토어프론트 추적/UI 보강 스크립트. jsDelivr → Cafe24 ScriptTags로 주입.

> **수정 방법·운영 가이드·롤백·노션 기록 규칙** → 사내 private repo
> `PassionateCoLtd/fitable-shared` → `operation/HOWTO-Cafe24-수정.md`
> **PDP 측정 이벤트 표·다른 상세페이지에 추적 다는 법·데이터 읽는 법** → 같은 repo `operation/HOWTO-PDP-추적.md`

| 파일 | 역할 |
|---|---|
| `pdp_track.js` | **범용 PDP 퍼널 측정(무수술)** — 진입·스크롤깊이·탭·구매/장바구니·옵션·리뷰도달, (126) 섹션 관심·위치별 CTA. GA4 익명 커스텀이벤트. 상품 추가=`CONFIG`에 한 줄 |
| `ab01_pdp_track.js` | (레거시) ab01 전용 트래커 — `pdp_track.js`로 통합됨 |
| `wpb_social_proof.js` | 상품126 "N명이 기다려요" 사회적 증명 카운터 |
| `wpb_join_result.js` | 상품126 사전예약 가입완료 픽셀 + CPL |
| `wpb_popup_hide.js` | 상품126 상세 사전예약 팝업 숨김 |
| `cart_fix.js` | GA4 add_to_cart / begin_checkout 보강 |
| `cate_guard.js` | 모바일 카테고리 메뉴 JS 에러 가드(안정화) |
| `icid_to_utm.js` | 내부유입(진열·카테고리) icid→utm 변환 |
| `banner_utm.js` | 메인배너 클릭에 utm_medium=banner 부여 |
| `display_utm.js` | 메인 진열 클릭에 utm 부여 |
| `wpb_count.json` | 사회적 증명 카운터 숫자(자동 갱신 데이터) |

스크립트는 브라우저에서 동작하는 공개 코드(시크릿 없음). repo가 public인 이유: jsDelivr CDN이 public github만 서빙.
