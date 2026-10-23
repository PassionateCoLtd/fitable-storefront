const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(process.env.ATTR_CAPTURE_SOURCE || require('node:path').join(__dirname, '../attr_capture.js'), 'utf8');
function setup(options = {}) {
  let now = 1792720000000;
  const handlers = {}, beacons = [], events = [], scheduled = [];
  const store = new Map();
  const cookie = options.cookie ?? '_ga=GA1.1.12345.67890; _ga_V7D156FCFX=GS2.1.s1792720000$o1; fit_guid=test-fixture';
  const document = {
    readyState: 'complete', referrer: '', cookie,
    addEventListener(type, fn) { (handlers[type] ||= []).push(fn); },
    querySelector(selector) {
      if (selector === '#totalPrice .total, .totalPrice .total') return {textContent: '79,900원(1개)'};
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '.npay_btn_item, #NPAY_BUTTON_BOX') return [buyCell,wishCell];
      return [];
    },
  };
  function element(tagName, className='', parentNode=document) {return {nodeType:1,tagName,className,parentNode,handlers:{},addEventListener(type,fn){(this.handlers[type] ||= []).push(fn);}};}
  const buyCell=element('TD','npay_btn_item'), wishCell=element('TD','npay_btn_item btn_width');
  const buy=element('A','npay_btn_link npay_btn_pay btn_green',buyCell);
  const wish=element('A','npay_btn_link npay_btn_zzim',wishCell);
  const window = {localStorage: {getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},
    dataLayer:[],gtag:(...args)=>{
      if (args[0] === 'event') events.push(args);
      if (args[0] === 'get' && options.gaGet) args[3](options.gaGet[args[2]]);
    }};
  const context = {window,document,URLSearchParams,URL,Blob,
    location:{hostname:'fitablekorea.com',pathname:'/product/detail.html',search:'?product_no=126&utm_source=naver&utm_medium=cpc&utm_campaign=fixture'},
    navigator:{sendBeacon:(url,body)=>{beacons.push({url,body});return true;}},
    Date:class extends Date {static now(){return now;}},
    setTimeout:fn=>scheduled.push(fn)};
  vm.runInNewContext(source,context);
  return {beacons,events,document,element,buy,wish,buyCell,wishCell,scheduled,advance:ms=>now+=ms,
    fire(type,target,extra={}) {
      const event={type,target,isTrusted:true,...extra};
      (handlers[type]||[]).forEach(fn=>fn(event));
      const path=[];for(let el=target;el && el!==document;el=el.parentNode)path.unshift(el);
      path.forEach(el=>(el.handlers[type]||[]).forEach(fn=>fn(event)));
    }};
}
test('page load and wishlist/wrapper activation never create purchase intents',()=>{
  const h=setup(); h.scheduled.forEach(fn=>fn());
  const label=h.element('SPAN','npay_blind',h.wish);
  h.fire('touchstart',label);h.fire('mousedown',label);h.fire('click',label);
  h.fire('click',h.buyCell);
  assert.equal(h.beacons.length,0);assert.equal(h.events.length,0);
});
test('late inserted purchase button and nested label capture exactly one intent with real context',async()=>{
  const h=setup();h.scheduled.forEach(fn=>fn());
  const buy=h.element('A','npay_btn_link npay_btn_pay btn_green');
  const label=h.element('SPAN','npay_blind',buy);
  h.fire('touchstart',label);h.fire('mousedown',label);
  assert.equal(h.beacons.length,0);
  h.fire('click',label);h.fire('click',buy);
  assert.equal(h.beacons.length,1);assert.equal(h.events.length,1);
  const p=JSON.parse(await h.beacons[0].body.text());
  assert.deepEqual([p.kind,p.product_no,p.amount,p.cid,p.sid,p.lt_source,p.lt_campaign],
    ['npay','126',79900,'12345.67890','1792720000','naver','fixture']);
});
test('keyboard and SDK clicks are captured without duplicating the same action',()=>{
  const h=setup();const buy=h.element('A','npay_btn_pay');
  h.fire('click',buy,{detail:0});assert.equal(h.beacons.length,1);
  h.fire('click',buy,{isTrusted:false});assert.equal(h.beacons.length,1);
  h.advance(1201);h.fire('click',buy,{isTrusted:false});assert.equal(h.beacons.length,2);
});
test('pressing and then scrolling away without activation creates no intent',()=>{
  const h=setup();const buy=h.buy;
  h.fire('touchstart',buy);h.fire('touchmove',buy);h.fire('touchend',buy);
  h.fire('mousedown',buy);assert.equal(h.beacons.length,0);
});

test('official GA getter fills missing client cookie only for the current session',async()=>{
  const h=setup({cookie:'_ga_V7D156FCFX=GS2.1.s1792720000$o1; fit_guid=test-fixture',
    gaGet:{client_id:'222.333',session_id:1792720000}});
  assert.equal(h.beacons.length,0);
  h.fire('mousedown',h.buy);assert.equal(h.beacons.length,0);
  h.fire('click',h.buy);
  const p=JSON.parse(await h.beacons[0].body.text());
  assert.equal(p.cid,'222.333');assert.equal(p.sid,'1792720000');
});
test('missing cookie cannot borrow an expired or different session cache',async()=>{
  for (const different of [false,true]) {
    const h=setup({cookie:'_ga_V7D156FCFX=GS2.1.s1792720000$o1; fit_guid=test-fixture',
      gaGet:{client_id:'222.333',session_id:different?1792710000:1792720000}});
    if(!different)h.advance(60001);
    h.fire('click',h.buy);
    const p=JSON.parse(await h.beacons[0].body.text());assert.equal(p.cid,undefined);
  }
});
test('cookie ID remains authoritative and unavailable getter never blocks capture',async()=>{
  for (const gaGet of [undefined,{client_id:'222.333',session_id:1792720000}]) {
    const h=setup({gaGet});h.fire('click',h.buy);
    const p=JSON.parse(await h.beacons[0].body.text());assert.equal(p.cid,'12345.67890');
  }
});
test('invalid getter results and missing session cookie never create identifiers',async()=>{
  for(const opts of [
    {cookie:'_ga_V7D156FCFX=GS2.1.s1792720000$o1; fit_guid=test-fixture',gaGet:{client_id:'not-a-client',session_id:1792720000}},
    {cookie:'',gaGet:{client_id:'222.333',session_id:1792720000}}]) {
    const h=setup(opts);h.fire('click',h.buy);
    const p=JSON.parse(await h.beacons[0].body.text());assert.equal(p.cid,undefined);
  }
});
