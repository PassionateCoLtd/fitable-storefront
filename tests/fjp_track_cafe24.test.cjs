/* 일본몰 계측(fjp_track_cafe24.js) 시험 — 2026-10-25 유입추적 강화분 + 지난 사고 회귀.
   실행: NODE_PATH=<jsdom 이 있는 node_modules> node --test tests/fjp_track_cafe24.test.cjs
   jsdom 은 스크립트가 만든 이벤트를 isTrusted=false 로 만든다 → 계측 파일이 거는 리스너를 가로채
   «사람이 한 것»(isTrusted=true) 가짜 이벤트로 직접 부른다. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const SRC = fs.readFileSync(process.env.FJP_SOURCE || path.join(__dirname, '../fjp_track_cafe24.js'), 'utf8');
const UA_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const UA_LINE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/14.17.0';
const DAY = 24 * 3600 * 1000;

function load({ url, referrer = '', ua = UA_SAFARI, html = '<!doctype html><body></body>', store, setup } = {}) {
  const dom = new JSDOM(html, Object.assign({ url, runScripts: 'outside-only', pretendToBeVisual: true }, referrer ? { referrer } : {}));
  const w = dom.window;
  Object.defineProperty(w.navigator, 'userAgent', { get: () => ua });
  if (store) w.localStorage.setItem('fjp_attr', JSON.stringify(store));
  const realST = w.setTimeout.bind(w);
  /* 대기 시간 압축 — 1분 넘는 감시 종료 타이머는 걸지 않는다(시험 프로세스가 안 끝나는 것 방지) */
  w.setTimeout = (fn, ms) => ((ms || 0) > 60000 ? 0 : realST(fn, Math.min(ms || 0, 20)));
  const listeners = [];
  const realAdd = w.document.addEventListener.bind(w.document);
  w.document.addEventListener = (type, fn, opt) => { listeners.push({ type, fn }); return realAdd(type, fn, opt); };
  w.IntersectionObserver = class { constructor(cb) { this.cb = cb; } observe(el) { const cb = this.cb; realST(() => cb([{ isIntersecting: true, target: el }]), 5); } disconnect() {} };
  w.dataLayer = [];
  if (setup) setup(w);
  w.eval(SRC);
  const fire = (type, target, extra = {}) => listeners.filter(l => l.type === type)
    .forEach(l => l.fn(Object.assign({ type, target, isTrusted: true, button: 0 }, extra)));
  const events = (name) => w.dataLayer.filter(e => e && e.event === name);
  const attr = () => JSON.parse(w.localStorage.getItem('fjp_attr') || '{}');
  return { w, fire, events, attr };
}
const wait = (ms = 120) => new Promise(r => setTimeout(r, ms));

/* ── 유입 저장 ─────────────────────────────────────────────── */
test('gclid 로 SEO 상세 주소에 도착 → google/cpc · 클릭ID 종류 gclid · 도착 화면 product/186', async () => {
  const { attr, w } = load({ url: 'https://m.fitablejp.com/product/fitable-x/186/?gclid=ABC', referrer: 'https://www.google.com/' });
  const a = attr();
  assert.equal(a.lt_source, 'google'); assert.equal(a.lt_medium, 'cpc');
  assert.equal(a.lt_click, 'gclid'); assert.equal(a.lt_landing, 'product/186');
  assert.equal(a.ft_source, 'google'); assert.equal(a.ft_click, 'gclid');
  assert.ok(!JSON.stringify(a).includes('ABC'), '클릭ID 값 자체는 저장하지 않는다');
  const seed = w.dataLayer.find(e => e && !e.event && e.member);
  assert.equal(seed.lt_click, 'gclid');
});

for (const [p, src] of [['yclid', 'yahoo'], ['ldtag_cl', 'line'], ['gbraid', 'google'], ['wbraid', 'google'], ['ttclid', 'tiktok'], ['msclkid', 'bing']]) {
  test(`${p} 만 있는 도착 → ${src}/cpc`, () => {
    const { attr } = load({ url: `https://fitablejp.com/?${p}=X1` });
    assert.equal(attr().lt_source, src); assert.equal(attr().lt_medium, 'cpc'); assert.equal(attr().lt_click, p);
    assert.equal(attr().lt_landing, 'home');
  });
}

