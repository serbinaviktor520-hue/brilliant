// UA / EN switcher: header (site + case pages) and mobile menu. The app re-renders the header, so it is re-attached.
(function () {
  var en = (document.documentElement.lang || '').slice(0, 2) === 'en';
  function other() {
    var p = location.pathname.replace(/\.html$/, '').replace(/\/index$/, '/');
    var q = en ? (p.replace(/^\/en(\/|$)/, '/') || '/') : (p === '/' ? '/en/' : '/en' + p);
    return q + location.hash;
  }
  function sw(cls) {
    var a = document.createElement('a');
    a.className = cls; a.href = other();
    a.setAttribute('hreflang', en ? 'uk' : 'en'); a.setAttribute('lang', en ? 'uk' : 'en');
    a.setAttribute('aria-label', en ? 'Українська версія' : 'English version');
    a.innerHTML = en ? '<span>UA</span><i>/</i><b>EN</b>' : '<b>UA</b><i>/</i><span>EN</span>';
    a.addEventListener('click', function () { a.href = other(); try { localStorage.setItem('bl-lang', en ? 'uk' : 'en'); } catch (e) {} });
    return a;
  }
  function attach() {
    var r = document.querySelector('.site-hdr .hdr-right');
    if (r && !r.querySelector('.lang-sw')) r.insertBefore(sw('lang-sw'), r.firstChild);
    var h = document.querySelector('header.hdr');
    if (h && !h.querySelector('.lang-sw')) { var c = document.createElement('span'); c.className = 'chip lang-chip'; c.appendChild(sw('lang-sw')); var cta = h.querySelector('.chip.cta') || h.querySelector('.burger'); h.insertBefore(c, cta); }
    var n = document.querySelector('.mm-nav') || document.querySelector('.mm#mm');
    if (n && !n.querySelector('.mm-lang')) { var m = document.createElement('a'); m.className = (n.classList.contains('mm-nav') ? 'mm-l ' : '') + 'mm-lang'; m.href = other(); m.setAttribute('lang', en ? 'uk' : 'en'); m.textContent = en ? 'Українська' : 'English'; n.appendChild(m); }
  }
  var st = document.createElement('style');
  st.textContent =
    '.lang-sw{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-height:48px;padding:0 14px;margin-right:-22px;border-radius:6px;border:1px solid var(--lb,rgba(15,15,15,.15));color:var(--lc,#0F0F0F);font-size:15px;font-weight:600;line-height:1;text-decoration:none;box-sizing:border-box;transition:background-color .3s,color .3s,border-color .3s,min-height .3s,border-radius .3s}' +
    '.lang-sw i{font-style:normal;opacity:.3}.lang-sw span{opacity:.45;transition:opacity .2s}.lang-sw:hover span{opacity:1}' +
    '.site-hdr .lang-sw:hover{background:#0F0F0F;color:#FFF;border-color:#0F0F0F}' +
    '.site-hdr.hdr-compact .lang-sw{background:#000;color:#EBEBEB;border-color:#000;min-height:52px;border-radius:9px}.site-hdr.hdr-compact .lang-sw:hover{background:#222}' +
    'header.hdr .lang-chip{padding:5px}header.hdr .lang-sw{margin:0;height:100%;min-height:0;border:0;border-radius:8px;color:#EBEBEB;padding:0 14px}header.hdr .lang-sw:hover{background:#1F1F1F}' +
    '.mm-lang{opacity:.55}' +
    '@media (max-width:767px){.lang-sw{margin-right:0;min-height:40px;height:40px;padding:0 10px;border-radius:8px;border-color:rgba(235,235,235,.9);color:#EBEBEB;font-size:14px}.lang-sw b,.lang-sw i{display:none}.lang-sw span{opacity:1}' +
    '.site-hdr.hdr-compact .lang-sw{min-height:40px;border-radius:8px}header.hdr .lang-sw{height:100%;border:0}}';
  document.head.appendChild(st);
  // first-screen header looks differ per page (light / dark hero): take colours from the CTA next to it
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
