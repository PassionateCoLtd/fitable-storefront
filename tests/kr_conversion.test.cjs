/* KR conversion regression: cart v5, GTM purchase gate v11, legacy internal-traffic fixture. Offline only. */
const fs = require('fs'), vm = require('vm'), path = require('path');
const D = path.resolve(__dirname, '..');
let pass = 0, fail = 0; const log = [];
function ok(c, m) { if (c) { pass++; log.push('PASS ' + m); } else { fail++; log.push('FAIL ' + m); } }
function eq(a, b, m) { ok(JSON.stringify(a) === JSON.stringify(b), m + ' → ' + JSON.stringify(a) + (JSON.stringify(a) === JSON.stringify(b) ? '' : ' (기대 ' + JSON.stringify(b) + ')')); }

/* ── 가짜 브라우저 ── */
function mkStore() { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; }, _m: m }; }
function mkEnv(o = {}) {
  const listeners = {}; const timers = [];
  const doc = { querySelector: () => null, readyState: 'complete', visibilityState: o.hidden ? 'hidden' : 'visible', cookie: o.cookie || '', body: { innerText: o.bodyText || '' },
    addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f); } };
  class XHR { constructor() { this._l = {}; this.status = 0; this.responseText = ''; this.responseType = ''; this.response = ''; }
    addEventListener(t, f) { (this._l[t] = this._l[t] || []).push(f); }
    removeEventListener(t, f) { this._l[t] = (this._l[t] || []).filter(g => g !== f); } }
  XHR.prototype.open = function (m, u) { this._u = u; this.readyState = 1; this.status = 0; };
  XHR.prototype.send = function (b) { this._b = b; XHR.sent.push(this); };
  XHR.sent = [];
  /* GTM 흉내: event 가 있는 push 는 컨테이너마다 eventCallback(컨테이너 ID) 를 부른다(o.gtmAck = 부를 컨테이너 목록) */
  const dlArr = []; const acks = o.gtmAck === undefined ? ['GTM-PLKNSLRG', 'GTM-P99J83LM'] : o.gtmAck;
  dlArr.push = function () { for (const x of arguments) { if (o.dlThrow && x && x.event === o.dlThrow) throw new Error('dl'); Array.prototype.push.call(dlArr, x);
    if (x && x.event && typeof x.eventCallback === 'function') acks.forEach(id => x.eventCallback(id)); } return dlArr.length; };
  const win = { dataLayer: dlArr, document: doc, Request, Response, URL, Promise, FormData, XMLHttpRequest: XHR, localStorage: o.ls || mkStore(), navigator: o.navigator || { userAgent: 'Mozilla/5.0 Chrome/141' },
    location: { search: o.search || '', hostname: o.hostname || 'fitablekorea.com' }, URLSearchParams, setTimeout: (f, ms) => { timers.push(f); return timers.length; },
    addEventListener: () => {}, JSON, Math, Date, Object, String, Number, isFinite, parseInt, Array, RegExp, encodeURIComponent, decodeURIComponent };
  Object.assign(win, o.globals || {});
  win.window = win; win.gtag = function () { win.__gtag = (win.__gtag || []); win.__gtag.push([].slice.call(arguments)); };
  doc.dispatch = (t, target) => (listeners[t] || []).forEach(f => f({ type: t, target }));
  win.__timers = timers; win.__runTimers = () => { let n = 0; while (timers.length && n++ < 50) timers.shift()(); };
  return vm.createContext(win);
}
function el(onclick, cls) { return { closest: sel => { if (sel === '[onclick]') return onclick ? { getAttribute: () => onclick } : null; return cls && /npay|checkout_btn_comm|kakaopay|naverpay|NPAY/.test(sel) && /npay/.test(cls) ? {} : null; } }; }
function fire(x, t) { (x._l[t] || []).slice().forEach(f => f({ type: t })); }
function respond(x, status, text) { x.status = status; x.responseText = text; if (x.responseType === 'json') { try { x.response = JSON.parse(text); } catch (e) { x.response = null; } }
  x.readyState = 4; fire(x, 'readystatechange'); fire(x, 'load'); fire(x, 'loadend'); }

/* ── cart_fix.js ── */
const CF = fs.readFileSync(path.join(D, process.env.CF_FILE || 'cart_fix.js'), 'utf8');
const OSD126 = JSON.stringify({ P00000EW000O: { option_price: 69900, option_value: '바로 발송' } });
const AOD126 = JSON.stringify({ 155: { product_name: '와이드 풀업바 전용 풀업 밴드', option_stock_data: JSON.stringify({ P00000FZ000T: { option_price: 18900, option_value: '초급자용(44mm)' } }) } });
const OSD30 = JSON.stringify({ P00000BE000A: { option_price: 32900, option_value: '화이트' }, P00000BE000C: { option_price: 35900, option_value: '블랙' } });
const G126 = { option_stock_data: OSD126, add_option_data: AOD126, iProductNo: 126, product_name: '핏에이블 오브제 와이드 풀업바 아크', iCategoryNo: '0' };
const BODY = (sel, extra) => sel.map(s => 'selected_item%5B%5D=' + encodeURIComponent(s)).join('&') + (extra || '') +
  '&relation_product=yes&product_no=126&product_name=%ED%95%8F&command=add&has_option=T&product_price=69900&quantity=2&is_direct_buy=F&basket_type=A0000';
function atcEvents(w) { return w.dataLayer.filter(x => x.event === 'fit_add_to_cart'); }
function run(globals, steps) {
  const w = mkEnv({ globals }); vm.runInContext(CF, w);
  steps(w); return w;
}
const OKR = '{"result":0,"isLogin":"F"}';
// 1) 장바구니 1번, 수량 2 → 1건·139,800
let w = run(G126, w => { w.document.dispatch('click', el("product_submit(2, '/exec/front/order/basket/', this)"));
  const x = new w.XMLHttpRequest(); x.open('POST', '/exec/front/order/basket/'); x.send(BODY(['2||P00000EW000O']));
  const x2 = new w.XMLHttpRequest(); x2.open('POST', '/exec/front/order/basket/'); x2.send('selected_item%5B0%5D=0%7C%7CP00000EW000O&command=select_soldout');
  respond(x, 200, OKR); respond(x2, 200, OKR); });