test('fbclid 와 gclid 가 같이 있으면 예전처럼 facebook 이 이긴다(회귀)', () => {
  const { attr } = load({ url: 'https://fitablejp.com/?gclid=G&fbclid=F' });
  assert.equal(attr().lt_source, 'facebook'); assert.equal(attr().lt_click, 'fbclid');
});

test('utm 이 있으면 utm 이 출처, 클릭ID 종류·검색어는 같이 저장 · 검색어의 메일 모양은 지움', () => {
  const { attr } = load({ url: 'https://fitablejp.com/product/list.html?cate_no=168&utm_source=google&utm_medium=cpc&utm_campaign=c1&utm_term=' + encodeURIComponent('懸垂バー a@b.com') + '&gclid=G' });
  const a = attr();
  assert.equal(a.lt_source, 'google'); assert.equal(a.lt_campaign, 'c1'); assert.equal(a.lt_click, 'gclid');
  assert.equal(a.lt_landing, 'list/168');
  assert.ok(a.lt_term.startsWith('懸垂バー')); assert.ok(!a.lt_term.includes('@'), '메일 주소가 검색어에 남으면 안 된다');
});

test('LINE 앱 안 브라우저 + 리퍼러 없음 + utm 없음 → line/inapp (예전엔 (direct)) · ua_app=line', () => {
  const { attr, w } = load({ url: 'https://m.fitablejp.com/product/x/186/', ua: UA_LINE });
  assert.equal(attr().lt_source, 'line'); assert.equal(attr().lt_medium, 'inapp');
  const seed = w.dataLayer.find(e => e && !e.event && e.member);
  assert.equal(seed.ua_app, 'line');
});

test('앱 안 추정은 약한 신호 — 같은 앱의 utm 기록(line/message+캠페인)은 지우지 않는다', () => {
  const t = Date.now() - DAY;
  const { attr } = load({ url: 'https://m.fitablejp.com/', ua: UA_LINE,
    store: { lt_source: 'line', lt_medium: 'message', lt_campaign: 'widebar_open_line1', lt_ts: t, ft_source: 'meta', ft_ts: t } });
  assert.equal(attr().lt_medium, 'message'); assert.equal(attr().lt_campaign, 'widebar_open_line1');
});

test('앱 안 추정은 다른 출처 저장값(meta 광고)도 덮지 않는다 — 1회차 리뷰 #1', () => {
  const t = Date.now() - DAY;
  const { attr } = load({ url: 'https://m.fitablejp.com/', ua: UA_LINE,
    store: { lt_source: 'meta', lt_medium: 'paid', lt_campaign: 'c', lt_ts: t, ft_source: 'meta', ft_ts: t } });
  assert.equal(attr().lt_source, 'meta'); assert.equal(attr().lt_campaign, 'c');
});

const UA_IG = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0.0';
test('인스타 인앱 + meta/paid 저장 + 리퍼러 없는 화면(주문서) → 메타 귀속 그대로 · ua_app=instagram', async () => {
  const t = Date.now() - 3600 * 1000;
  const { attr, w } = load({ url: 'https://m.fitablejp.com/order/orderform.html', ua: UA_IG,
    store: { lt_source: 'meta', lt_medium: 'paid', lt_campaign: 'jp_opb01_launch_1019_main', lt_ts: t, ft_source: 'meta', ft_ts: t } });
  assert.equal(attr().lt_source, 'meta'); assert.equal(attr().lt_campaign, 'jp_opb01_launch_1019_main');
  const seed = w.dataLayer.find(e => e && !e.event && e.member);
  assert.equal(seed.ua_app, 'instagram'); assert.equal(seed.lt_source, 'meta');
});

