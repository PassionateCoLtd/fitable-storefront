const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../addpayinfo.js'),'utf8');
function env({host='fitablekorea.com',pathname='/order/orderform.html',total='69,900',gtag=true}={}){
 const ls={},events=[];const selected={name:'addr_paymethod',type:'radio',checked:true,value:'cash'};
 const doc={addEventListener:(n,f)=>ls[n]=f,querySelector:s=>s.includes(':checked')?selected:{textContent:total}};
 const w={dataLayer:[{event:'begin_checkout2',ecommerce:{items:[{item_id:126,quantity:1,price:69900}]}}]};w.top=w.self=w;
 if(gtag)w.gtag=(...a)=>events.push(a);const ctx={window:w,document:doc,location:{hostname:host,pathname},Date,Math};
 vm.runInNewContext(code,ctx);return{w,ctx,events,selected,change(v){selected.value=v;ls.change?.({target:selected});},submit(){ls.click?.({target:{closest:()=>({id:'btn_payment'})}});},reload(){vm.runInNewContext(code,ctx)}};
}
test('no event on load or checked default',()=>assert.equal(env().events.length,0));
test('selection and changes carry actual method',()=>{const e=env();e.change('card');e.change('card');e.change('naverpay');e.change('card');assert.deepEqual(e.events.map(x=>x[2].payment_type),['card','naverpay','card']);assert(e.events.every(x=>x[1]==='add_payment_info'));});
test('submit uses selected method and separate attempt',()=>{const e=env();e.submit();assert.deepEqual(e.events.map(x=>x[1]),['add_payment_info','checkout_submit']);assert(e.events.every(x=>x[2].payment_type==='cash'));});
test('selection then submit no second selection',()=>{const e=env();e.change('card');e.submit();e.submit();assert.equal(e.events.length,2);});
test('new order same amount is counted',()=>{const a=env(),b=env();a.change('card');b.change('card');assert.equal(a.events.length+b.events.length,2);assert.notEqual(a.events[0][2].checkout_id,b.events[0][2].checkout_id);});
test('zero total is preserved',()=>{const e=env({total:'0'});e.change('card');assert.equal(e.events[0][2].value,0);});
test('missing total omitted',()=>{const e=env({total:''});e.change('card');assert.equal(e.events[0][2].value,undefined);});
test('unknown method cannot leak free text',()=>{const e=env();e.change('customer@email.com');assert.equal(e.events.length,0);});
test('failed gtag does not consume selection',()=>{const e=env({gtag:false});e.change('card');e.w.gtag=(...a)=>e.events.push(a);e.change('card');assert.equal(e.events.length,1);});
test('singleton no duplicate listener',()=>{const e=env();e.reload();e.change('card');assert.equal(e.events.length,1);});
test('other country and non-checkout ignored',()=>{const a=env({host:'jp.fitablekorea.com'}),b=env({pathname:'/product/detail.html'});a.change('card');b.change('card');assert.equal(a.events.length+b.events.length,0);});
test('pin GA only and do not emit purchase',()=>{const e=env();e.change('card');e.submit();assert(e.events.every(x=>x[2].send_to==='G-V7D156FCFX'&&x[1]!=='purchase'));assert.equal(e.w.dataLayer.length,1);});