let e = atcEvents(w); eq(e.length, 1, '담기 1번(수량2)=1건'); eq(e[0] && e[0].ecommerce.value, 139800, '수량2 금액=69,900×2');
eq(e[0] && e[0].ecommerce.items.map(i => [i.item_id, i.quantity, i.price, i.item_variant]), [['126', 2, 69900, '바로 발송']], '수량2 품목');
ok(e[0] && /^kra_/.test(e[0].fit_atc_id), '시도 ID 붙음');
ok(!(w.__gtag || []).some(a => a[1] === 'add_to_cart'), 'gtag 직접 add_to_cart 없음');
// 2) 추가구성상품 같이 → 88,800, 상품번호 155
w = run(G126, w => { w.document.dispatch('click', el("product_submit(2,'/exec/front/order/basket/',this)"));
  const x = new w.XMLHttpRequest(); x.open('POST', '/exec/front/order/basket/');
  x.send(BODY(['1||P00000EW000O'], '&selected_add_item%5B%5D=' + encodeURIComponent('1||P00000FZ000T||155||42||1||1||와이드 풀업바 전용 풀업 밴드||15900.00||T||||0||F||||F'))); respond(x, 200, OKR); });
e = atcEvents(w); eq(e.length, 1, '추가구성 포함 1건'); eq(e[0] && e[0].ecommerce.value, 88800, '추가구성 금액 69,900+18,900');
eq(e[0] && e[0].ecommerce.items.map(i => [i.item_id, i.quantity, i.price]), [['126', 1, 69900], ['155', 1, 18900]], '추가구성 품목');
// 3) 옵션 여러 개(30번: 화이트1·블랙2) → 104,700
w = run({ option_stock_data: OSD30, iProductNo: 30, product_name: '문틀철봉' }, w => { w.document.dispatch('click', el("product_submit(2, '/exec/front/order/basket/', this)"));
  const x = new w.XMLHttpRequest(); x.open('POST', '/exec/front/order/basket/');
  x.send(BODY(['1||P00000BE000A', '2||P00000BE000C']).replace('product_no=126', 'product_no=30')); respond(x, 200, OKR); });
e = atcEvents(w); eq(e.length, 1, '옵션 2개 1건'); eq(e[0] && e[0].ecommerce.value, 32900 + 35900 * 2, '옵션 2개 금액');
// 4) 지연 응답(5초 뒤) 1건
w = run(G126, w => { w.document.dispatch('click', el("product_submit(2, '/exec/front/order/basket/', this)"));
  const x = new w.XMLHttpRequest(); x.open('POST', '/exec/front/order/basket/'); x.send(BODY(['1||P00000EW000O']));
  const t0 = Date.now(); while (Date.now() - t0 < 30) {} respond(x, 200, OKR); });
eq(atcEvents(w).length, 1, '지연 응답 1건');
// 5) 실패 응답 → 0건, 다시 담기 → 1건
w = run(G126, w => { w.document.dispatch('click', el("product_submit(2, '/exec/front/order/basket/', this)"));
  const x = new w.XMLHttpRequest(); x.open('POST', '/exec/front/order/basket/'); x.send(BODY(['1||P00000EW000O'])); respond(x, 200, '{"result":-1}'); });
eq(atcEvents(w).length, 0, '실패 응답 0건');
// 6) 바로구매 → 담기 0건, buy_click 1건(begin_checkout 없음)
w = run(G126, w => { w.dataLayer.push({ event: 'view_item2', ecommerce: { value: 69900, currency: 'KRW', items: [{ item_id: 126, item_name: 'x', price: 69900 }] } });
  w.document.dispatch('click', el("product_submit(1, '/exec/front/order/basket/', this)"));
  const x = new w.XMLHttpRequest(); x.open('POST', '/exec/front/order/basket/'); x.send(BODY(['1||P00000EW000O'])); respond(x, 200, OKR);
  const y = new w.XMLHttpRequest(); y.open('POST', '/exec/front/order/basket/'); y.send(BODY(['1||P00000EW000O']).replace('is_direct_buy=F', 'is_direct_buy=T')); respond(y, 200, OKR); });
eq(atcEvents(w).length, 0, '바로구매 담기 0건'); eq((w.__gtag || []).filter(a => a[1] === 'buy_click').length, 1, '바로구매 buy_click 1건');
// 7) 네이버페이 누름 → 0건
w = run(G126, w => { w.document.dispatch('mousedown', el(null, 'npay_btn_item')); w.document.dispatch('click', el(null, 'npay_btn_item'));
  const x = new w.XMLHttpRequest(); x.open('POST', '/exec/front/order/basket/'); x.send(BODY(['1||P00000EW000O'])); respond(x, 200, OKR); });
eq(atcEvents(w).length, 0, '네이버페이 뒤 담기 통신 0건');
// 8) 클릭을 못 본 담기(다른 버튼) → 요청 기준 1건 / 같은 시도 두 번째 요청 → 안 셈
w = run(G126, w => { const x = new w.XMLHttpRequest(); x.open('POST', '/exec/front/order/basket/'); x.send(BODY(['1||P00000EW000O'])); respond(x, 200, OKR);
  const y = new w.XMLHttpRequest(); y.open('POST', '/exec/front/order/basket/'); y.send(BODY(['1||P00000EW000O'])); respond(y, 200, OKR); });
eq(atcEvents(w).length, 1, '클릭 없는 담기 1건(15초 안 «같은 상품번호·같은 품목코드» 되풀이 요청만 같은 담기)');
// 9) 단가 못 맞춤(모르는 품목코드) → 금액 빈칸
w = run(G126, w => { w.document.dispatch('click', el("product_submit(2, '/exec/front/order/basket/', this)"));
  const x = new w.XMLHttpRequest(); x.open('POST', '/exec/front/order/basket/'); x.send(BODY(['1||P0000ZZZ000A'])); respond(x, 200, OKR); });
e = atcEvents(w); eq(e.length, 1, '모르는 품목 1건'); ok(e[0] && !('value' in e[0].ecommerce), '모르는 품목 = 금액 없음');
// 10) 두 번 클릭 = 두 번 담기 = 2건
w = run(G126, w => { for (let i = 0; i < 2; i++) { w.document.dispatch('click', el("product_submit(2, '/exec/front/order/basket/', this)"));
  const x = new w.XMLHttpRequest(); x.open('POST', '/exec/front/order/basket/'); x.send(BODY(['1||P00000EW000O'])); respond(x, 200, OKR); } });
eq(atcEvents(w).length, 2, '두 번 클릭 2건');