test('새 접점이 오면 옛 접점의 검색어·클릭ID 가 섞이지 않는다', () => {
  const t = Date.now() - DAY;
  const { attr } = load({ url: 'https://fitablejp.com/?utm_source=line&utm_medium=message&utm_campaign=x',
    store: { lt_source: 'google', lt_medium: 'cpc', lt_term: 'old', lt_click: 'gclid', lt_ts: t, ft_source: 'google', ft_ts: t } });
  assert.equal(attr().lt_source, 'line'); assert.equal(attr().lt_term, ''); assert.equal(attr().lt_click, '');
  assert.equal(attr().ft_source, 'google');
});

test('일반 사파리 직접 유입은 저장된 출처를 덮지 않는다(회귀)', () => {
  const t = Date.now() - DAY;
  const { attr } = load({ url: 'https://m.fitablejp.com/', store: { lt_source: 'meta', lt_medium: 'paid', lt_ts: t, ft_source: 'meta', ft_ts: t } });
  assert.equal(attr().lt_source, 'meta');
});

test('몰 안 이동(우리 도메인 리퍼러)은 아무것도 안 바꾼다(회귀)', () => {
  const t = Date.now() - DAY;
  const { attr } = load({ url: 'https://m.fitablejp.com/order/basket.html', referrer: 'https://fitablejp.com/product/x/186/',
    store: { lt_source: 'line', lt_medium: 'message', lt_ts: t, ft_source: 'line', ft_ts: t } });
  assert.equal(attr().lt_medium, 'message');
});

test('최종유입 유효기간 90일 — 45일 전 기록은 남고 91일 전 기록은 새 칸까지 지운다', () => {
  let r = load({ url: 'https://m.fitablejp.com/order/basket.html', referrer: 'https://fitablejp.com/',
    store: { lt_source: 'meta', lt_medium: 'paid', lt_term: 'k', lt_ts: Date.now() - 45 * DAY } });
  assert.equal(r.attr().lt_source, 'meta');
  r = load({ url: 'https://m.fitablejp.com/order/basket.html', referrer: 'https://fitablejp.com/',
    store: { lt_source: 'meta', lt_medium: 'paid', lt_term: 'k', lt_click: 'fbclid', lt_ts: Date.now() - 91 * DAY } });
  const a = r.attr();
  assert.equal(a.lt_source, undefined); assert.equal(a.lt_term, undefined); assert.equal(a.lt_click, undefined);
});

/* ── 목록·선택 ─────────────────────────────────────────────── */
const LIST_HTML = `<!doctype html><body><ul>
<li class="xans-record-"><a href="/product/detail.html?product_no=155&cate_no=168"><img alt=""></a><h5>懸垂補助バンド</h5></li>
<li class="xans-record-"><a href="/product/detail.html?product_no=186&cate_no=168">x</a><h5>ワイド懸垂バー</h5>
<a id="dup" href="/product/detail.html?product_no=186&cate_no=168">y</a></li>
<li><a href="/product/list3.html?cate_no=168">分類</a><a href="/board/product/list.html?board_no=4&product_no=186">レビュー</a>
<a href="/board/product/read.html?board_no=4&no=9574&product_no=100">レビュー読む</a><a href="/board/product/write.html?board_no=4&product_no=68">書く</a></li>
</ul></body>`;
test('분류 화면 view_item_list 1회(중복 상품 1번만·분류/게시판 링크 제외) + select_item 상품당 1회', async () => {
  const { events, fire, w } = load({ url: 'https://fitablejp.com/product/list3.html?cate_no=168', html: LIST_HTML });
  await wait();
  const v = events('view_item_list2');
  assert.equal(v.length, 1);
  assert.equal(JSON.stringify(v[0].ecommerce.items.map(i => i.item_id)), JSON.stringify(['155', '186']));
  assert.equal(v[0].ecommerce.item_list_name, 'category_168');
  assert.equal(v[0].ecommerce.items[1].item_name, undefined, '목록 글자를 상품명으로 긁지 않는다(1회차 리뷰 #8)');
  const a = w.document.getElementById('dup');
  fire('click', a); fire('click', a);
  const s = events('select_item2');
  assert.equal(s.length, 1); assert.equal(s[0].ecommerce.items[0].item_id, '186'); assert.equal(s[0].ecommerce.items[0].index, 1);
});

