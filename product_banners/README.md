# WPB(126) PDP 배너 자산 — 새 스킨 A안 톤앤매너 (2026-07-15)

자사몰 스킨 전면 교체(웜블랙 #171716·SUIT·각짐 radius0·웜그레이) 대응.
아래 배너들은 **Cafe24 상품 데이터**에 저장되어 라이브에 반영되며(레포 서빙 아님),
이 폴더는 그 HTML의 **버전관리 스냅샷**이다. 편집 후 Cafe24 product PUT로 반영.

## A안 공통 팔레트
- FONT: `'SUIT','Plus Jakarta Sans','Apple SD Gothic Neo','Noto Sans KR',sans-serif`
- 다크 배경: `#171716` (웜블랙) · 코너 `radius:0` (각짐)
- 이브로우/라벨: `#A8A29E` (웜그레이) · letter-spacing `.14~.18em`
- 본문 화이트: `#FAFAF9` · 강조 `#ffffff` (700~800)
- 보조/서브: `#78716C` · 판넬 보더 `#3A3835`
- 폐기: 파랑 `#93C5FD`/`#1D4ED8`/`#2563EB`, 라운드 `radius:18/999`, Pretendard

## 파일
- `wpb126_signup_banner.html` — 상세 상단배너(description 필드 최상단, `wpb_signup_banner_*` 마커)
- `wpb126_summary_description.html` — 상품명 아래 요약설명 필드(summary_description)

## 반영 방법 (PUT 정답형식)
`PUT /admin/products/126` body=`{"shop_no":1,"request":{"description": "..."}}`
+ 헤더 `X-Cafe24-Api-Version: 2026-03-01`. (`{"request":{"product":{...}}}` 래퍼는 200 주고 미반영)
롤백 백업: `workspace/backups/pdp126_pre_tone_20260715.json`