/* ── 구매 확인 태그 ── */
const GATE = fs.readFileSync(path.join(D, process.env.GATE_FILE || 'gtm/kr_purchase_gate.html'), 'utf8').replace(/^<script>/, '').replace(/<\/script>\s*$/, '');
function clockDate(C) { return class extends Date { constructor(...a) { if (a.length) super(...a); else super(C.t); } static now() { return C.t; } }; }   /* 움직이는 시계(C.t) */
function fixedDate(T) { return class extends Date { constructor(...a) { if (a.length) super(...a); else super(T); } static now() { return T; } }; }
function gateRun(o) {
  const ls = o.ls || mkStore();
  const w = mkEnv({ ls, hidden: o.hidden, gtmAck: o.gtmAck, dlThrow: o.dlThrow, bodyText: (o.screen != null ? '결제 수단\n신용카드\n상품금액\n88,800원\n총 결제금액\n' + o.screen + '원' : '주문번호 ' + o.oid) + (o.screenDate ? '\n주문일시\n' + o.screenDate : ''),
    navigator: { userAgent: 'x' }, globals: { Date: o.clock ? clockDate(o.clock) : o.now ? fixedDate(o.now) : Date, EC_FRONT_EXTERNAL_SCRIPT_VARIABLE_DATA: Object.assign({ order_id: o.oid, order_product: o.items || [{ product_no: '126', quantity: '1', product_price: '88800' }] }, o.payed !== undefined ? { payed_amount: o.payed } : {}, o.orderDate ? { order_date: o.orderDate } : {}) } });
  const src = GATE.replace(/\{\{GA4 \| DL \| transaction_id\}\}/g, JSON.stringify(o.oid)).replace(/\{\{GA4 \| DL \| items\}\}/g, JSON.stringify([{ item_id: '126', price: 88800, quantity: 1 }]))
    .replace(/\{\{GA4 \| DL \| payment_type\}\}/g, JSON.stringify(o.payType === undefined ? '신용카드' : o.payType));
  vm.runInContext(src, w); if (o.beforeTimers) o.beforeTimers(); w.__runTimers();
  return { w, ls, ev: w.dataLayer.filter(x => x.event === 'fit_purchase') };
}
eq(gateRun({oid:'20991231-0000999',payed:'0',screen:'20,900'}).ev.length,0,'미입금 0원/결제예정금액은 구매0');
eq(gateRun({oid:'20991231-0000998',payed:'20900',screen:'20,900',payType:'cash'}).ev.length,0,'무통장은 서버입금 확인 전 구매0');
eq(gateRun({oid:'20991231-0000997',payed:'20900',screen:'20,900',payType:'icash'}).ev.length,0,'가상계좌는 서버 확인');
var fallbackPm=gateRun({oid:'20991231-0000996',payed:'20900',screen:'20,900',payType:null});
eq(fallbackPm.ev[0]&&fallbackPm.ev[0].ecommerce.payment_type,'card','실제 결제수단 라벨에서 카드 복원');
const cases = [['정상', '91800', '91,800', 91800], ['쿠폰 할인', '84360', '84,360', 84360], ['적립금 일부', '68800', '68,800', 68800],
  ['적립금 전액', '0', '0', 0],  ['필드 없음→화면', undefined, '84,360', 84360],
  ['아무것도 없음→상품합계', undefined, null, 88800], ['엉뚱한 큰 값(3배 초과)→화면', '999999', '91,800', 91800]];
cases.forEach(([n, payed, screen, exp], i) => { const r = gateRun({ oid: '20991231-00000' + i, payed, screen }); eq(r.ev.length, 1, '구매 ' + n + ' 1건'); eq(r.ev[0] && r.ev[0].ecommerce.value, exp, '구매 ' + n + ' 금액'); });
let r1 = gateRun({ oid: '20991231-0000100', payed: '91800', screen: '91,800' });
eq(r1.ev[0].ecommerce.transaction_id, '20991231-0000100', '주문번호 그대로');
let r2 = gateRun({ oid: '20991231-0000100', payed: '91800', screen: '91,800', ls: r1.ls });
eq(r2.ev.length, 0, '같은 주문 다시 열기(새로고침) 0건');
let r3 = gateRun({ oid: '', payed: '91800', screen: '91,800' }); eq(r3.ev.length, 0, '주문번호 없음 0건');
// 두 탭(localStorage 잠금 경로): 같은 저장소, 순서대로 실행 → 1건
const shared = mkStore(); const t1 = gateRun({ oid: '20991231-0000200', payed: '91800', screen: '91,800', ls: shared }); const t2 = gateRun({ oid: '20991231-0000200', payed: '91800', screen: '91,800', ls: shared });
eq(t1.ev.length + t2.ev.length, 1, '두 탭 합계 1건');

/* ════════ r2: 리뷰 지적 재현 시험 ════════ */
const KST = 9 * 3600e3;
function kstStr(ms) { const d = new Date(ms + KST); const p = n => String(n).padStart(2, '0'); return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()) + ' ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) + ':' + p(d.getUTCSeconds()); }
function kstYmd(ms) { return kstStr(ms).slice(0, 10).replace(/-/g, ''); }
function sentList(ls) { try { return JSON.parse(ls.getItem('fkr_purchase_sent') || '[]'); } catch (e) { return []; } }
const NOW = Date.now(), TODAY = kstYmd(NOW);
// R1) «보내는 중» 짧게·«보냄»은 GTM 확인 뒤에만·예외 시 지움
let q = gateRun({ oid: '20991231-0000301', payed: '91800', screen: '91,800' });
eq(sentList(q.ls).map(x => x.st), ['sent'], 'R1 우리 컨테이너 eventCallback 뒤에만 sent');
q = gateRun({ oid: '20991231-0000302', payed: '91800', screen: '91,800', gtmAck: [] });
eq(q.ev.length, 1, 'R1 GTM 확인 없음 → 1번 보냄'); eq(sentList(q.ls).map(x => x.st), ['sending'], 'R1 GTM 확인 없음 → sending 으로만 남음');
let q2 = gateRun({ oid: '20991231-0000302', payed: '91800', screen: '91,800', ls: q.ls, gtmAck: [] });
eq(q2.ev.length, 0, 'R1 sending 2분 안 다시 열기 → 0건(두 번 안 보냄)');
{ const l = sentList(q.ls); l[0].ts = Date.now() - 3 * 60e3; q.ls.setItem('fkr_purchase_sent', JSON.stringify(l));   /* 3분 흐른 것처럼: 목록 줄과 주문번호 표 둘 다 */
  const c = JSON.parse(q.ls.getItem('fkr_pclaim_20991231-0000302') || 'null'); if (c) { c.t = Date.now() - 3 * 60e3; q.ls.setItem('fkr_pclaim_20991231-0000302', JSON.stringify(c)); } }