test('상세 화면에서는 view_item_list 를 보내지 않는다', async () => {
  const { events } = load({ url: 'https://fitablejp.com/product/x/186/', html: LIST_HTML });
  await wait();
  assert.equal(events('view_item_list2').length, 0);
});

/* ── 배송지 ───────────────────────────────────────────────── */
const FORM_HTML = `<!doctype html><body><input name="fname" id="fname" value="山田太郎"><input name="faddress" value="東京都">
<input name="oemail" value="a@b.com"><a href="#none" id="btn_payment" class="ftbl-paybtn btnSubmit">注文する</a></body>`;
const ORDER = [{ product_no: 186, product_name: 'ワイド', main_cate_no: 168, quantity: 1, product_price: '11500', opt_price: '0', option_str: [''] }];
test('주문서 add_shipping_info — 배송지 칸 첫 입력에 1회 · 값(이름·주소·메일)은 안 실린다', async () => {
  const { events, fire, w } = load({ url: 'https://m.fitablejp.com/order/orderform.html?basket_type=all_buy', html: FORM_HTML,
    setup: (win) => { win.aBasketProductOrderData = ORDER; } });
  await wait();
  assert.equal(events('begin_checkout2').length, 1);
  const f = w.document.getElementById('fname');
  fire('input', f); fire('change', f);
  fire('click', w.document.getElementById('btn_payment'));
  const s = events('add_shipping_info2');
  assert.equal(s.length, 1); assert.equal(s[0].ecommerce.value, 11500);
  const blob = JSON.stringify(w.dataLayer);
  for (const pii of ['山田太郎', '東京都', 'a@b.com']) assert.ok(!blob.includes(pii), `개인정보 ${pii} 가 dataLayer 에 들어감`);
});

test('주문서 add_shipping_info — 칸을 안 건드린 회원은 결제 버튼에서 1회', async () => {
  const { events, fire, w } = load({ url: 'https://m.fitablejp.com/order/orderform.html', html: FORM_HTML,
    setup: (win) => { win.aBasketProductOrderData = ORDER; } });
  await wait();
  fire('click', w.document.getElementById('btn_payment'));
  fire('click', w.document.getElementById('btn_payment'));
  assert.equal(events('add_shipping_info2').length, 1);
});

test('결제수단 아닌 칸·기계 이벤트로는 배송지 이벤트가 안 나간다', async () => {
  const { events, fire, w } = load({ url: 'https://m.fitablejp.com/order/orderform.html', html: FORM_HTML,
    setup: (win) => { win.aBasketProductOrderData = ORDER; } });
  await wait();
  fire('input', w.document.querySelector('[name=oemail]'));
  fire('input', w.document.getElementById('fname'), { isTrusted: false });
  assert.equal(events('add_shipping_info2').length, 0);
});

/* ── 구매 중복 방지(회귀) ───────────────────────────────────── */
test('주문완료 화면을 두 번 열어도 purchase 는 주문번호당 1회 · 유입칸이 실린다', async () => {
  const set = (win) => { win.EC_FRONT_EXTERNAL_SCRIPT_VARIABLE_DATA = { order_id: '20261025-0000001', payment_amount: '11500',
    order_product: [{ product_no: 186, product_name: 'ワイド', quantity: 1, product_price: '11500' }] }; };
  const t = Date.now() - DAY;
  const st = { lt_source: 'line', lt_medium: 'message', lt_click: 'ldtag_cl', lt_ts: t, ft_source: 'line', ft_ts: t };
  const r1 = load({ url: 'https://m.fitablejp.com/order/order_result.html?order_id=20261025-0000001', store: st, setup: set });
  await wait();
  const p = r1.events('purchase2');
  assert.equal(p.length, 1); assert.equal(p[0].lt_click, 'ldtag_cl'); assert.equal(p[0].ecommerce.transaction_id, '20261025-0000001');
  const sent = r1.w.localStorage.getItem('fjp_purchase_sent');
  const r2 = load({ url: 'https://m.fitablejp.com/order/order_result.html?order_id=20261025-0000001', store: st,
    setup: (win) => { set(win); win.localStorage.setItem('fjp_purchase_sent', sent); } });
  await wait();
  assert.equal(r2.events('purchase2').length, 0);
});

