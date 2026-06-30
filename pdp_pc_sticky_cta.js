/* pdp_pc_sticky_cta.js — PC 상세에 하단 고정(스티키) 구매 CTA 주입.
   모바일 스킨엔 이미 .fixed-wr 스티키바가 있으므로, .fixed-wr 가 없는 PC 스킨에서만 동작.
   대상: 사전예약 125·126. 스크롤 600px 이후 노출, 클릭 시 옵션/구매 영역으로 부드럽게 스크롤.
   가격은 #span_product_price_text 에서 실시간 read(셀링 상태 무관). 스킨/상품 데이터는 안 건드림.
   롤백 = ScriptTag DELETE. 2026-06-30 대표 지시(a안: PC 스티키 CTA). */
(function () {
  var TARGETS = ['125', '126'];
  function pno() {
    var mm = location.search.match(/[?&]product_no=(\d+)/) ||
             location.pathname.match(/\/product\/[^\/]+\/(\d+)(?:\/|$)/);
    return mm ? mm[1] : '';
  }
  if (TARGETS.indexOf(pno()) === -1) return;

  function build() {
    if (document.querySelector('.fixed-wr')) return;        // 모바일 스킨 → 스킵
    if (document.getElementById('pc-sticky-cta')) return;   // 중복 방지

    var priceEl = document.getElementById('span_product_price_text');
    var price = priceEl ? priceEl.textContent.trim() : '';
    var og = document.querySelector('meta[property="og:title"]');
    var name = og ? (og.getAttribute('content') || '') : '';
    name = name.replace(/^\s*\[[^\]]*\]\s*/, '')            // [사전예약] 접두어 제거
               .replace(/\s*-\s*핏에이블\s*$/, '').trim();   // " - 핏에이블" 브랜드 접미어 제거

    var bar = document.createElement('div');
    bar.id = 'pc-sticky-cta';
    bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9990;background:#fff;' +
      'border-top:1px solid #e8e8e8;box-shadow:0 -4px 18px rgba(0,0,0,.08);display:none;' +
      "padding:13px 20px;font-family:'Noto Sans KR',sans-serif;";
    var inner = document.createElement('div');
    inner.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:28px;' +
      'width:100%;max-width:1080px;margin:0 auto;';
    var left = document.createElement('div');
    left.style.cssText = 'font-size:15px;color:#444;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    left.innerHTML = (name ? '<span style="color:#555;">' + name + '</span>&nbsp;&nbsp;&nbsp;' : '') +
      '<span style="color:#1a1a1a;font-weight:800;font-size:19px;">' + price + '</span>';
    var btn = document.createElement('a');
    btn.href = 'javascript:void(0)';
    btn.textContent = '구매하기';
    btn.style.cssText = 'flex:none;background:#3a7d44;color:#fff;font-size:16px;font-weight:700;' +
      'padding:13px 52px;border-radius:8px;text-decoration:none;cursor:pointer;letter-spacing:.02em;';
    btn.onclick = function () {
      var t = document.querySelector('.xans-product-option') ||
              document.getElementById('span_product_price_text') ||
              document.querySelector('.xans-product-detail');
      if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    inner.appendChild(left);
    inner.appendChild(btn);
    bar.appendChild(inner);
    document.body.appendChild(bar);

    function onScroll() { bar.style.display = (window.pageYOffset > 600) ? 'flex' : 'none'; }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
  setTimeout(build, 1200);
})();