q2 = gateRun({ oid: '20991231-0000302', payed: '91800', screen: '91,800', ls: q.ls });
eq(q2.ev.length, 1, 'R1 sending 2분 지난 뒤 다시 열기 → 재시도 1건'); eq(sentList(q.ls).filter(x => x.id === '20991231-0000302').map(x => x.st), ['sent'], 'R1 재시도 뒤 sent');
{ const old = mkStore(); old.setItem('fkr_purchase_sent', JSON.stringify([{ id: '20991231-0000303', ts: Date.now() - 30 * 864e5, st: 'sending' }]));
  eq(gateRun({ oid: '20991231-0000303', payed: '91800', screen: '91,800', ls: old }).ev.length, 1, 'R1 v6 가 남긴 오래된 sending(30일) → 이제 막지 않음'); }
q = gateRun({ oid: '20991231-0000304', payed: '91800', screen: '91,800', gtmAck: ['GTM-PLKNSLRG'] });
eq(sentList(q.ls).map(x => x.st), ['sending'], 'R1 다른 컨테이너(페이콘) eventCallback 만 → sent 안 적음');
q = gateRun({ oid: '20991231-0000305', payed: '91800', screen: '91,800', dlThrow: 'fit_purchase' });
eq(sentList(q.ls).length, 0, 'R1 보내다 예외 → sending 지움'); eq(q.ls.getItem('fkr_pclaim_20991231-0000305'), null, 'R1 예외 → 주문번호 표도 지움');
eq(gateRun({ oid: '20991231-0000305', payed: '91800', screen: '91,800', ls: q.ls }).ev.length, 1, 'R1 예외 뒤 다시 열기 → 1건');
// R2) 웹 구매는 주문 뒤 12시간 안만
const o2 = TODAY + '-0000401';
eq(gateRun({ oid: o2, payed: '91800', screen: '91,800', orderDate: kstStr(NOW - 13 * 3600e3) }).ev.length, 0, 'R2 주문 데이터 order_date 13시간 전 → 0건(서버 보충 몫)');
eq(gateRun({ oid: o2, payed: '91800', screen: '91,800', orderDate: kstStr(NOW - 11 * 3600e3) }).ev.length, 1, 'R2 order_date 11시간 전 → 1건');
eq(gateRun({ oid: o2, payed: '91800', screen: '91,800', screenDate: kstStr(NOW - 13 * 3600e3) }).ev.length, 0, 'R2 화면 «주문일시» 13시간 전 → 0건');
eq(gateRun({ oid: o2, payed: '91800', screen: '91,800', screenDate: kstStr(NOW - 5 * 60e3) }).ev.length, 1, 'R2 화면 «주문일시» 5분 전 → 1건');
const N13 = Date.UTC(2026, 10, 1, 13 - 9, 0, 0);   /* 고정 시계: 2026-11-01 13:00 KST */
eq(gateRun({ oid: '20261030-0000402', payed: '91800', screen: '91,800', now: N13 }).ev.length, 0, 'R2 주문번호 날짜만·이틀 전 → 0건');
eq(gateRun({ oid: '20261031-0000403', payed: '91800', screen: '91,800', now: N13 }).ev.length, 0, 'R2 주문번호 날짜만·어제(지금 13:00) → 0건(23:59:59 로 봐도 12시간 넘음)');
eq(gateRun({ oid: '20261101-0000404', payed: '91800', screen: '91,800', now: N13 }).ev.length, 1, 'R2 주문번호 날짜만·오늘 → 1건');
eq(gateRun({ oid: 'X0000405', payed: '91800', screen: '91,800' }).ev.length, 1, 'R2 주문 시각 못 읽음 → 예전처럼 1건');
// R8) 화면 닫힘 경로도 주문번호 표를 거친다
{ const ls8 = mkStore(); ls8.setItem('fkr_pclaim_20991231-0000801', JSON.stringify({ o: 'otherTab', t: Date.now() }));
  eq(gateRun({ oid: '20991231-0000801', payed: '91800', screen: '91,800', ls: ls8, hidden: true }).ev.length, 0, 'R8 다른 탭이 표를 쥔 동안 닫힘 경로 → 0건');
  ls8.setItem('fkr_pclaim_20991231-0000801', JSON.stringify({ o: 'otherTab', t: Date.now() - 3 * 60e3 }));
  eq(gateRun({ oid: '20991231-0000801', payed: '91800', screen: '91,800', ls: ls8, hidden: true }).ev.length, 1, 'R8 표가 2분 지났으면 닫힘 경로 → 1건'); }
{ const ls8 = mkStore(); const a = gateRun({ oid: '20991231-0000802', payed: '91800', screen: '91,800', ls: ls8, hidden: true, gtmAck: [] });
  const b = gateRun({ oid: '20991231-0000802', payed: '91800', screen: '91,800', ls: ls8, hidden: true });
  eq(a.ev.length + b.ev.length, 1, 'R8 두 탭 모두 닫힘 경로(앞 탭 GTM 확인 전) → 합계 1건'); }

// R3) 옵션 없는 추가구성상품(31 스틸 푸쉬업바) 가격
const AOD31 = JSON.stringify(Object.assign(JSON.parse(AOD126), { 31: { product_name: '스틸 푸쉬업바', has_option: 'F', item_code: 'P00000BF000A', product_price: '24900.00', product_sale_price: 24900 } }));
const G31 = Object.assign({}, G126, { add_option_data: AOD31 });
const ADD31 = c => '&selected_add_item%5B%5D=' + encodeURIComponent('1||' + c + '||31||42||1||1||스틸 푸쉬업바||24900.00||F||||0||F||||F');
w = run(G31, w => { w.document.dispatch('click', el("product_submit(2, '/exec/front/order/basket/', this)"));
  const x = new w.XMLHttpRequest(); x.open('POST', '/exec/front/order/basket/'); x.send(BODY(['1||P00000EW000O'], ADD31('P00000BF000A'))); respond(x, 200, OKR); });
e = atcEvents(w); eq(e[0] && e[0].ecommerce.value, 94800, 'R3 와이드 69,900 + 푸쉬업바(옵션 없음) 24,900 = 94,800');
eq(e[0] && e[0].ecommerce.items.map(i => [i.item_id, i.quantity, i.price]), [['126', 1, 69900], ['31', 1, 24900]], 'R3 품목');
w = run(G31, w => { w.document.dispatch('click', el("product_submit(2, '/exec/front/order/basket/', this)"));
  const x = new w.XMLHttpRequest(); x.open('POST', '/exec/front/order/basket/'); x.send(BODY(['1||P00000EW000O'], ADD31('P00000BF000Z'))); respond(x, 200, OKR); });
