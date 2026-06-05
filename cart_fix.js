(function(){
  if (window.__fitableCartFix) return; window.__fitableCartFix = 1;
  function lastEcom(){
    try{ var dl=window.dataLayer||[];
      for(var i=dl.length-1;i>=0;i--){ var e=dl[i];
        if(e && e.ecommerce && e.ecommerce.items && e.ecommerce.items.length) return e.ecommerce; } }catch(e){}
    return null;
  }
  function qty(){
    try{ var q=document.querySelector('input[name="quantity"],#quantity,.quantity input,input.quantity');
      var n=q?parseInt((q.value||'1').replace(/[^0-9]/g,''),10):1; return n>0?n:1; }catch(e){ return 1; }
  }
  function fire(eventName){
    if (typeof window.gtag!=='function') return false;
    var ec=lastEcom(); var q=qty();
    var items=(ec&&ec.items)?ec.items.map(function(it){
      return {item_id:it.item_id, item_name:it.item_name, price:(it.price||ec.value), quantity:q}; }):[];
    var val=(ec&&ec.value?ec.value:0)*q;
    window.gtag('event', eventName, {
      currency:(ec&&ec.currency)||'KRW', value:val, items:items,
      send_to:'G-V7D156FCFX', transport_type:'beacon'
    });
    return true;
  }
  function hook(){
    document.addEventListener('click', function(ev){
      var el=ev.target.closest && ev.target.closest('[onclick]'); if(!el) return;
      var oc=el.getAttribute('onclick')||'';
      if(/product_submit\(\s*2\s*,/.test(oc)) fire('add_to_cart');
      else if(/product_submit\(\s*1\s*,/.test(oc)) fire('begin_checkout');
    }, true);
  }
  if(document.readyState!=='loading') hook(); else document.addEventListener('DOMContentLoaded', hook);
})();
