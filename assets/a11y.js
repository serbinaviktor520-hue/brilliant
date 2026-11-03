(function(){
  var SEL='a[href],button:not([disabled]),input:not([type=hidden]),select,textarea,[tabindex]:not([tabindex="-1"])';
  function vis(e){return !!(e.offsetWidth||e.offsetHeight||e.getClientRects().length)&&getComputedStyle(e).visibility!=='hidden';}
  function focusables(el){return Array.prototype.filter.call(el.querySelectorAll(SEL),vis);}
  function dialog(){var d=Array.prototype.filter.call(document.querySelectorAll('[role=dialog][aria-modal=true]'),vis);return d[d.length-1]||null;}
  function menu(){return document.body.classList.contains('mm-open')?document.querySelector('.site-hdr'):null;}
  var trigger=null,current=null;
  document.addEventListener('pointerdown',function(e){var b=e.target.closest&&e.target.closest('button,a');if(b&&!b.closest('[role=dialog]'))trigger=b;},true);
  document.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){var b=document.activeElement;if(b&&b.closest&&!b.closest('[role=dialog]'))trigger=b;}},true);
  new MutationObserver(function(){
    var d=dialog();
    if(d&&d!==current){current=d;setTimeout(function(){var c=d.querySelector('input')||d.querySelector('[aria-label="Закрити"],[aria-label="Закрити відео"]')||focusables(d)[0];if(c)c.focus({preventScroll:true});},60);}
    else if(!d&&current){current=null;if(trigger&&document.contains(trigger))trigger.focus({preventScroll:true});}
  }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('keydown',function(e){
    var d=dialog(),scope=d||menu();if(!scope)return;
    if(e.key==='Escape'){e.preventDefault();if(d){var c=d.querySelector('[aria-label^="Закрити"]');if(c)c.click();}else{var m=document.querySelector('.mm-btn');if(m)m.click();}return;}
    if(e.key!=='Tab')return;
    var f=focusables(scope);if(!f.length)return;var first=f[0],last=f[f.length-1],a=document.activeElement;
    if(!scope.contains(a)){e.preventDefault();first.focus();return;}
    if(e.shiftKey&&a===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&a===last){e.preventDefault();first.focus();}
  });
})();