ok(atcEvents(w)[0] && !('value' in atcEvents(w)[0].ecommerce), 'R3 품목코드가 item_code 와 다르면 금액 빈칸');
// R4) 클릭 없는 서로 다른 담기 요청은 안 묶는다
const OTHER = BODY(['1||P00000BE000A']).replace('product_no=126', 'product_no=30').replace('product_name=%ED%95%8F', 'product_name=%EB%AC%B8%ED%8B%80');
w = run(G126, w => { const x = new w.XMLHttpRequest(); x.open('POST', '/exec/front/order/basket/'); x.send(BODY(['1||P00000EW000O'])); respond(x, 200, OKR);
  const y = new w.XMLHttpRequest(); y.open('POST', '/exec/front/order/basket/'); y.send(OTHER); respond(y, 200, OKR); });
e = atcEvents(w); eq(e.length, 2, 'R4 클릭 없이 15초 안 다른 상품 2건 → 2건');
eq(e[1] && e[1].ecommerce.items.map(i => [i.item_id, i.quantity, i.item_variant, 'price' in i]), [['30', 1, 'P00000BE000A', false]], 'R4 다른 상품 = 요청의 상품번호·품목·수량, 단가 없음');
ok(e[1] && !('value' in e[1].ecommerce), 'R4 다른 상품 = 금액 빈칸');
w = run({ option_stock_data: OSD30, iProductNo: 30, product_name: '문틀철봉' }, w => { const B30 = s2 => BODY(s2).replace('product_no=126', 'product_no=30');
  const x = new w.XMLHttpRequest(); x.open('POST', '/exec/front/order/basket/'); x.send(B30(['1||P00000BE000A'])); respond(x, 200, OKR);
  const y = new w.XMLHttpRequest(); y.open('POST', '/exec/front/order/basket/'); y.send(B30(['1||P00000BE000C'])); respond(y, 200, OKR);
  const z = new w.XMLHttpRequest(); z.open('POST', '/exec/front/order/basket/'); z.send(B30(['1||P00000BE000A'])); respond(z, 200, OKR); });
eq(atcEvents(w).length, 2, 'R4 같은 상품·다른 품목코드는 따로(2건), 같은 품목 되풀이는 묶음');
w = run(G126, w => { w.document.dispatch('click', el("product_submit(2, '/exec/front/order/basket/', this)"));
  const y = new w.XMLHttpRequest(); y.open('POST', '/exec/front/order/basket/'); y.send(OTHER); respond(y, 200, OKR);
  const x = new w.XMLHttpRequest(); x.open('POST', '/exec/front/order/basket/'); x.send(BODY(['2||P00000EW000O'])); respond(x, 200, OKR); });
e = atcEvents(w); eq(e.map(v => [v.ecommerce.items[0].item_id, v.ecommerce.value === undefined ? null : v.ecommerce.value]), [['30', null], ['126', 139800]], 'R4 클릭 뒤 다른 상품 요청이 먼저 와도 클릭 시도는 화면 상품 요청에');
ok(e[1] && /^kra_(?!r)/.test(e[1].fit_atc_id) && /^kra_r/.test(e[0].fit_atc_id), 'R4 화면 상품 = 클릭 시도 ID, 다른 상품 = 요청 기준 ID');
// R5) fetch(Request)·fetch(URL, init)
async function fetchCase(kind) {
  const calls = []; let sync = false;
  const w = mkEnv({ globals: Object.assign({}, G126, { fetch: function (input, init) { sync = true; calls.push({ input, init, used: input && input.bodyUsed }); return Promise.resolve(new Response(OKR, { status: 200 })); } }) });
  vm.runInContext(CF, w); w.document.dispatch('click', el("product_submit(2, '/exec/front/order/basket/', this)"));
  const body = BODY(['2||P00000EW000O']); let p;
  if (kind === 'request') p = w.fetch(new Request('https://fitablekorea.com/exec/front/order/basket/', { method: 'POST', body, headers: { 'content-type': 'application/x-www-form-urlencoded' } }));
  else p = w.fetch(new URL('https://fitablekorea.com/exec/front/order/basket/'), { method: 'POST', body });
  const syncCalled = sync; const res = await p; await res.text(); for (let i = 0; i < 20; i++) await new Promise(r => setTimeout(r, 0));
  return { w, calls, syncCalled, origBody: kind === 'request' ? await calls[0].input.text() : null, used: calls[0].used };
}
const R5 = (async () => {
  let f = await fetchCase('request'); e = atcEvents(f.w);
  eq(e.length, 1, 'R5 fetch(Request) 담기 1건'); eq(e[0] && e[0].ecommerce.value, 139800, 'R5 fetch(Request) 금액 = 본문 사본으로 읽음');
  ok(f.syncCalled, 'R5 원래 fetch 를 기다리지 않고 바로 부름'); ok(f.used === false && /selected_item/.test(f.origBody || ''), 'R5 원래 Request 본문은 그대로(소비 안 함)');
  f = await fetchCase('url'); e = atcEvents(f.w);
  eq(e.length, 1, 'R5 fetch(URL 객체, init) 담기 1건'); eq(e[0] && e[0].ecommerce.value, 139800, 'R5 fetch(URL) 금액');
})();
// R6) XHR 재사용 — 옛 리스너가 다시 안 불림·완료 처리 한 번만
w = run(G126, w => { const x = new w.XMLHttpRequest();
  w.document.dispatch('click', el("product_submit(2, '/exec/front/order/basket/', this)")); x.open('POST', '/exec/front/order/basket/'); x.send(BODY(['1||P00000EW000O'])); respond(x, 200, OKR);
  eq((x._l.loadend || []).length, 0, 'R6 끝난 요청의 리스너는 떼어짐');
  w.document.dispatch('click', el("product_submit(2, '/exec/front/order/basket/', this)")); x.open('POST', '/exec/front/order/basket/'); x.send(BODY(['1||P00000EW000O'])); respond(x, 200, OKR); });
eq(atcEvents(w).length, 2, 'R6 같은 XHR 로 두 번 클릭·담기 = 2건(옛 리스너 재발화 없음, v6 은 3건)');
w = run(G126, w => { w.document.dispatch('click', el("product_submit(2, '/exec/front/order/basket/', this)"));
  const x = new w.XMLHttpRequest(); x.open('POST', '/exec/front/order/basket/'); x.send(BODY(['1||P00000EW000O']));
  const f = x._l.loadend[0]; respond(x, 200, OKR); f(); f(); });
eq(atcEvents(w).length, 1, 'R6 완료 처리가 여러 번 불려도 1건');
w = run(G126, w => { const x = new w.XMLHttpRequest(); x.open('POST', '/exec/front/order/basket/'); x.send(BODY(['1||P00000EW000O']));
  x.status = 200; x.responseText = OKR; x.readyState = 4; fire(x, 'readystatechange');   /* 앞 요청 끝(readyState 4) */
  x.open('POST', '/exec/front/order/basket/'); x.send(OTHER);                          /* onload 안에서 같은 XHR 로 다음 요청 */
  fire(x, 'loadend');                                                                   /* 앞 요청의 늦은 loadend(readyState 1) */
  respond(x, 200, OKR); });
