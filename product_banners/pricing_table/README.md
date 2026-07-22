# WPB126 가격·일정표 (pricing_stages) — 소스 + 렌더러

**근원 문제(2026-07-15)**: 이 가격표 PNG는 생성기 소스가 유실돼 PNG를 역설계해 재구성함.
이제 소스를 여기 보존한다. 다음 가격/톤 변경은 stageN.html 수정 → `render.py` → CDN 푸시.

## 톤 = 새 스킨 A안 (2026-07-15 통일)
웜블랙 `#171716` 하이라이트 · SUIT · **완전 각짐 radius0** · 웜그레이 `#A8A29E`/`#B4AFA9` ·
품절 판넬 `#DEDFE2`+`#57534E` · 파랑(`#93C5FD`/`#1D4ED8`/`#2563EB`)·Pretendard·라운드 폐기.

## 2단계 시스템
- **stage1** (LIVE): 1·2·2.5차 품절, 3차 얼리버드 진행중(하이라이트, 59,900, 8월초~중순), 9월분 오픈예정, 정식 79,900
- **stage2**: 3차까지 완판 → 9월분 화이트 하이라이트로 교체. **3차 소진 시 수동 스왑**(자동로직 없음).

## 라이브 반영 이력
- v19(ver260722): TF방 7/22 배송일 확정(8/7 컨테이너 입고+당일 1,000건, 8/10 나머지 800건) 반영 — stage1 3차 얼리버드 서브타이틀 "지금 진행 중 · 8월 초~중순 발송" → "지금 진행 중 · 8월 7일부터 순차발송". stage1 라이브 참조 = `raw.githubusercontent.com/SuhanGu0912/widepullup-cdn/main/ver260722/pricing_stages_v19_stage1.png`
- v18(ver260715): A안 리톤. `raw.githubusercontent.com/SuhanGu0912/widepullup-cdn/main/ver260715/pricing_stages_v18_stage1.png`
- 롤백: description 참조를 `ver260709/pricing_stages_v17_stage1.png`로 되돌리면 구버전(v17)로 복귀(CDN에 보존됨).
