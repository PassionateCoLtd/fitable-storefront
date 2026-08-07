# DEPLOY — pdp_option_autoselect.js (2026-08-07)

필수 옵션에 **고를 것이 하나뿐일 때만** 자동 선택. 라이브 전환(ScriptTag 등록)은 대표가 직접.

## 왜

OPB01(126) 필수 옵션은 선택지가 `출시 기념가 (10000원 할인)` **하나뿐인데 기본 미선택**이다.
차수별 옵션이 품절로 빠지며 실질 1개만 남은 사전예약 구조다.
고객이 네이버·카카오페이 「바로구매」를 먼저 누르면 결제창 대신 알럿만 뜨고 끝난다.

- 2026-08-06 실측: 간편결제 발화 113건 중 **58건(51%)** 이 이 튕김. 사람으로는 하루 약 60명.
- 덤: 그 튕김이 `np/kp_checkout_start` 를 발화시켜 아침리포트 '결제창 열기'를 2배로 부풀렸다
  (2026-08-07 규명, `revenue_delta_explainer.py` 쪽은 이미 소비처에서 거르도록 수정 완료).

옵션이 자동 선택되면 **마찰과 유령 발화가 같이 사라진다.** 그래서 발신부에 유령 차단을
따로 달지 않는다 — 원인을 없애는 쪽이 맞고, 원장에는 흔적이 남아야 다음에 또 셀 수 있다.

## 무엇을 하는가

`select[id^="product_option_id"]` 중 **선택 가능한 옵션이 정확히 1개**인 것만 그 값으로 선택하고
`change` 를 쏜다. 그게 전부다.

- 2개 이상이면 손대지 않는다 — 고객의 선택을 대신하지 않는다.
- 품절 옵션·구분선(`**`)·플레이스홀더(`*`)는 후보에서 제외.
- **추가상품(`addproduct_option_id_*`)은 건드리지 않는다.** 안 사도 되는 항목이라 자동 선택하면
  장바구니에 원치 않는 물건이 붙는다.
- 이미 선택된 상태면 무시. 스킨이 옵션을 늦게 그리는 경우 대비해 0/300/800/1500/3000ms 재시도,
  한 번 성공하면 종료.

## 배포 전 실측 (2026-08-07, 라이브 PDP에 주입해 확인)

| 확인 | 결과 |
|---|---|
| 필수 옵션 자동 선택 | `product_option_id1` → `출시 기념가 (10000원 할인)` ✅ |
| 추가상품 4개 미변경 | `155_1`·`31_2`·`20_1` 전부 `- [필수] …` 그대로 ✅ (`31_2` 는 실옵션 1개인데도 미변경) |
| 총액 갱신 | `0 (0개)` → `69,900원 (1개)` (약 2초 내 정산) ✅ |
| 알럿 | 없음 ✅ |
| 결제 인텐트 비콘 | `id 4990 · npay · product_no 126 · amount 69900 · 14:48:43` ✅ |
| 모바일 스킨 | 같은 id 체계·같은 총액 셀렉터 동작 확인 ✅ |

⚠️ 총액은 `change` 직후가 아니라 **약 2초 뒤에** 정산된다. 자동 선택은 페이지 로드 시점에
돌므로 사람이 누를 때는 이미 정산돼 있다. (선택 직후 1초 안에 누르면 `amount` 가 빌 수 있는데,
그건 이 스크립트가 만든 문제가 아니라 원래 있던 경합이다.)

## 배포

```bash
# 1) dry-run — 무엇을 등록할지만 출력, 아무것도 안 바꾼다
ssh jarvis '~/.openclaw/workspace/.venv/bin/python \
  ~/.openclaw/workspace/marketing/scripts/deploy_pdp_option_autoselect.py --dry-run'

# 2) 라이브 (대표 직접)
ssh jarvis '~/.openclaw/workspace/.venv/bin/python \
  ~/.openclaw/workspace/marketing/scripts/deploy_pdp_option_autoselect.py --apply'

# 3) 발화 검증 — 등록 5분 뒤
ssh jarvis '~/.openclaw/workspace/.venv/bin/python \
  ~/.openclaw/workspace/marketing/scripts/deploy_pdp_option_autoselect.py --verify'
```

`display_location = ["PRODUCT_DETAIL"]`. 같은 src 가 이미 있으면 등록하지 않는다(멱등).

## 롤백

```bash
ssh jarvis '~/.openclaw/workspace/.venv/bin/python \
  ~/.openclaw/workspace/marketing/scripts/deploy_pdp_option_autoselect.py --rollback'
```
`DELETE /scripttags/<script_no>`. DOM 은 `select.value` 만 만지므로 삭제 즉시 원상복구된다.

## 배포 후 볼 것 (1주)

1. `checkout_intent_beacon.db` 의 **amount 빈 비율** — 현재 51%. 떨어져야 성공.
   ```sql
   SELECT date(datetime(created_at,'+9 hours')) d, COUNT(*) fires,
          SUM(amount IS NULL) nul FROM checkout_intent_beacon GROUP BY d ORDER BY d DESC LIMIT 10;
   ```
2. 자사몰 주문수 — 마찰이 사라진 만큼 올라야 한다.
3. 관제판 앵커 `checkout-intent-beacon-amount` 가 조용한지(캡처 사망 감시).

⚠️ 2026-08-07 오후 비콘에 **테스트 발화 6건**(guid `26abe8c1…` 등)이 섞였다. 그날 비교에서 제외할 것.