eq(atcEvents(w).map(v => v.ecommerce.items[0].item_id), ['126', '30'], 'R6 onload 안 재사용(앞 요청 늦은 loadend) → 126·30 각 1건(실측에서 찾은 경우)');
w = run(G126, w => { const x = new w.XMLHttpRequest(); x.open('POST', '/exec/front/order/basket/'); x.send(BODY(['1||P00000EW000O']));
  x.open('POST', '/exec/front/order/basket/'); x.send(OTHER); respond(x, 200, OKR); });
eq(atcEvents(w).map(v => v.ecommerce.items[0].item_id), ['30'], 'R6 진행 중 재사용(앞 요청은 끝을 못 봄) → 뒤 요청 1건만');
// R7) 성공으로 명시된 응답만
const R7 = [['JSON 아님(HTML)', '<html>오류</html>', 0], ['빈 응답', '', 0], ['result 없음', '{"isLogin":"F"}', 0], ['result -1', '{"result":-1}', 0],
  ['result "-111"', '{"result":"-111","alertMSG":"x"}', 0], ['result null', '{"result":null}', 0], ['result true', '{"result":true}', 0],
  ['result 0(실측 형식)', '{"result":0,"isLogin":"F","from":null,"aResultSoldoutItems":{"result":"0000","msg":"","data":[]}}', 1], ['result "0"', '{"result":"0"}', 1], ['result 1(카페24 기준 ≥0 성공)', '{"result":1}', 1]];
R7.forEach(([n, body, exp]) => { const w7 = run(G126, w => { w.document.dispatch('click', el("product_submit(2, '/exec/front/order/basket/', this)"));
  const x = new w.XMLHttpRequest(); x.open('POST', '/exec/front/order/basket/'); x.send(BODY(['1||P00000EW000O'])); respond(x, 200, body); });
  eq(atcEvents(w7).length, exp, 'R7 ' + n + ' → ' + exp + '건'); });
w = run(G126, w => { w.document.dispatch('click', el("product_submit(2, '/exec/front/order/basket/', this)"));
  const x = new w.XMLHttpRequest(); x.responseType = 'json'; x.open('POST', '/exec/front/order/basket/'); x.send(BODY(['1||P00000EW000O'])); x.responseText = undefined; respond(x, 200, OKR); });
eq(atcEvents(w).length, 1, 'R7 responseType=json → response 객체로 판정');
w = run(G126, w => { w.document.dispatch('click', el("product_submit(2, '/exec/front/order/basket/', this)"));
  const x = new w.XMLHttpRequest(); x.open('POST', '/exec/front/order/Basketduplicate/'); x.send(BODY(['1||P00000EW000O'])); respond(x, 200, '{"result":true}'); });
eq(atcEvents(w).length, 0, 'R7 «이미 장바구니에 있음» 확인 요청(Basketduplicate)은 담기로 안 셈');


/* ════════ r3: 2회차 리뷰 지적 재현 시험 ════════ */
const KT = (d, h, mi) => Date.UTC(2026, 10, d, h - 9, mi, 0);       /* 2026-11-d h:mi KST */
const KS = (d, h, mi) => '2026-11-' + String(d).padStart(2, '0') + ' ' + String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0') + ':00';
// R9) [P1] 서버가 안 보내는 0원 주문은 12시간 제한 없음 · 날짜만 읽히면 그날 23:59:59 로 보고 12시간
{ let g = gateRun({ oid: '20261101-0000901', payed: '0', screen: '0', orderDate: KS(1, 6, 0), now: KT(1, 19, 0) });
  eq(g.ev.length, 0, 'R9 0원 주문(적립금 전액)도 13시간 뒤 → 0건(서버가 상품구매금액으로 보냄 — 3회차 리뷰)');
  g = gateRun({ oid: '20261101-0000902', payed: '0', screen: '0', screenDate: KS(1, 6, 0), now: KT(2, 9, 0) });
  eq(g.ev.length, 0, 'R9 0원 주문 화면 «주문일시» 27시간 뒤 → 0건');
  g = gateRun({ oid: '20261029-0000903', payed: '0', screen: '0', now: KT(1, 13, 0) });
  eq(g.ev.length, 0, 'R9 0원 주문 날짜만·사흘 전 → 0건');
  g = gateRun({ oid: '20261101-0000912', payed: '0', screen: '0', orderDate: KS(1, 6, 0), now: KT(1, 7, 0) });
  eq([g.ev.length, g.ev[0] && g.ev[0].ecommerce.value], [1, 0], 'R9 0원 주문 1시간 뒤 → 1건·금액 0');
  eq(gateRun({ oid: '20261101-0000904', payed: '91800', screen: '91,800', orderDate: KS(1, 6, 0), now: KT(1, 19, 0) }).ev.length, 0, 'R9 양수 주문 13시간 뒤 → 0건(서버 보충 몫)');
  eq(gateRun({ oid: '20261101-0000905', payed: '91800', screen: '91,800', orderDate: KS(1, 6, 0), now: KT(1, 17, 59) }).ev.length, 1, 'R9 양수 주문 11시간 59분 뒤 → 1건');
  eq(gateRun({ oid: '20261031-0000906', payed: '91800', screen: '91,800', now: KT(1, 0, 1) }).ev.length, 1, 'R9 날짜만·전날 23시 주문을 00:01 에 → 1건(v7 은 자정에 막음)');
  eq(gateRun({ oid: '20261031-0000907', payed: '91800', screen: '91,800', now: KT(1, 11, 59) }).ev.length, 1, 'R9 날짜만·전날 주문을 다음 날 11:59 에 → 1건');
  eq(gateRun({ oid: '20261031-0000908', payed: '91800', screen: '91,800', now: KT(1, 12, 1) }).ev.length, 0, 'R9 날짜만·전날 주문을 다음 날 12:01 에 → 0건');
  eq(gateRun({ oid: '20261101-0000909', payed: '91800', screen: '91,800', now: KT(1, 23, 59) }).ev.length, 1, 'R9 날짜만·그날 23:59 → 1건');
  eq(gateRun({ oid: '20261030-0000910', payed: '91800', screen: '91,800', now: KT(1, 0, 1) }).ev.length, 0, 'R9 날짜만·이틀 전 → 0건');
  eq(gateRun({ oid: '20261101-0000911', payed: '91800', screen: '91,800', orderDate: KS(1, 6, 0), now: KT(1, 19, 0) }).ev.length, 0, 'R9 양수 주문 order_date 가 주문번호 날짜보다 우선(13시간 → 0건)'); }
