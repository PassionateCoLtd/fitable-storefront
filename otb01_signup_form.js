/* otb01_signup_form.js — OTB01(테이블바이크 오브제) 반응테스트 1단계 「연락처 1칸 신청」 인라인 폼.
   대표 설계(2026-09-02): 퍼널 2단 — ①연락처 제출=signup_submit(수요) ②완료화면 30초 설문=survey_complete(이유).
   도메인 이동 없이 상세 안에서 모달로 처리 → 메타 픽셀 컨텍스트 유지.

   대상 상품 가드는 TARGETS(배포 스크립트가 실제 product_no로 치환).
   ⛔ 스킨 커스텀 JS(optimizer_user.php)가 buy_btn/cart_btn 클릭을 캡처리스너로 감시하고
      id/class에 "option" 포함 요소를 MutationObserver로 지운다 — 우리 요소엔 절대 그 토큰들 안 씀.
   ⛔ DOM remove() 금지 — 숨김은 전부 style.display='none'만.
   z-index: 오버레이 1250 / 모달 1300 (스킨 .mo-menu 9999·채널톡·.fit-order-dock 999 와 안 겹치게). */
(function () {
  if (window.__otb01form) return;
  window.__otb01form = true;

  try {
    // ─── 대상 상품 가드 (pdp155_pricehide.js 패턴: 쿼리 + SEO 경로) ───
    var TARGETS = ['176'];
    function readCookie(k) {
    try {
      var m = document.cookie.match(new RegExp('(?:^|; )' + k + '=([^;]*)'));
      return m ? decodeURIComponent(m[1]) : '';
    } catch (e) { return ''; }
  }

  function pno() {
      var mm = location.search.match(/[?&]product_no=(\d+)/) ||
               location.pathname.match(/\/product\/[^\/]+\/(\d+)(?:\/|$)/);
      return mm ? mm[1] : '';
    }
    if (TARGETS.indexOf(pno()) === -1) return;

    // ─── 설정 (config/otb01_test.json 값 그대로 박음 — 브라우저는 서버 config 못 읽음) ───
    var CFG = {
      ENDPOINT: 'https://fitable-dashboard.ngrok.app/api/otb01/signup',
      VIEWFORM_URL: 'https://docs.google.com/forms/d/e/1FAIpQLSc9UPRzbGt6gG8_wTQqXB75LZMai0jsncnYMw-wKjv13oUtJw/viewform',
      CONFIRM_ENTRY: 'entry.2069746961',
      PHONE_ENTRY: 'entry.1277735863',   // 설문 「휴대폰 번호」 칸 — 신청에서 받은 값을 그대로 채운다
      DEFAULT_SOURCE: 'direct',
      DEFAULT_CONTENT: 'none',
      SESSION_KEY: 'otb01_utm',
      TIMEOUT_MS: 4000
    };

    // ─── 유틸 ───
    function sanitizeCode(raw) {
      return String(raw || '').replace(/[^A-Za-z0-9_.\-]/g, '').slice(0, 100);
    }

    /* 확인 코드 + 휴대폰 번호를 미리 채운 설문 주소 — 신청에서 받은 번호를 또 묻지 않는다.
       ⚠️ 구글 로그인 상태로 «작성 중이던 응답»이 남아 있으면 구글이 초안을 복원하며
          주소의 프리필을 통째로 버린다(2026-09-02 실측). 비로그인 사용자에겐 정상 반영. */
    function buildSurveyUrl(code, phone) {
      var q = [];
      var c = sanitizeCode(code);
      if (c) q.push(CFG.CONFIRM_ENTRY + '=' + encodeURIComponent(c));
      var p = String(phone || '').replace(/\D/g, '');
      if (p.length >= 10 && p.length <= 11) q.push(CFG.PHONE_ENTRY + '=' + encodeURIComponent(p));
      if (!q.length) return CFG.VIEWFORM_URL;
      return CFG.VIEWFORM_URL + '?usp=pp_url&' + q.join('&');
    }

    /* 서버가 준 설문 주소에 휴대폰 번호만 덧붙인다(확인 코드는 서버가 이미 붙여 준다). */
    function withPhone(url, phone) {
      var p = String(phone || '').replace(/\D/g, '');
      if (!url || p.length < 10 || p.length > 11) return url;
      if (url.indexOf(CFG.PHONE_ENTRY + '=') !== -1) return url;
      return url + (url.indexOf('?') === -1 ? '?usp=pp_url&' : '&') +
             CFG.PHONE_ENTRY + '=' + encodeURIComponent(p);
    }

    // KST yymmddHHMM (기기 로컬 타임존과 무관하게 항상 한국시간 기준)
    function kstStamp() {
      try {
        var parts = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Seoul', hourCycle: 'h23',
          year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
        }).formatToParts(new Date());
        var m = {};
        for (var i = 0; i < parts.length; i++) m[parts[i].type] = parts[i].value;
        return '' + m.year + m.month + m.day + m.hour + m.minute;
      } catch (e) {
        var d = new Date();
        return '' + d.getFullYear() % 100 + ('0' + (d.getMonth() + 1)).slice(-2) +
          ('0' + d.getDate()).slice(-2) + ('0' + d.getHours()).slice(-2) + ('0' + d.getMinutes()).slice(-2);
      }
    }

    function getUtm() {
      try {
        var stored = sessionStorage.getItem(CFG.SESSION_KEY);
        if (stored) {
          var parsed = JSON.parse(stored);
          if (parsed && parsed.source) return parsed;
        }
      } catch (e) {}
      var qp;
      try { qp = new URLSearchParams(location.search); } catch (e) { qp = null; }
      var source = (qp && qp.get('utm_source')) || CFG.DEFAULT_SOURCE;
      var content = (qp && qp.get('utm_content')) || CFG.DEFAULT_CONTENT;
      var utm = { source: source, content: content };
      try { sessionStorage.setItem(CFG.SESSION_KEY, JSON.stringify(utm)); } catch (e) {}
      return utm;
    }

    function makeCode(utmSource, utmContent, ctaLocation) {
      return sanitizeCode(utmSource + '-' + utmContent + '-' + ctaLocation + '-' + kstStamp());
    }

    function formatPhoneDisplay(v) {
      var d = String(v || '').replace(/\D/g, '').slice(0, 11);
      if (d.length < 4) return d;
      if (d.length < 8) return d.slice(0, 3) + '-' + d.slice(3);
      return d.slice(0, 3) + '-' + d.slice(3, 7) + '-' + d.slice(7, 11);
    }

    function pushDL(event, extra) {
      try {
        window.dataLayer = window.dataLayer || [];
        var payload = { event: event };
        for (var k in extra) if (extra.hasOwnProperty(k)) payload[k] = extra[k];
        window.dataLayer.push(payload);
      } catch (e) {}
    }

    function fireGtag(event, extra) {
      try { if (typeof window.gtag === 'function') window.gtag('event', event, extra || {}); } catch (e) {}
    }

    function fireFbLead(ctaLocation, code) {
      /* 광고 신호(Lead)는 «서버»가 보낸다 — dashboard/routes/otb01.py::_send_capi_lead.
         서버는 «처음 저장된 신청»일 때만 보내므로 같은 사람이 다른 기기에서 다시 넣어도
         한 번만 잡힌다. 브라우저에서 같이 쏘면 그 판단을 우회해 광고 수가 부풀려진다.
         (2026-09-03 코덱스 점검) */
    }

    function postWithTimeout(url, payload, ms) {
      return new Promise(function (resolve) {
        var settled = false;
        var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        var timer = setTimeout(function () {
          if (settled) return;
          settled = true;
          try { if (controller) controller.abort(); } catch (e) {}
          resolve({ ok: false, reason: 'timeout' });
        }, ms);
        var opts = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          /* 브라우저 기본값은 다른 사이트로 갈 때 주소 뒷부분(utm)을 지워 보낸다 →
             서버의 「광고에서 왔다」 대조가 영영 실패했다(2026-09-03 실측). 통째로 보낸다(주소에 비밀 없음). */
          referrerPolicy: 'unsafe-url'
        };
        if (controller) opts.signal = controller.signal;
        try {
          fetch(url, opts).then(function (resp) {
            if (settled) return;
            resp.json().then(function (data) {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              resolve({ ok: true, status: resp.status, data: data });
            }).catch(function () {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              resolve({ ok: false, reason: 'bad_json' });
            });
          }).catch(function (err) {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve({ ok: false, reason: 'network', err: String(err) });
          });
        } catch (e) {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve({ ok: false, reason: 'exception' });
          }
        }
      });
    }

    // ─── 모달 DOM (최초 1회 생성 후 재사용, remove() 없이 display 토글만) ───
    var els = null;

    function buildModal() {
      if (els) return els;

      var overlay = document.createElement('div');
      overlay.id = 'otb01-overlay';
      overlay.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(11,11,13,.55);' +
        'z-index:1250;';

      var modal = document.createElement('div');
      modal.id = 'otb01-modal';
      modal.style.cssText = 'display:none;position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);' +
        'z-index:1300;width:min(360px,86vw);max-height:86vh;overflow-y:auto;background:#fff;' +
        'border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.25);' +
        "font-family:'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif;padding:26px 22px 22px;";

      var closeBtn = document.createElement('button');
      closeBtn.id = 'otb01-close';
      closeBtn.type = 'button';
      closeBtn.textContent = '×';
      closeBtn.setAttribute('aria-label', '닫기');
      closeBtn.style.cssText = 'position:absolute;top:10px;right:14px;border:0;background:transparent;' +
        'font-size:22px;line-height:1;color:#9a9ea6;cursor:pointer;padding:6px;';
      closeBtn.onclick = function () { hideModal(); };

      // 1) 신청 폼 패널
      var formPanel = document.createElement('div');
      formPanel.id = 'otb01-form-panel';

      var title = document.createElement('div');
      title.textContent = '사전예약 알림신청';
      title.style.cssText = 'font-size:18px;font-weight:700;color:#111114;margin:4px 0 6px;';

      // 번호만 받는 화면이라 «왜 주는지»가 없으면 이탈한다 — 한 줄로 약속을 적는다(대표 지시 2026-09-03).
      var titleSub = document.createElement('div');
      titleSub.textContent = '사전예약 오픈 시 가장 먼저 안내드립니다.';
      titleSub.style.cssText = 'font-size:13px;color:#5b5f68;line-height:1.5;margin:0 0 2px;';

      /* 설문을 «신청 전»에 예고한다 (2026-09-03 실측 대응).
         번호를 낸 7명 중 설문 창을 연 사람이 2명(29%)뿐이었다. 원인은 설문이 길어서가 아니라
         여기서 설문 이야기를 한 글자도 안 해 놓고, 완료화면에서 갑자기 버튼을 내밀기 때문이다.
         미리 말해두면 설문은 «추가 요구»가 아니라 «예고된 과정»이 된다. */
      var titleSub2 = document.createElement('div');
      titleSub2.textContent = '이어지는 1분 설문까지 마치시면 3만원 할인쿠폰을 드립니다.';
      titleSub2.style.cssText = 'font-size:13px;font-weight:700;color:#111114;line-height:1.5;margin:0 0 14px;';

      var phoneInput = document.createElement('input');
      phoneInput.id = 'otb01-phone';
      phoneInput.type = 'tel';
      phoneInput.inputMode = 'numeric';
      phoneInput.placeholder = '휴대폰 번호 (- 없이 입력)';
      phoneInput.autocomplete = 'tel';
      phoneInput.style.cssText = 'width:100%;box-sizing:border-box;padding:13px 14px;font-size:15px;' +
        'border:1px solid #dcdfe4;border-radius:10px;outline:none;margin-bottom:12px;';
      phoneInput.addEventListener('input', function () {
        var caretAtEnd = phoneInput.selectionStart === phoneInput.value.length;
        phoneInput.value = formatPhoneDisplay(phoneInput.value);
        if (caretAtEnd) {
          try { phoneInput.setSelectionRange(phoneInput.value.length, phoneInput.value.length); } catch (e) {}
        }
      });

      var consentLabel = document.createElement('label');
      consentLabel.style.cssText = 'display:flex;align-items:flex-start;gap:8px;font-size:12.5px;' +
        'color:#5b5f68;line-height:1.5;margin-bottom:16px;cursor:pointer;';
      var consentCheck = document.createElement('input');
      consentCheck.id = 'otb01-consent';
      consentCheck.type = 'checkbox';
      consentCheck.style.cssText = 'margin-top:2px;flex:none;width:16px;height:16px;cursor:pointer;';
      var consentText = document.createElement('span');
      consentText.textContent = '[필수] 개인정보 수집·이용 동의 — 목적: 사전예약 오픈 안내·할인쿠폰 지급·응답 분석, ' +
        '보유기간: 수집일로부터 3개월';
      consentLabel.appendChild(consentCheck);
      consentLabel.appendChild(consentText);

      var errorMsg = document.createElement('div');
      errorMsg.id = 'otb01-error';
      errorMsg.style.cssText = 'display:none;font-size:12.5px;color:#e0463f;margin:-8px 0 12px;';

      var submitBtn = document.createElement('button');
      submitBtn.id = 'otb01-submit';
      submitBtn.type = 'button';
      submitBtn.textContent = '사전예약 알림신청';
      submitBtn.style.cssText = 'width:100%;padding:14px;font-size:15.5px;font-weight:700;color:#fff;' +
        'background:#0B0B0D;border:0;border-radius:10px;cursor:pointer;transition:opacity .15s;';
      // ⛔ 위임 리스너에 의존하지 말 것 — 아래 modal 의 stopPropagation 이 document 까지 못 가게 막는다.
      //    (2026-09-02 실측: 버튼을 눌러도 신청이 통째로 안 나갔다. closeBtn·surveyBtn 처럼 직접 바인딩한다.)
      submitBtn.onclick = function () {
        submitSignup(modal.getAttribute('data-cta-location') || 'top');
      };

      var notice = document.createElement('div');
      notice.style.cssText = 'text-align:center;font-size:11.5px;color:#9a9ea6;margin-top:10px;';

      formPanel.appendChild(title);
      formPanel.appendChild(titleSub);
      formPanel.appendChild(titleSub2);
      formPanel.appendChild(phoneInput);
      formPanel.appendChild(consentLabel);
      formPanel.appendChild(errorMsg);
      formPanel.appendChild(submitBtn);
      formPanel.appendChild(notice);

      // 2) 완료 패널 (신청 성공 시에만 노출 — 실패 시엔 이 패널 안 보여주고 바로 설문으로 리다이렉트)
      var successPanel = document.createElement('div');
      successPanel.id = 'otb01-success';
      successPanel.style.cssText = 'display:none;text-align:center;';
      /* ⛔ 여기서 「완료됐습니다」로 «끝»을 선언하지 않는다 (2026-09-03 실측 대응).
         옛 문구가 끝을 선언해 놓고 버튼을 하나 더 내밀었더니, 번호를 낸 7명 중 5명이
         버튼을 아예 누르지 않았다. 아직 한 걸음 남았다고 «보여주는» 것이 이 화면의 일이다. */
      var stepDots = document.createElement('div');
      stepDots.style.cssText = 'display:flex;align-items:center;justify-content:center;margin:2px 0 6px;';
      function mkDot() {
        var el = document.createElement('span');
        el.style.cssText = 'width:9px;height:9px;border-radius:50%;background:#2563EB;flex:none;';
        return el;
      }
      var stepBar = document.createElement('span');
      stepBar.style.cssText = 'width:46px;height:2px;background:#2563EB;flex:none;';
      stepDots.appendChild(mkDot());
      stepDots.appendChild(stepBar);
      stepDots.appendChild(mkDot());

      var stepText = document.createElement('div');
      stepText.textContent = '2단계 중 2단계';
      stepText.style.cssText = 'font-size:11.5px;font-weight:700;color:#2563EB;text-align:center;margin:0 0 12px;';

      var successTitle = document.createElement('div');
      successTitle.textContent = '번호 확인했습니다\n마지막 1분 남았어요';
      successTitle.style.cssText = 'font-size:18px;font-weight:700;color:#111114;margin:0 0 10px;' +
        'text-align:center;line-height:1.45;white-space:pre-line;';

      /* 쿠폰 «조건»은 버튼 아래 회색 글씨가 아니라 버튼 «위»에 읽히는 크기로 둔다.
         옛 화면은 「설문을 마쳐야 쿠폰이 나간다」를 11.5px 회색으로 버튼 밑에 뒀다 — 아무도 안 읽는다. */
      var successCond = document.createElement('div');
      successCond.textContent = '3만원 할인쿠폰은\n설문을 마치신 분께 드립니다';
      successCond.style.cssText = 'font-size:13px;font-weight:700;color:#111114;text-align:center;' +
        'line-height:1.55;margin:0 0 12px;white-space:pre-line;';

      /* ⛔ 「12월」을 다시 말하지 않는다 — 신청을 막 끝낸 사람에게 석 달 뒤 날짜를 들이대면
            그 자리에서 나간다(대표 지시 2026-09-02). 일정은 상단·고정바에서 이미 말하고 있다.
         쿠폰이 «어떻게 생긴 물건인지»(시리얼 번호·등록 방법)는 지금 알 필요가 없다 —
         그건 쿠폰 문자를 보낼 때 그 문자 안에서 말한다(대표 지시 2026-09-03). */
      var successNote = document.createElement('div');
      successNote.textContent = '사전예약이 열릴 때 문자로 보내드립니다.\n가장 먼저 알려드리겠습니다.';
      successNote.style.cssText = 'font-size:11.5px;color:#9a9ea6;margin:14px 0 0;line-height:1.7;' +
        'text-align:center;white-space:pre-line;';

      var surveyBtn = document.createElement('button');
      surveyBtn.id = 'otb01-survey-btn';
      surveyBtn.type = 'button';
      surveyBtn.textContent = '마지막 1분 · 3만원 쿠폰 받기';
      surveyBtn.style.cssText = 'width:100%;padding:14px;font-size:15.5px;font-weight:700;color:#fff;' +
        'background:#2563EB;border:0;border-radius:10px;cursor:pointer;';

      successPanel.appendChild(stepDots);
      successPanel.appendChild(stepText);
      successPanel.appendChild(successTitle);
      successPanel.appendChild(successCond);
      successPanel.appendChild(surveyBtn);
      successPanel.appendChild(successNote);

      modal.appendChild(closeBtn);
      modal.appendChild(formPanel);
      modal.appendChild(successPanel);
      overlay.appendChild(modal);
      // overlay 클릭(바깥 영역)으로 닫기 — 모달 내부 클릭은 버블 차단
      overlay.addEventListener('click', function (e) { if (e.target === overlay) hideModal(); });
      modal.addEventListener('click', function (e) { e.stopPropagation(); });

      document.body.appendChild(overlay);

      els = {
        overlay: overlay, modal: modal, formPanel: formPanel, successPanel: successPanel,
        phoneInput: phoneInput, consentCheck: consentCheck, errorMsg: errorMsg,
        submitBtn: submitBtn, surveyBtn: surveyBtn
      };
      return els;
    }

    function showError(msg) {
      if (!els) return;
      els.errorMsg.textContent = msg;
      els.errorMsg.style.display = 'block';
    }

    function clearError() {
      if (!els) return;
      els.errorMsg.style.display = 'none';
      els.errorMsg.textContent = '';
    }

    function showModal(ctaLocation) {
      var e = buildModal();
      e.formPanel.style.display = 'block';
      e.successPanel.style.display = 'none';
      clearError();
      e.overlay.style.display = 'block';
      e.modal.style.display = 'block';
      e.modal.setAttribute('data-cta-location', ctaLocation || '');
    }

    function hideModal() {
      if (!els) return;
      els.overlay.style.display = 'none';
      els.modal.style.display = 'none';
    }

    function submitSignup(ctaLocation) {
      var e = buildModal();
      var rawPhone = e.phoneInput.value.replace(/\D/g, '');
      if (rawPhone.length < 10 || rawPhone.length > 11) {
        showError('휴대폰 번호를 정확히 입력해 주세요');
        return;
      }
      if (!e.consentCheck.checked) {
        showError('개인정보 수집·이용에 동의해 주세요');
        return;
      }
      clearError();
      e.submitBtn.disabled = true;
      e.submitBtn.style.opacity = '.6';

      var utm = getUtm();
      var code = makeCode(utm.source, utm.content, ctaLocation);
      var payload = {
        phone: rawPhone,
        consent: true,
        code: code,
        utm_source: utm.source,
        utm_content: utm.content,
        cta_location: ctaLocation,
        ua: navigator.userAgent || '',
        fbc: readCookie('_fbc'),
        fbp: readCookie('_fbp'),
      };

      /* 서버가 못 받으면 설문으로 «그냥 보내지 않는다». 1단계(연락처) 기록이 없으면 광고 신호도,
         판정 분모도 같이 사라진다 — 조용히 잃는 것이 가장 나쁘다(코덱스 지적 2026-09-03).
         한 번은 자동으로 다시 보내고, 그래도 안 되면 «다시 시도» 안내 + 설문 링크를 보조로 둔다. */
      var attempt = 0;
      function send() {
      attempt++;
      postWithTimeout(CFG.ENDPOINT, payload, CFG.TIMEOUT_MS).then(function (result) {
        if (!(result.ok && result.data && result.data.ok) && attempt < 2) {
          setTimeout(send, 800); return;
        }
        e.submitBtn.disabled = false;
        e.submitBtn.style.opacity = '1';

        if (result.ok && result.data && result.data.ok) {
          var surveyUrl = withPhone(result.data.survey_url || buildSurveyUrl(code, rawPhone), rawPhone);
          /* ⛔ 「N번째로 신청되셨습니다」는 화면에 띄우지 않는다 —
             «순번 예약을 한 것»으로 오해한다(대표 지시 2026-09-03).
             서버 응답의 seq 는 그대로 받고 장부에도 남으니 집계는 영향 없다. */
          fireFbLead(ctaLocation, code);
          fireGtag('otb01_pdp_signup_submit', {
            utm_source: utm.source, utm_content: utm.content, cta_location: ctaLocation, code: code
          });
          pushDL('otb01_pdp_signup_submit', {
            utm_source: utm.source, utm_content: utm.content, cta_location: ctaLocation, code: code,
            dup: false   /* 서버가 더는 알려주지 않는다(번호 조회 통로 차단) */
          });
          e.formPanel.style.display = 'none';
          e.successPanel.style.display = 'block';
          e.surveyBtn.onclick = function () {
            fireGtag('otb01_pdp_survey_open', { cta_location: ctaLocation, code: code });
            pushDL('otb01_pdp_survey_open', { cta_location: ctaLocation, code: code });
            /* 인스타·페북 앱 안 브라우저는 새 창을 자주 막는다. 막히면 예외가 아니라
               null 이 돌아와 catch 에 안 걸리고 «눌러도 아무 일이 없는» 상태가 된다.
               설문 응답이 구조적으로 0 이 되므로 같은 창 이동으로 되받는다. (2026-09-02) */
            var w = null;
            try { w = window.open(surveyUrl, '_blank'); } catch (err) { w = null; }
            if (!w) { location.href = surveyUrl; }
          };
        } else {
          var fallbackUrl = withPhone(
            (result.data && result.data.survey_url) || buildSurveyUrl(code, rawPhone), rawPhone);
          pushDL('otb01_pdp_signup_fail', {
            reason: result.reason || 'unknown', utm_source: utm.source,
            utm_content: utm.content, cta_location: ctaLocation, code: code
          });
          showError('잠시 연결이 원활하지 않습니다. 「사전예약 알림신청」을 한 번 더 눌러 주세요.');
          /* 보조 통로 — 서버가 오래 죽어 있어도 고객 손에 설문은 쥐여준다(전화번호는 설문에도 들어간다) */
          try {
            var alt = document.getElementById('otb01-alt-survey');
            if (!alt) {
              alt = document.createElement('a'); alt.id = 'otb01-alt-survey';
              alt.textContent = '계속 안 되면 설문으로 바로 가기';
              alt.style.cssText = 'display:block;text-align:center;font-size:12px;color:#5b5f68;' +
                'text-decoration:underline;margin-top:10px;';
              e.formPanel.appendChild(alt);
            }
            alt.href = fallbackUrl; alt.target = '_blank'; alt.rel = 'noopener';
          } catch (err) {}
        }
      });
      }
      send();
    }

    // ─── CTA 바인딩 (이벤트 위임 — 늦게 삽입되는 sticky CTA 도 잡음) ───
    document.addEventListener('click', function (e) {
      var cta = e.target && e.target.closest ? e.target.closest('a[data-otb-cta]') : null;
      if (!cta) return;
      e.preventDefault();
      var loc = cta.getAttribute('data-otb-cta') || 'top';
      showModal(loc);
    }, true);

    document.addEventListener('click', function (e) {
      if (!els) return;
      if (e.target === els.submitBtn) submitSignup(els.modal.getAttribute('data-cta-location') || 'top');
    });

    // Enter 키 제출 (전화번호 입력창)
    document.addEventListener('keydown', function (e) {
      if (!els || !els.modal || els.modal.style.display === 'none') return;
      if (e.key === 'Enter' && document.activeElement === els.phoneInput) {
        e.preventDefault();
        submitSignup(els.modal.getAttribute('data-cta-location') || 'top');
      }
    });
  } catch (e) {
    try { console.error('[otb01_signup_form]', e); } catch (e2) {}
  }
})();
