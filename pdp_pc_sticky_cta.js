/* pdp_pc_sticky_cta.js — PC 상세에 하단 고정(스티키) 구매 CTA 주입.
   모바일 스킨엔 이미 .fixed-wr 스티키바가 있으므로, .fixed-wr 가 없는 PC 스킨에서만 동작.
   대상: 사전예약 125·126. 스크롤 600px 이후 노출, 클릭 시 옵션/구매 영역으로 부드럽게 스크롤.
   스킨/상품 데이터는 안 건드림. 롤백 = ScriptTag DELETE. 2026-06-30 대표 지시(a안: PC 스티키 CTA).
   v2 (2026-07-02): 가격 표기 제거(기본가 49,900이 티어가와 달라 오인 유발 — CS 리포트),
   PDP 블랙 밴드(2.5차 카드 톤 #0B0B0D + #93C5FD)와 동일 디자인 언어로 재설계. */
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

    var og = document.querySelector('meta[property="og:title"]');
    var name = og ? (og.getAttribute('content') || '') : '';
    name = name.replace(/^\s*\[[^\]]*\]\s*/, '')            // [사전예약] 접두어 제거
               .replace(/\s*-\s*핏에이블\s*$/, '').trim();   // " - 핏에이블" 브랜드 접미어 제거

    var FONT = "'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif";
    var bar = document.createElement('div');
    bar.id = 'pc-sticky-cta';
    bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9990;background:rgba(255,255,255,.96);' +
      'backdrop-filter:saturate(180%) blur(12px);-webkit-backdrop-filter:saturate(180%) blur(12px);' +
      'border-top:1px solid #ececee;box-shadow:0 -6px 24px rgba(17,17,20,.07);display:none;' +
      'padding:12px 24px;font-family:' + FONT + ';';
    var inner = document.createElement('div');
    inner.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:28px;' +
      'width:100%;max-width:1080px;margin:0 auto;';
    var left = document.createElement('div');
    left.style.cssText = 'min-width:0;display:flex;flex-direction:column;gap:3px;';
    left.innerHTML =
      '<span style="display:flex;align-items:center;gap:7px;font-size:11px;font-weight:600;' +
        'letter-spacing:.14em;color:#8a8f98;">' +
        '<span style="width:6px;height:6px;border-radius:50%;background:#2563EB;flex:none;"></span>' +
        'PRE-ORDER &middot; 7월 31일까지</span>' +
      '<span style="font-size:16px;font-weight:700;color:#111114;white-space:nowrap;' +
        'overflow:hidden;text-overflow:ellipsis;">' + name + '</span>';
    var btn = document.createElement('a');
    btn.href = 'javascript:void(0)';
    btn.textContent = '사전예약 구매하기';
    btn.style.cssText = 'flex:none;background:#0B0B0D;color:#fff;font-size:15.5px;font-weight:700;' +
      'padding:14px 44px;border-radius:10px;text-decoration:none;cursor:pointer;letter-spacing:.01em;' +
      'transition:opacity .15s;';
    btn.onmouseenter = function () { btn.style.opacity = '.82'; };
    btn.onmouseleave = function () { btn.style.opacity = '1'; };
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