// R10) [P1] 화면 상품 A(126)에서 다른 상품 B(30)를 15초 안에 두 번 클릭해 담기 → 2건·ID 2개
const CLICK = w => w.document.dispatch('click', el("product_submit(2, '/exec/front/order/basket/', this)"));
w = run(G126, w => { for (let i = 0; i < 2; i++) { CLICK(w); const x = new w.XMLHttpRequest(); x.open('POST', '/exec/front/order/basket/'); x.send(OTHER); respond(x, 200, OKR); } });
e = atcEvents(w); eq(e.length, 2, 'R10 다른 상품 15초 안 두 번 클릭 → 2건');
ok(e.length === 2 && e[0].fit_atc_id !== e[1].fit_atc_id, 'R10 ID 2개 ' + e.map(v => v.fit_atc_id).join(','));
eq(e.map(v => v.ecommerce.items.map(i => [i.item_id, i.quantity])), [[['30', 1]], [['30', 1]]], 'R10 두 건 다 상품 30·수량 1');
w = run(G126, w => { CLICK(w); for (let i = 0; i < 2; i++) { const x = new w.XMLHttpRequest(); x.open('POST', '/exec/front/order/basket/'); x.send(OTHER); respond(x, 200, OKR); } });
eq(atcEvents(w).length, 1, 'R10 다른 상품 클릭 1번 + 같은 요청 되풀이(새 클릭 없음) → 1건');
w = run(G126, w => { for (let i = 0; i < 3; i++) { CLICK(w); const x = new w.XMLHttpRequest(); x.open('POST', '/exec/front/order/basket/'); x.send(OTHER); respond(x, 200, OKR); } });
e = atcEvents(w); eq([e.length, new Set(e.map(v => v.fit_atc_id)).size], [3, 3], 'R10 다른 상품 세 번 클릭 → 3건·ID 3개');
w = run(G126, w => { CLICK(w); const y = new w.XMLHttpRequest(); y.open('POST', '/exec/front/order/basket/'); y.send(OTHER); respond(y, 200, OKR);
  CLICK(w); const x = new w.XMLHttpRequest(); x.open('POST', '/exec/front/order/basket/'); x.send(BODY(['1||P00000EW000O'])); respond(x, 200, OKR); });
e = atcEvents(w); eq(e.map(v => v.ecommerce.items[0].item_id), ['30', '126'], 'R10 B 클릭 → A 클릭 → 각 1건');
w = run(G126, w => { CLICK(w); const x = new w.XMLHttpRequest(); x.open('POST', '/exec/front/order/basket/'); x.send(OTHER); respond(x, 200, '{"result":-1}');
  CLICK(w); const y = new w.XMLHttpRequest(); y.open('POST', '/exec/front/order/basket/'); y.send(OTHER); respond(y, 200, OKR); });
eq(atcEvents(w).length, 1, 'R10 다른 상품 첫 담기 실패 → 다시 클릭해 성공 → 1건');
// R12) [3회차 P2] 클릭 1번 뒤 15초 안 다른 상품 요청 B(30)→C(31)→B(30) 되풀이 → 2건(B·C), B 되풀이는 새 담기 아님
{ const OTHER31 = OTHER.replace('product_no=30', 'product_no=31');
  w = run(G126, w => { CLICK(w); for (const b of [OTHER, OTHER31, OTHER]) { const x = new w.XMLHttpRequest(); x.open('POST', '/exec/front/order/basket/'); x.send(b); respond(x, 200, OKR); } });
  eq(atcEvents(w).length, 2, 'R12 클릭 1번 + B→C→B(15초 안) → 2건');
  w = run(G126, w => { CLICK(w); for (const b of [OTHER, OTHER31, OTHER31, OTHER]) { const x = new w.XMLHttpRequest(); x.open('POST', '/exec/front/order/basket/'); x.send(b); respond(x, 200, OKR); } });
  eq(atcEvents(w).length, 2, 'R12 클릭 1번 + B→C→C→B → 2건');
  w = run(G126, w => { for (const b of [OTHER, OTHER31]) { CLICK(w); const x = new w.XMLHttpRequest(); x.open('POST', '/exec/front/order/basket/'); x.send(b); respond(x, 200, OKR); }
    CLICK(w); const x = new w.XMLHttpRequest(); x.open('POST', '/exec/front/order/basket/'); x.send(OTHER); respond(x, 200, OKR); });
  eq(atcEvents(w).length, 3, 'R12 클릭마다 B→C→B(클릭 3번) → 3건'); }
// R13) [3회차 참고] 클릭 1번에 다른 상품(30)+화면 상품(126) 요청 → 15초 안 한 번 더 → 4건(30·126·30·126)
{ const R4 = w => { CLICK(w); const y = new w.XMLHttpRequest(); y.open('POST', '/exec/front/order/basket/'); y.send(OTHER); respond(y, 200, OKR);
    const x = new w.XMLHttpRequest(); x.open('POST', '/exec/front/order/basket/'); x.send(BODY(['1||P00000EW000O'])); respond(x, 200, OKR); };
  w = run(G126, w => { R4(w); R4(w); });
  e = atcEvents(w); eq(e.map(v => v.ecommerce.items[0].item_id), ['30', '126', '30', '126'], 'R13 (다른 상품+화면 상품) 두 번 → 4건');
  eq(e.filter(v => v.ecommerce.items[0].item_id === '126').map(v => v.ecommerce.value), [69900, 69900], 'R13 화면 상품 두 건 모두 금액 있음'); }
// R14) [3회차 재확인 P2] 같은 클릭에서 다른 상품 B 실패 → 다시 담아 성공 → 1건(앞서 성공한 B 와 합쳐 2건)
w = run(G126, w => { CLICK(w); const x = new w.XMLHttpRequest(); x.open('POST', '/exec/front/order/basket/'); x.send(OTHER); respond(x, 200, OKR);
  CLICK(w); const y = new w.XMLHttpRequest(); y.open('POST', '/exec/front/order/basket/'); y.send(OTHER); respond(y, 200, '{"result":-1}');
  const z = new w.XMLHttpRequest(); z.open('POST', '/exec/front/order/basket/'); z.send(OTHER); respond(z, 200, OKR); });
