# JP GTM 배포 지시 — fjp_track.js 로더 SHA 갱신 (2026-07-15)

> 그램 세션용 실행 지시. 맥 세션(Jarvis)이 JP 유입소스 상세 캡처를 구현·검증·푸시했고, 마지막 GTM 로더 SHA 갱신만 남음.

## 대상
- **컨테이너: `GTM-W2H92G8X`** (JP / fitablejp / Wix)
- 변경 태그: `fjp_track.js` 로더(Custom HTML, jsDelivr @SHA 핀)

## 변경 (딱 이것만)
로더 태그의 script src SHA를 교체:
- **FROM:** `0d240823800cbb42485cfb72cdb5e81081a6292b`
- **TO:**   `bd7b433cb85134bed08888eaeaa50bd7c3b70e78`

즉 최종 src:
```
https://cdn.jsdelivr.net/gh/PassionateCoLtd/fitable-storefront@bd7b433cb85134bed08888eaeaa50bd7c3b70e78/fjp_track.js
```

## 게시
- **바로 라이브 게시** (draft 아님). 백업→diff→게시→gtm.js 전파(~15분) 확인 워크플로우 그대로.

## 검증
1. gtm.js 전파 후 fitablejp.com 로드 소스에 `@bd7b433…/fjp_track.js` 실렸는지.
2. (맥이 이어받음) jp_lead_attr.db 신규 리드의 `ref_class`가 direct 외 실제 경로(instagram/google/makuake…)로 찍히는지.

## 롤백
로더 src를 `0d240823800cbb42485cfb72cdb5e81081a6292b`로 되돌려 재게시. (대시보드·DB는 컬럼 추가만이라 롤백 불필요.)

## 금지선 (그램 세션 자체 규칙과 동일 — 지켜짐)
- `GTM-PLKNSLRG`(KR 페이콘 결제매칭) 안 건드림 — 이 작업과 무관.
- JP엔 GA4 Config/page_view 태그 추가 안 함 — 이 작업은 **기존 로더의 SHA만** 바꿈, 새 태그 없음.

## 배경 (참고)
유입소스 상세 캡처(referrer 분류 + 전체 UTM + gclid/yclid 등 클릭ID + first/last-touch) + 추적실패 완화(submit 트리거). 코덱스+딥리즈너 2중 리뷰 반영(ad_lost 판정·other 접기·direct 덮어쓰기·ALTER 검증). jsDelivr가 `bd7b433` 이미 서빙 확인 완료.