/* ── 리뷰 카드 노출 ─────────────────────────────────────────── */
test('리뷰 카드가 늦게 그려져도 1회 노출 이벤트 · 카드 없는 상품은 0회', async () => {
  const html = '<!doctype html><body><div id="prdDetail"></div><div id="prdReview"><div class="xans-product-review"></div></div></body>';
  const r = load({ url: 'https://fitablejp.com/product/x/186/', html });
  await wait(40);
  const ul = r.w.document.createElement('ul'); ul.className = 'fa-rv-list';
  ul.innerHTML = '<li class="fa-rv-card">a</li><li class="fa-rv-card">b</li>';
  r.w.document.querySelector('.xans-product-review').appendChild(ul);
  await wait(120);
  assert.equal(r.events('jp01_pdp_review_card_view').length, 1);
  const r0 = load({ url: 'https://fitablejp.com/product/x/100/', html });
  await wait(120);
  assert.equal(r0.events('jp01_pdp_review_card_view').length, 0);
});

test('다른 도메인에서는 아무 것도 안 한다(한국몰 회귀 0)', async () => {
  const { w } = load({ url: 'https://passionate2024.cafe24.com/?gclid=X' });
  await wait();
  assert.equal(w.localStorage.getItem('fjp_attr'), null);
  assert.equal(w.dataLayer.length, 0);
});

test('일본몰 분류 주소 /category/<이름>/<번호>/ → category_<번호> · 도착 화면 list/<번호> (1회차 리뷰 #7)', async () => {
  const { events, attr } = load({ url: 'https://fitablejp.com/category/%E3%83%AF%E3%82%A4%E3%83%89/168/?utm_source=t', html: LIST_HTML });
  await wait();
  assert.equal(events('view_item_list2')[0].ecommerce.item_list_name, 'category_168');
  assert.equal(attr().lt_landing, 'list/168');
});

test('주문내용보다 먼저 배송지·결제수단을 건드리면 begin_checkout → 배송지 → 결제수단 순서로 1회씩 (1회차 리뷰 #9)', async () => {
  const html = FORM_HTML.replace('</body>', '<select name="addr_paymethod"><option>card</option></select></body>');
  const { events, fire, w } = load({ url: 'https://m.fitablejp.com/order/orderform.html', html,
    setup: (win) => { win.aBasketProductOrderData = ORDER; } });
  fire('input', w.document.getElementById('fname'));                          /* 타이머 전 = 주문내용 아직 */
  fire('change', w.document.querySelector('[name=addr_paymethod]'));
  await wait();
  const seq = w.dataLayer.filter(e => e && /^(begin_checkout2|add_shipping_info2|add_payment_info2)$/.test(e.event)).map(e => e.event);
  assert.equal(JSON.stringify(seq), JSON.stringify(['begin_checkout2', 'add_shipping_info2', 'add_payment_info2']));
});

test('저장값이 (direct) 뿐이면 앱 안 표시로 바꾼다(정보 없는 값만) — 독립 리뷰 #4', () => {
  const t = Date.now() - DAY;
  const { attr } = load({ url: 'https://m.fitablejp.com/', ua: UA_LINE,
    store: { lt_source: '(direct)', lt_medium: '(none)', lt_ts: t, ft_source: '(direct)', ft_ts: t } });
  assert.equal(attr().lt_source, 'line'); assert.equal(attr().lt_medium, 'inapp');
  assert.equal(attr().ft_source, '(direct)', '최초유입은 그대로');
});

test('utm_campaign·utm_content 의 메일 주소 모양은 지우고 광고 ID 숫자는 남긴다 — 독립 리뷰 #3', () => {
  const { attr } = load({ url: 'https://fitablejp.com/?utm_source=mail&utm_medium=x&utm_campaign=24314931751&utm_content=' + encodeURIComponent('to_a.b@c.jp') });
  assert.equal(attr().lt_campaign, '24314931751');
  assert.ok(!attr().lt_content.includes('@'));
});
