# JP GTM 배포 지시 — fjp_track.js 로더 SHA 갱신 (2026-07-22)

> 맥 세션(Jarvis)이 fbp 캡처를 구현·검증·푸시했고, **마지막 GTM 로더 SHA 갱신만** 남음.
> 맥이 이미 라이브 반영한 것: dashboard 재시작·jp_lead_attr.db에 client_ip/user_agent/fbp 컬럼 ADD·CAPI 매칭 보강(ip/ua는 서버 헤더로 이미 수집 시작). **fbp만 이 GTM 갱신 후 수집됨.**

## 대상
- **컨테이너: `GTM-W2H92G8X`** (JP / fitablejp / Wix)
- 변경 태그: `fjp_track.js` 로더(Custom HTML, jsDelivr @SHA 핀)

## 변경 (딱 이것만)
로더 태그 script src SHA 교체:
- **FROM:** `022424993d2ee687fe5f7ebb3ffa4df21bb604ef`
- **TO:**   `2226856ebd693c5106133670f30fbbc52e53ad84`

최종 src:
```
https://cdn.jsdelivr.net/gh/PassionateCoLtd/fitable-storefront@2226856ebd693c5106133670f30fbbc52e53ad84/fjp_track.js
```
(jsDelivr가 신규 SHA 서빙 확인 완료 — fbpCookie 함수 포함.)

## 게시
- **바로 라이브 게시** (draft 아님). 백업→diff→게시→gtm.js 전파(~15분) 확인.

## 검증
1. gtm.js 전파 후 fitablejp.com 로드 소스에 `@2226856…/fjp_track.js` 실렸는지.
2. devtools에서 비콘 payload에 `fbp` 필드 존재(단, `_fbp` 쿠키 있는 세션 = Meta 픽셀 로드된 유입만).
3. (맥이 이어받음) jp_lead_attr.db 신규 리드의 `fbp` 컬럼이 채워지는지 → CAPI가 자동 보강.

## 롤백
로더 src를 `022424993d2ee687fe5f7ebb3ffa4df21bb604ef`로 되돌려 재게시.
(대시보드·DB는 컬럼 추가만이라 롤백 불필요. fbp만 다시 빈값이 됨.)

## 금지선 (동일)
- `GTM-PLKNSLRG`(KR 페이콘) 안 건드림.
- JP엔 GA4 Config/page_view 태그 추가 안 함 — **기존 로더 SHA만** 교체, 새 태그 없음.

## 배경
IG 인앱브라우저가 fbclid/referrer를 스트립한 메타 트래픽(=가짜 오가닉, 3자 교차검증상 오가닉의 ~97%)의 CAPI 매칭 회수용. fbp는 Meta 픽셀이 심는 1st-party 쿠키라 fbclid 유실 세션도 매칭키 확보. em(이미 100%)+ip+ua+fbp로 EMQ 보강. 우선순위 낮음(em 이미 매칭 중, 리포팅 정확도 위주)이나 대표 지시로 전량 구현.
