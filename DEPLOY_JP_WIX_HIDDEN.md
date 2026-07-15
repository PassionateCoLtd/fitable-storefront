# JP 배포 지시 — Wix hidden 소스필드(fit_src) + GTM 로더 SHA 갱신 (2026-07-15)

> 그램 세션용. 맥(Jarvis)이 서버측 소스캡처 코드(비콘 fill + 리컨실 병합)를 구현·검증·푸시했다.
> 남은 건 **① Wix 폼에 hidden 필드 1개 추가**와 **② GTM 로더를 새 SHA로 갱신**뿐.

## 배경 (왜)
현 파이프라인은 `sendBeacon`이 우리 서버(ngrok)에 도달해야 소스가 잡힘 → 미도달 시 "추적실패". Wix 폼 자체에 소스를 실으면 **제출 레코드(그라운드트루스)에 소스가 붙어** 비콘과 무관하게 서버측에서 확보(추적실패 복구). 비콘 JS(§8d)는 이미 이 필드를 자동으로 채우도록 배포됨.

## ① Wix 폼에 hidden 필드 추가 (Wix Editor, 로그인 필요)
- 대상 폼: **`makuake_OPB1`** (마쿠아케 사전등록, fitablejp.com)
- 단문 텍스트 필드 1개 추가:
  - **필드 title/label = `fit_src`** (정확히 이 문자열 — 비콘이 이 이름으로 필드를 찾음)
  - **숨김 처리**: Wix "숨김" 속성 또는 CSS `display:none` (사용자에게 안 보이게)
  - **필수 아님**(required off), 기본값 없음
  - 데스크탑/모바일 2폼이면 **양쪽 다** 추가
- 게시(Publish).

### 비콘이 필드를 어떻게 찾나 (셀렉터)
비콘 §8(d) `fillSrc()`는 폼 안에서 아래 순서로 탐색:
```
input[aria-label="fit_src"], textarea[aria-label="fit_src"],
input[placeholder="fit_src"], textarea[placeholder="fit_src"],
input[name*="fit_src" i], textarea[name*="fit_src" i]
```
→ Wix가 title `fit_src`를 aria-label/placeholder/name 중 하나에 반영하면 걸림. **안 걸리면**(값이 안 채워지면) 실제 렌더된 input의 속성(DevTools로 확인)을 회신해줘. 셀렉터 한 줄만 추가하면 됨.

### 검증 (필드 추가 후)
게시된 fitablejp.com 폼에서 DevTools 콘솔:
```js
document.querySelector('form[aria-label="makuake_OPB1"]').querySelector('[aria-label="fit_src"],[placeholder="fit_src"],[name*="fit_src" i]').value
```
→ `"fitsrc1:creative=...&rc=...&us=...&um=...&fb=0|1&lp=/"` 가 찍히면 성공(광고 유입 시 creative/rc 채워짐, 직접방문이면 빈값이어도 정상).

## ② GTM 로더 SHA 갱신 (비콘 fill 코드 배포)
- 컨테이너 **`GTM-W2H92G8X`** (JP), fjp_track.js 로더(Custom HTML, jsDelivr @SHA).
- 로더 src SHA 교체:
  - **FROM:** `bd7b433cb85134bed08888eaeaa50bd7c3b70e78`
  - **TO:**   `022424993d2ee687fe5f7ebb3ffa4df21bb604ef`
- 최종 src:
  ```
  https://cdn.jsdelivr.net/gh/PassionateCoLtd/fitable-storefront@022424993d2ee687fe5f7ebb3ffa4df21bb604ef/fjp_track.js
  ```
- **바로 라이브 게시**(기존 워크플로 동일).

## 순서
①(Wix 필드) → ②(GTM SHA) 순서 무관하나, 둘 다 돼야 서버측 캡처 작동(필드 없으면 비콘이 채울 곳 없음, 구 SHA면 fill 코드 없음).

## 검증 (맥이 이어받음)
- Wix Form Submissions API 신규 제출에 `fit_src=fitsrc1:...` 실렸는지.
- 리컨실 재실행 → 추적실패(untracked) → 0 목표, 항등식 OK 유지.

## 롤백
- GTM 로더 src를 `bd7b433...`로 되돌려 재게시. Wix 필드는 남겨도 무해(안 읽으면 무시). 리컨실은 fit_src 없으면 자동 비콘 폴백(하위호환).

## 금지선
- `GTM-PLKNSLRG`(KR 페이콘 결제매칭) 안 건드림 — 무관.
- JP에 GA4 Config/page_view 태그 추가 안 함 — 이 작업은 기존 로더 SHA만 바꿈 + Wix 필드 1개.
