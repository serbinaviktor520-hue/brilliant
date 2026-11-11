// Language dropdown: shows the current language, opens on hover (desktop) or tap, lists both languages.
// Lives in the site header, the case-page header and the mobile menu. The app re-renders the header, so it is re-attached.
(function () {
  var en = (document.documentElement.lang || '').slice(0, 2) === 'en';
  var CHEV = '<svg class="lang-ch" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function urlFor(l) {
    var p = location.pathname.replace(/\.html$/, '').replace(/\/index$/, '/');
    var uk = p.replace(/^\/en(\/|$)/, '/') || '/';
    return (l === 'en' ? (uk === '/' ? '/en/' : '/en' + uk) : uk) + location.hash;
  }
  var LANGS = [['uk', 'UA', 'Українська'], ['en', 'EN', 'English']];
  var cur = en ? 'en' : 'uk';
  function dd() {
    var w = document.createElement('div'); w.className = 'lang-dd';
    var b = document.createElement('button'); b.type = 'button'; b.className = 'lang-sw';
    b.setAttribute('aria-haspopup', 'true'); b.setAttribute('aria-expanded', 'false');
    b.setAttribute('aria-label', en ? 'Language: English' : 'Мова: українська');
    b.innerHTML = '<b>' + (en ? 'EN' : 'UA') + '</b>' + CHEV;
    var m = document.createElement('div'); m.className = 'lang-menu'; m.setAttribute('role', 'menu');
    LANGS.forEach(function (L) {
      var a = document.createElement('a'); a.setAttribute('role', 'menuitem'); a.setAttribute('hreflang', L[0]); a.setAttribute('lang', L[0]);
      a.href = urlFor(L[0]); if (L[0] === cur) a.setAttribute('aria-current', 'true');
      a.innerHTML = '<span>' + L[2] + '</span><small>' + L[1] + '</small>';
      a.addEventListener('click', function (e) { if (L[0] === cur) { e.preventDefault(); close(); return; } a.href = urlFor(L[0]); try { localStorage.setItem('bl-lang', L[0]); } catch (x) {} });
      m.appendChild(a);
    });
    w.appendChild(b); w.appendChild(m);
    var t = 0;
    function open() { clearTimeout(t); w.classList.add('open'); b.setAttribute('aria-expanded', 'true'); }
    function close() { clearTimeout(t); w.classList.remove('open'); b.setAttribute('aria-expanded', 'false'); }
    var hov = window.matchMedia && matchMedia('(hover:hover)').matches;
    if (hov) { w.addEventListener('mouseenter', open); w.addEventListener('mouseleave', function () { t = setTimeout(close, 160); }); }
    b.addEventListener('click', function (e) { e.stopPropagation(); w.classList.contains('open') && !hov ? close() : open(); });
    document.addEventListener('click', function (e) { if (!w.contains(e.target)) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    w.addEventListener('focusout', function (e) { if (!w.contains(e.relatedTarget)) close(); });
    return w;
  }
  function attach() {
    var r = document.querySelector('.site-hdr .hdr-right');
    if (r && !r.querySelector('.lang-dd')) r.insertBefore(dd(), r.firstChild);
    var h = document.querySelector('header.hdr');
    if (h && !h.querySelector('.lang-dd')) { var c = document.createElement('span'); c.className = 'chip lang-chip'; c.appendChild(dd()); h.insertBefore(c, h.querySelector('.chip.cta') || h.querySelector('.burger')); }
    var n = document.querySelector('.mm-nav') || document.querySelector('.mm#mm');
    if (n && !n.querySelector('.mm-lang')) { var a = document.createElement('a'); a.className = (n.classList.contains('mm-nav') ? 'mm-l ' : '') + 'mm-lang'; a.href = urlFor(en ? 'uk' : 'en'); a.setAttribute('lang', en ? 'uk' : 'en'); a.textContent = en ? 'Українська' : 'English'; n.appendChild(a); }
  }
  var st = document.createElement('style');
  st.textContent =
    '.lang-dd{position:relative;display:inline-flex;margin-right:-22px}' +
    '.lang-sw{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:48px;padding:0 14px;border-radius:6px;background:transparent;border:1px solid var(--lb,rgba(15,15,15,.15));color:var(--lc,#0F0F0F);font:600 15px/1 inherit;font-family:inherit;cursor:pointer;box-sizing:border-box;transition:background-color .3s,color .3s,border-color .3s,min-height .3s,border-radius .3s}' +
    '.lang-ch{transition:transform .3s cubic-bezier(.2,.8,.2,1)}.lang-dd.open .lang-ch{transform:rotate(180deg)}' +
    '.site-hdr .lang-dd.open .lang-sw,.site-hdr .lang-sw:hover{background:#0F0F0F;color:#FFF;border-color:#0F0F0F}' +
    '.site-hdr.hdr-compact .lang-sw{background:#000;color:#EBEBEB;border-color:#000;min-height:52px;border-radius:9px}.site-hdr.hdr-compact .lang-sw:hover,.site-hdr.hdr-compact .lang-dd.open .lang-sw{background:#222}' +
    // dropdown: black plate like the compact header, opens downward; ::before bridges the gap for the hover
    '.lang-menu{position:absolute;top:calc(100% + 8px);right:0;min-width:176px;padding:5px;border-radius:9px;background:#0F0F0F;box-shadow:0 24px 60px rgba(0,0,0,.28);display:flex;flex-direction:column;gap:2px;opacity:0;visibility:hidden;transform:translateY(-6px);transition:opacity .22s ease,transform .3s cubic-bezier(.2,.8,.2,1),visibility 0s .3s;z-index:60}' +
    '.lang-menu::before{content:"";position:absolute;left:0;right:0;top:-10px;height:10px}' +
    '.lang-dd.open .lang-menu{opacity:1;visibility:visible;transform:none;transition:opacity .22s ease,transform .3s cubic-bezier(.2,.8,.2,1)}' +
    '.lang-menu a{display:flex;align-items:center;justify-content:space-between;gap:16px;height:44px;padding:0 14px;border-radius:6px;color:#EBEBEB;font-size:15px;font-weight:500;text-decoration:none;transition:background-color .2s}' +
    '.lang-menu a:hover,.lang-menu a:focus-visible{background:rgba(235,235,235,.08);outline:none}' +
    '.lang-menu small{font-size:12px;font-weight:600;letter-spacing:.08em;color:rgba(235,235,235,.45)}' +
    '.lang-menu a[aria-current] small{color:#3D8BFF}.lang-menu a[aria-current] span::after{content:"";display:inline-block;width:6px;height:6px;margin-left:8px;border-radius:50%;background:#3D8BFF;vertical-align:middle}' +
    'header.hdr .lang-chip{padding:5px}header.hdr .lang-dd{margin:0;height:100%}header.hdr .lang-sw{min-height:0;height:100%;border:0;border-radius:8px;color:#EBEBEB;padding:0 14px}header.hdr .lang-sw:hover,header.hdr .lang-dd.open .lang-sw{background:#1F1F1F}header.hdr .lang-menu{top:calc(100% + 13px);right:-5px}' +
    '.mm-lang{opacity:.55}' +
    '@media (max-width:767px){.lang-dd{margin-right:0}.lang-sw{min-height:40px;height:40px;padding:0 10px;gap:5px;border-radius:8px;border-color:rgba(235,235,235,.9);color:#EBEBEB;font-size:14px}' +
    '.site-hdr .lang-sw:hover{background:transparent;color:#EBEBEB;border-color:rgba(235,235,235,.9)}.site-hdr.hdr-compact .lang-sw{min-height:40px;border-radius:8px}.lang-menu{min-width:168px}header.hdr .lang-sw{height:100%;border:0}}';
  document.head.appendChild(st);
  function sync() {
    var h = document.querySelector('.site-hdr'), c = h && h.querySelector('.hdr-cta'), a = h && h.querySelector('.lang-sw');
    if (!a || !c || h.classList.contains('hdr-compact') || c.matches(':hover')) return;
    var cs = getComputedStyle(c); if (cs.display === 'none') return;
    var bg = cs.backgroundColor, tr = /rgba\(.*,\s*0\)|transparent/.test(bg);
    a.style.setProperty('--lc', tr ? cs.color : bg);
    a.style.setProperty('--lb', tr ? cs.borderTopColor : bg);
  }
  attach(); setTimeout(sync, 400); setTimeout(sync, 1500);
  new MutationObserver(function () { attach(); clearTimeout(sync.t); sync.t = setTimeout(sync, 380); }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
})();
