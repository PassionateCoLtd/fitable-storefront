# fitable-storefront

핏에이블 자사몰(Cafe24) 스토어프론트 추적/UI 보강 스크립트. jsDelivr → Cafe24 ScriptTags로 주입.

> 수정 방법·운영 가이드·롤백·**노션 기록 규칙**은 사내 private repo
> `PassionateCoLtd/fitable-shared` → `operation/HOWTO-Cafe24-수정.md` 참조.

| 파일 | 역할 |
|---|---|
| `cart_fix.js` | GA4 add_to_cart/begin_checkout 보강 |
| `wpb_popup_hide.js` | 상품 126 상세 사전예약 팝업 숨김 |
| `icid_to_utm.js` | 내부유입(진열·카테고리) icid→utm 변환 |
| `banner_utm.js` | 메인배너 클릭에 utm_medium=banner 부여 |

스크립트는 브라우저에서 동작하는 공개 코드(시크릿 없음). repo가 public인 이유: jsDelivr CDN이 public github만 서빙.
