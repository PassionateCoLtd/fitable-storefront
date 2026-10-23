const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(process.env.ATTR_CAPTURE_SOURCE || require('node:path').join(__dirname, '../attr_capture.js'), 'utf8');
function setup() {
  let now = 1792720000000;
  const handlers = {}, beacons = [], events = [], scheduled = [];
  const store = new Map();
  const cookie = '_ga=GA1.1.12345.67890; _ga_V7D156FCFX=GS2.1.s1792720000$o1; fit_guid=test-fixture';
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
    dataLayer:[],gtag:(...args)=>events.push(args)};
  const context = {window,document,URLSearchParams,URL,Blob,
    location:{hostname:'fitablekorea.com',pathname:'/product/detail.html',search:'?product_no=126&utm_source=naver&utm_medium=cpc&utm_campaign=fixture'},
    navigator:{sendBeacon:(url,body)=>{beacons.push({url,body});return true;}},
    Date:class extends Date {static now(){return now;}},
    setTimeout:fn=>scheduled.push(fn)};
  vm.runInNewContext(source,context);
  return {beacons,events,document,element,buy,wish,buyCell,wishCell,scheduled,advance:ms=>now+=ms,
    fire(type,target,extra={}) {
      const event={target,isTrusted:true,...extra};
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