eq(atcEvents(w).length, 2, 'R14 B 성공 → 새 클릭 B 실패 → 같은 클릭 B 재시도 성공 → 2건');
// R15) [3회차 재확인 P2] 날짜만 읽힌 전날 주문: 11:59:58 에 열었는데 다른 탭 잠금으로 3.1초 기다리면 12:00 넘어 → 0건 / 11:59:50 이면 → 1건
{ const lockLs = (oid, at) => { const s = mkStore(); s.setItem('fkr_plock_' + oid, JSON.stringify({ o: 'other', t: at })); return s; };
  let C = { t: KT(1, 11, 59) + 58e3 };
  eq(gateRun({ oid: '20261031-0000920', payed: '91800', screen: '91,800', clock: C, ls: lockLs('20261031-0000920', C.t), beforeTimers: () => { C.t += 3200; } }).ev.length, 0, 'R15 날짜만·11:59:58 열고 잠금 대기로 12:00:01 → 0건');
  C = { t: KT(1, 11, 59) + 50e3 };
  eq(gateRun({ oid: '20261031-0000921', payed: '91800', screen: '91,800', clock: C, ls: lockLs('20261031-0000921', C.t), beforeTimers: () => { C.t += 3200; } }).ev.length, 1, 'R15 날짜만·11:59:50 열고 잠금 대기 → 11:59:53 → 1건'); }
// R16) [3회차 재확인2 P2] 클릭1: B·A 성공 → 클릭2: B 실패·A 성공·B 재시도 성공 → 4건 / 클릭1: A 성공 → B 성공 → B 되풀이(새 클릭 없음) → 2건
{ const XB = (w, b, res) => { const x = new w.XMLHttpRequest(); x.open('POST', '/exec/front/order/basket/'); x.send(b); respond(x, 200, res || OKR); };
  const A = BODY(['1||P00000EW000O']);
  w = run(G126, w => { CLICK(w); XB(w, OTHER); XB(w, A); CLICK(w); XB(w, OTHER, '{"result":-1}'); XB(w, A); XB(w, OTHER); });
  eq(atcEvents(w).map(v => v.ecommerce.items[0].item_id), ['30', '126', '126', '30'], 'R16 B·A → B실패·A·B재시도 → 4건');
  w = run(G126, w => { CLICK(w); XB(w, A); XB(w, OTHER); XB(w, OTHER); });
  eq(atcEvents(w).map(v => v.ecommerce.items[0].item_id), ['126', '30'], 'R16 A → B → B 되풀이(새 클릭 없음) → 2건'); }
// R11) [P2] FormData 본문 — fetch(new Request(url, {body: FormData})) · fetch(url, {body: FormData}) · XHR send(FormData)
function fd(body) { const f = new FormData(); new URLSearchParams(body).forEach((v, k) => f.append(k, v)); return f; }
async function fetchFD(kind) {
  const calls = []; let sync = false;
  const w = mkEnv({ globals: Object.assign({}, G126, { fetch: function (input, init) { sync = true; calls.push({ input, init, used: input && input.bodyUsed }); return Promise.resolve(new Response(OKR, { status: 200 })); } }) });
  vm.runInContext(CF, w); CLICK(w);
  const U = 'https://fitablekorea.com/exec/front/order/basket/', f = fd(BODY(['2||P00000EW000O']));
  const p = kind === 'request' ? w.fetch(new Request(U, { method: 'POST', body: f })) : w.fetch(U, { method: 'POST', body: f });
  const syncCalled = sync; const res = await p; await res.text(); for (let i = 0; i < 20; i++) await new Promise(r => setTimeout(r, 0));
  let orig = null; if (kind === 'request') { const g = await calls[0].input.formData(); orig = g.getAll('selected_item[]'); }
  return { w, syncCalled, used: calls[0].used, orig, ct: kind === 'request' ? calls[0].input.headers.get('content-type') : null };
}
const R11 = (async () => {
  let f = await fetchFD('request'); e = atcEvents(f.w);
  ok(/multipart\/form-data/.test(f.ct || ''), 'R11 시험 요청이 실제로 multipart ' + (f.ct || '').slice(0, 30));
  eq([e.length, e[0] && e[0].ecommerce.value], [1, 139800], 'R11 fetch(new Request(url, {body: FormData})) → 1건·139,800');
  ok(f.syncCalled, 'R11 Request(FormData) 원래 fetch 를 기다리지 않고 바로 부름');
  ok(f.used === false && JSON.stringify(f.orig) === JSON.stringify(['2||P00000EW000O']), 'R11 원래 Request 본문은 그대로(소비 안 함) ' + JSON.stringify(f.orig));
  f = await fetchFD('init'); e = atcEvents(f.w);
  eq([e.length, e[0] && e[0].ecommerce.value], [1, 139800], 'R11 fetch(url, {body: FormData}) → 1건·139,800');
  const wx = run(G126, w => { CLICK(w); const x = new w.XMLHttpRequest(); x.open('POST', '/exec/front/order/basket/'); x.send(fd(BODY(['2||P00000EW000O']))); respond(x, 200, OKR); });
  e = atcEvents(wx); eq([e.length, e[0] && e[0].ecommerce.value], [1, 139800], 'R11 XHR send(FormData) → 1건·139,800');
})();

/* ── 사내 판정 변수 ── */
const TT = fs.readFileSync(path.join(__dirname, 'fixtures/var_traffic_type_kr.js'), 'utf8');
function tt(o) { const w = mkEnv(o); return vm.runInContext('(' + TT + ')()', w); }
eq(tt({ cookie: 'a=1; fit_internal=1' }), 'internal', '사내 쿠키 = internal');
eq(tt({ cookie: 'a=1' }), undefined, '보통 손님 = 판정 없음');
eq(tt({ navigator: { userAgent: 'Mozilla/5.0 HeadlessChrome/141' } }), 'internal', '자동조종(헤드리스) = internal');
const lsI = mkStore(); lsI.setItem('fit_internal', '1'); eq(tt({ ls: lsI }), 'internal', 'localStorage 표식 = internal');
const w9 = mkEnv({ search: '?fit_internal=1', hostname: 'm.fitablekorea.com' }); let c9 = ''; Object.defineProperty(w9.document, 'cookie', { get: () => c9, set: v => { c9 = v; } });
vm.runInContext('(' + TT + ')()', w9); ok(/domain=\.fitablekorea\.com/.test(c9), '주소 ?fit_internal=1 → 쿠키 .fitablekorea.com(www·m 공유) ' + c9);

Promise.all([R5, R11]).then(() => { console.log(log.join('\n')); console.log('\n합계 PASS ' + pass + ' / FAIL ' + fail); process.exit(fail ? 1 : 0); },
  err => { console.log(log.join('\n')); console.log('R5 오류', err); process.exit(1); });
