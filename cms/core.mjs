// CMS core: pure functions shared by the build (Node, cms/build.mjs) and the admin live preview (browser).
// No fs / DOM here. site = content/site.json.
//   • project / review blocks are regenerated from site.projects / site.reviews
//   • site.edits = [{ page: 'home'|'projects'|'dev'|'contacts'|'privacy'|'404'|'*', type: 'text'|'img', from, to }]
//     are applied in order (chain-safe: A→B then B→C works on files that hold A or B).

export const PAGES = [
  { id: 'home', html: 'index.html', js: 'assets/app.js', title: 'Головна' },
  { id: 'projects', html: 'projects.html', js: 'assets/app-projects.js', title: 'Проєкти' },
  { id: 'dev', html: 'development.html', js: 'assets/app-development.js', title: 'Девелоперам' },
  { id: 'contacts', html: 'contacts.html', js: 'assets/app-contacts.js', title: 'Контакти' },
  { id: 'privacy', html: 'privacy.html', js: null, title: 'Політика' },
  { id: '404', html: '404.html', js: null, title: '404' },
  ...['tysha', 'strata', 'yarus', 'nody', 'grey-agency', 'vibe-trvl', 'october'].map((c) => ({ id: 'case-' + c, html: `cases/${c}.html`, js: null, title: 'Кейс · ' + ({ tysha: 'TYSHA', strata: 'STRATA', yarus: 'YARUS', nody: 'NODY', 'grey-agency': 'Grey Agency', 'vibe-trvl': 'Vibe Trvl', october: 'October' })[c], group: 'cases' })),
];
// a project with its own case page links there; otherwise to the live site
export const linkOf = (p) => (p && p.case ? `/cases/${p.id}` : (p && p.url) || '#');
const tgt = (p) => (p && p.case ? '' : ' target="_blank" rel="noopener"');

// ---------- helpers ----------
export const escH = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const brk = (s) => escH(s).replace(/\r?\n/g, '<br />');
const v900 = (src) => src.replace(/\.webp$/, '-900.webp');
const ARROW_A = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"></path></svg>';
const ARROW_B = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"></path></svg>';
const BADGE = '<span class="cpt-b">Концепт</span>';
export const CATS = { re: 'Нерухомість', ag: 'Агенції', br: 'Бренди', art: 'Арт' };

// in JS files the markup sits inside html`…` template literals
export const forJS = (s) => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

function inner(s, openRe, from = 0) {
  openRe.lastIndex = from;
  const m = openRe.exec(s);
  if (!m) return null;
  const tag = (m[0].match(/^<(\w+)/) || [])[1];
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'g');
  re.lastIndex = m.index + m[0].length;
  let depth = 1, t;
  while ((t = re.exec(s))) { depth += t[1] ? -1 : 1; if (depth === 0) return [m.index + m[0].length, t.index]; }
  return null;
}
function wrapper(s, childRe) {
  const m = s.search(childRe);
  if (m < 0) return null;
  const open = s.lastIndexOf('<div', m - 1);
  const gt = s.indexOf('>', open);
  if (s.slice(gt + 1, m).trim() !== '') return null;
  const re = /<(\/?)div\b[^>]*>/g; re.lastIndex = gt + 1;
  let depth = 1, t;
  while ((t = re.exec(s))) { depth += t[1] ? -1 : 1; if (depth === 0) return [gt + 1, t.index]; }
  return null;
}
const firstOpenTag = (s, re) => { const m = s.match(re); return m ? m[0] : null; };
const splice = (s, rg, txt) => s.slice(0, rg[0]) + txt + s.slice(rg[1]);

// ---------- «your project» slot ----------
function reticle() {
  let ticks = '';
  for (let i = 0; i < 72; i++) {
    const a = (i * 5 * Math.PI) / 180, long = i % 6 === 0, r1 = long ? 118 : 124, r2 = 132;
    ticks += `<line x1="${(200 + r1 * Math.cos(a)).toFixed(1)}" y1="${(200 + r1 * Math.sin(a)).toFixed(1)}" x2="${(200 + r2 * Math.cos(a)).toFixed(1)}" y2="${(200 + r2 * Math.sin(a)).toFixed(1)}" stroke="rgba(15,15,15,${long ? 0.4 : 0.16})" stroke-width="${long ? 2 : 1}"></line>`;
  }
  const br = (x, y, dx, dy) => `<path d="M${x} ${y + dy * 22}V${y}H${x + dx * 22}" fill="none" stroke="#3D8BFF" stroke-width="2"></path>`;
  return `<svg viewBox="0 0 400 400" aria-hidden="true" style="position: absolute; left: 50%; top: 50%; width: 78%; max-width: 520px; transform: translate(-50%, -50%); overflow: visible">`
    + `<g><animateTransform attributeName="transform" type="rotate" from="0 200 200" to="360 200 200" dur="60s" repeatCount="indefinite"></animateTransform>${ticks}</g>`
    + `<circle cx="200" cy="200" r="78" fill="none" stroke="rgba(15,15,15,0.18)" stroke-dasharray="3 6"></circle>`
    + `<line x1="0" y1="200" x2="150" y2="200" stroke="rgba(15,15,15,0.16)"></line><line x1="250" y1="200" x2="400" y2="200" stroke="rgba(15,15,15,0.16)"></line>`
    + `<line x1="200" y1="0" x2="200" y2="150" stroke="rgba(15,15,15,0.16)"></line><line x1="200" y1="250" x2="200" y2="400" stroke="rgba(15,15,15,0.16)"></line>`
    + br(150, 150, 1, 1) + br(250, 150, -1, 1) + br(150, 250, 1, -1) + br(250, 250, -1, -1)
    + `<circle cx="200" cy="200" r="4" fill="#3D8BFF"><animate attributeName="r" values="4;7;4" dur="2.4s" repeatCount="indefinite"></animate></circle></svg>`;
}
function slotCard(i) {
  return `<div class="ru" style="--i: ${i % 2}; position: relative; display: flex; flex-direction: column; gap: 20px">\n`
    + `<a href="/contacts" aria-label="Тут може бути ваш проєкт — обговорити" style="position: relative; display: block; aspect-ratio: 1920 / 1080; border-radius: 24px; overflow: hidden; color: #0F0F0F; text-decoration: none; background: rgba(255,255,255,0.35); box-shadow: inset 0 0 0 1px rgba(15,15,15,0.12)">`
    + reticle()
    + `<span style="position: absolute; left: 24px; top: 22px; font-size: 13px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(15,15,15,0.45)">Слот 2026</span>`
    + `<span style="position: absolute; right: 24px; top: 22px; font-size: 13px; font-weight: 600; letter-spacing: 0.08em; color: #3D8BFF">● Вільно</span>`
    + `<span style="position: absolute; left: 0; right: 0; bottom: 26px; text-align: center; font-size: clamp(22px, 2.4vw, 34px); font-weight: 600; letter-spacing: -0.03em">Тут може бути ваш проєкт</span></a>\n`
    + `<div style="display: flex; flex-direction: column; gap: 6px"><p style="margin: 0; font-size: 22px; font-weight: 600; line-height: 1.15; letter-spacing: -0.02em">Ваш проєкт</p><p class="bd mut-l" style="max-width: 520px">Розкажіть про задачу. Ціну й строки назву після короткого дзвінка, відповім протягом 24 годин.</p><a href="/contacts" class="w-go" style="text-decoration: none">Обговорити проєкт${ARROW_A}</a></div>\n</div>\n`;
}

// ---------- blocks ----------
function blocks(site, exists) {
  const P = site.projects || [];
  const R = (site.reviews || []).filter((r) => r.quote && r.name);
  const srcset = (src, w) => (src.startsWith('assets/') && exists(v900(src)) ? ` srcset="${v900(src)} 900w, ${src} ${w}w" sizes="(max-width: 1023px) 100vw, 50vw"` : '');
  const works = P.filter((p) => p.inWorks);
  const featured = works.find((p) => p.featured) || null;
  const rest = works.filter((p) => p !== featured);

  function worksGrid() {
    let out = '\n';
    if (featured) {
      const p = featured;
      out += `<a class="wfeat" data-c="${p.cat}" href="${escH(linkOf(p))}"${tgt(p)} style="--i: 0; grid-column: 1 / -1; position: relative; display: flex; flex-direction: column; gap: 28px; color: #0F0F0F; text-decoration: none">\n`
        + `<div class="wf-media">${p.concept ? BADGE : ''}<img loading="lazy" decoding="async" src="${escH(p.imgWide)}"${srcset(p.imgWide, 1800)} alt="${escH(p.imgAlt || p.name)}" draggable="false" class="case-img" style="aspect-ratio: 16 / 9; border-radius: 24px; background: #1A1A1A" /></div>\n`
        + `<div class="wf-meta"><div><p class="wf-title" style="margin: 0; font-size: 48px; font-weight: 600; line-height: 0.95; letter-spacing: -0.045em">${escH(p.name)}</p><p class="bd mut-l" style="margin-top: 12px">${escH(p.location)}</p></div>`
        + `<div><p class="bd" style="margin: 0; max-width: 560px">${brk(p.longText)}</p>`
        + (p.tags && p.tags.length ? `<div style="margin-top: 18px; display: flex; gap: 6px; flex-wrap: wrap">${p.tags.map((t) => `<span class="wf-tag">${escH(t)}</span>`).join('')}</div>` : '')
        + `<span class="w-go" aria-hidden="true">${escH(p.case ? 'Дивитися кейс' : p.linkLabel || 'Дивитися сайт')}${ARROW_A}</span></div></div>\n</a>\n`;
    }
    rest.forEach((p, i) => {
      out += `<a class="ru" data-c="${p.cat}" href="${escH(linkOf(p))}"${tgt(p)} style="--i: ${i % 2}; position: relative; display: flex; flex-direction: column; gap: 20px; color: #0F0F0F; text-decoration: none">\n`
        + (p.concept ? BADGE + '\n' : '')
        + `<img loading="lazy" decoding="async" src="${escH(p.imgWide)}"${srcset(p.imgWide, 1800)} alt="${escH(p.imgAlt || p.name)}" draggable="false" class="case-img" style="aspect-ratio: 1920 / 1080; border-radius: 24px; background: #1A1A1A" />\n`
        + `<div style="display: flex; flex-direction: column; gap: 6px"><p style="margin: 0; font-size: 22px; font-weight: 600; line-height: 1.15; letter-spacing: -0.02em">${escH(p.name)}</p><p class="bd mut-l" style="max-width: 520px">${brk(p.cardText)}</p><span class="w-go" aria-hidden="true">${escH(p.case ? 'Дивитися кейс' : p.linkLabel || 'Дивитися сайт')}${ARROW_A}</span></div>\n</a>\n`;
    });
    // an empty place in the 2-column grid becomes an invitation: «тут може бути ваш проєкт», drawn as a reticle
    if (rest.length % 2 === 1) out += slotCard(rest.length);
    return out;
  }

  function ring(list, n, openTpl, withHref, E = (x) => x) {
    if (!list.length) return '\n';
    let out = '\n';
    for (let k = 0; k < n; k++) {
      const p = list[((n - k) % n) % list.length];
      const ang = Math.round((k * 360 / n) * 10000) / 10000;
      let open = openTpl
        .replace(/data-i="\d+"/, `data-i="${k}"`)
        .replace(/rotateY\([-\d.]+deg\)/, `rotateY(${ang}deg)`)
        .replace(/ data-href="[^"]*"/, '');
      if (withHref) open = open.replace('<div class="ring-card"', `<div class="ring-card" data-href="${escH(linkOf(p))}"`);
      out += open + E(`<img loading="lazy" decoding="async" draggable="false" src="${escH(p.imgCard || p.imgWide)}" alt="${escH(p.name)} — проєкт Brilliant" style="width: 100%; height: 260px; object-fit: cover; display: block; box-sizing: border-box; border: 1px solid #2B2B2B; border-radius: 10px; background: #1A1A1A" />`
        + `<div style="padding: 14px 2px 0"><p style="margin: 0; font-size: 22px; font-weight: 600; line-height: 1.2; color: ${withHref ? '#EBEBEB' : '#0F0F0F'}">${escH(p.name)}</p><p style="margin: 6px 0 0; font-size: 17px; line-height: 1.2; color: ${withHref ? 'rgba(255,255,255,0.5)' : 'rgba(15,15,15,0.55)'}">${brk(p.cardSub)}</p></div></div>\n`);
    }
    return out;
  }

  function cases() {
    const list = P.filter((p) => p.dev && p.dev.show);
    return '\n' + list.map((p) => {
      const d = p.dev;
      return `<article class="cs-card"><a class="cs-cover" href="${escH(linkOf(p))}"${tgt(p)} aria-label="${escH(p.name)} — ${p.case ? 'дивитися кейс' : 'відкрити сайт'}"></a>${p.concept ? BADGE : ''}`
        + `<img loading="lazy" decoding="async" src="${escH(d.img || p.imgWide)}"${srcset(d.img || '', 1200)} alt="${escH(d.imgAlt || p.name)}" class="case-img" style="aspect-ratio: 4 / 3" />`
        + `<div style="margin-top: 18px; display: flex; justify-content: space-between; align-items: baseline; gap: 12px"><p class="tu">${escH(p.name)}</p><p class="bd sm mut-l">${escH(d.location)}</p></div>`
        + (d.tags && d.tags.length ? `<div style="margin-top: 12px; display: flex; gap: 6px; flex-wrap: wrap">${d.tags.map((t) => `<span class="cs-tag">${escH(t)}</span>`).join('')}</div>` : '')
        + `<div style="margin-top: 16px">${(d.rows || []).filter((r) => r.text).map((r) => `<div class="cs-row"><p class="bd sm mut-l">${escH(r.label)}</p><p class="bd" style="margin-top: 4px">${brk(r.text)}</p></div>`).join('')}</div>`
        + `<span class="cs-open" aria-hidden="true">${escH(p.case ? 'Дивитися кейс' : d.linkLabel || 'Відкрити сайт')}${ARROW_B}</span></article>`;
    }).join('\n') + '\n';
  }

  function reviews(openTpl, E = (x) => x) {
    if (!R.length) return '\n';
    const n = 12; let out = '\n';
    for (let k = 0; k < n; k++) {
      const r = R[k % R.length];
      const open = openTpl.replace(/rotateY\([-\d.]+deg\)/, `rotateY(${(k * 30).toFixed(1)}deg)`);
      out += open + E(`<blockquote style="margin: 0; font-size: 22px; font-weight: 500; line-height: 1.3; letter-spacing: -0.015em">«${brk(r.quote)}»</blockquote>`
        + `<figcaption style="display: flex; align-items: center; gap: 14px">`
        + (r.photo ? `<img src="${escH(r.photo)}" alt="${escH(r.name)}" loading="lazy" style="width: 52px; height: 52px; border-radius: 50%; object-fit: cover; flex: 0 0 52px; display: block; background: #D9DDE5" />` : '')
        + `<span class="bd sm"><strong>${escH(r.name)}</strong><br /><span class="mut-l">${escH(r.role)}</span></span></figcaption></figure>\n`);
    }
    return out;
  }

  function tabs(s) {
    const cnt = { all: works.length }; for (const k in CATS) cnt[k] = works.filter((p) => p.cat === k).length;
    s = s.replace(/>Усі<sup>\d+<\/sup>/g, `>Усі<sup>${cnt.all}</sup>`);
    for (const k in CATS) s = s.replace(new RegExp(`>${CATS[k]}<sup>\\d+</sup>`, 'g'), `>${CATS[k]}<sup>${cnt[k]}</sup>`);
    return s;
  }

  return function apply(s, js, page) {
    const T = js ? forJS : (x) => x;
    let rg;
    if ((rg = inner(s, /<div class="wgrid"[^>]*>/g))) s = splice(s, rg, T(worksGrid()));
    if (page === 'home' || page === 'projects') s = tabs(s);
    if (page === 'home' && (rg = wrapper(s, /<div class="ring-card"/))) {
      const tpl = firstOpenTag(s.slice(rg[0]), /<div class="ring-card"[^>]*>/);
      s = splice(s, rg, ring(P.filter((p) => p.inGallery), 14, tpl, false, T));
    }
    if (page === 'dev' && js) s = s.split('window.open(n.dataset.href,"_blank","noopener")').join('(n.dataset.href[0]==="/"?location.assign(n.dataset.href):window.open(n.dataset.href,"_blank","noopener"))');
    if (page === 'dev') {
      if ((rg = wrapper(s, /<div class="ring-card"/))) {
        const tpl = firstOpenTag(s.slice(rg[0]), /<div class="ring-card"[^>]*>/);
        s = splice(s, rg, ring(P.filter((p) => p.dev && p.dev.show), 16, tpl, true, T));
      }
      if ((rg = inner(s, /<div class="m-cases cs-scroll"[^>]*>/g))) s = splice(s, rg, T(cases()));
    }
    if ((page === 'home' || page === 'dev') && (rg = wrapper(s, /<figure class="rv-card"/))) {
      const tpl = firstOpenTag(s.slice(rg[0]), /<figure class="rv-card"[^>]*>/);
      s = splice(s, rg, reviews(tpl, T));
    }
    return s;
  };
}

// ---------- page texts ----------
// A visible text is matched only where it is a whole text node / string in the source:
// left of it (after whitespace) one of > } " ' `   and right of it one of < $ " ' `
const WS = /[ \t\r\n]/;
function ctxAt(s, i, len) {
  let a = i - 1; while (a >= 0 && WS.test(s[a])) a--;
  let b = i + len; while (b < s.length && WS.test(s[b])) b++;
  const L = s[a], R = s[b];
  if ((L === '>' || L === '}') && (R === '<' || R === '$')) return 'text';
  if ((L === '"' || L === "'" || L === '`') && L === R) return L;
  return null;
}
// source spellings of a DOM text: html may hold entities, js holds the raw characters
function variants(text, js) {
  const v = [text];
  if (!js) {
    const e = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (e !== text) v.push(e);
    if (text.includes(' ')) v.push(e.replace(/ /g, '&nbsp;'));
  } else if (/[`\\]|\$\{/.test(text)) v.push(forJS(text));
  return v;
}
function encode(to, ctx, js) {
  to = String(to).replace(/[\r\n]+/g, ' ');
  if (js) {
    if (ctx === 'text' || ctx === '`') return forJS(to.replace(/[<>]/g, ''));
    return to.replace(/\\/g, '\\\\').split(ctx).join('\\' + ctx);
  }
  if (ctx === 'text') return to.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escH(to);
}
export function countText(s, text, js) {
  if (!s || !text || text.length < 2) return 0;
  let n = 0;
  for (const v of variants(text, js)) {
    let i = -1;
    while ((i = s.indexOf(v, i + 1)) >= 0) if (ctxAt(s, i, v.length)) n++;
  }
  return n;
}
export function replaceText(s, from, to, js) {
  if (!s || !from || from.length < 2 || from === to) return s;
  for (const v of variants(from, js)) {
    let out = '', last = 0, i = -1;
    while ((i = s.indexOf(v, i + 1)) >= 0) {
      const c = ctxAt(s, i, v.length);
      if (!c) continue;
      out += s.slice(last, i) + encode(to, c, js);
      last = i + v.length; i = last - 1;
    }
    s = out + s.slice(last);
  }
  return s;
}
// images: every reference to the old path (and its -900 variant) points to the new file
export function replaceImg(s, from, to) {
  if (!s || !from || !to || from === to) return s;
  const f = from.replace(/^\//, ''), t = to.replace(/^\//, '');
  if (/\.webp$/.test(f)) s = s.split(v900(f)).join(t);
  return s.split(f).join(t);
}
// links: href="old" → href="new" (exact attribute value, so other links stay untouched)
export function replaceLink(s, from, to, js) {
  if (!s || !from || !to || from === to) return s;
  const enc = (v) => (js ? forJS(v) : v).replace(/"/g, '&quot;');
  return s.split(`href="${enc(from)}"`).join(`href="${enc(to)}"`);
}
export const countLink = (s, href, js) => (s && href ? s.split(`href="${(js ? forJS(href) : href).replace(/"/g, '&quot;')}"`).length - 1 : 0);
export function applyEdits(s, js, page, edits) {
  for (const e of edits || []) {
    if (!e || (e.page !== '*' && e.page !== page)) continue;
    if (e.type === 'img') s = replaceImg(s, e.from, e.to);
    else if (e.type === 'link') s = replaceLink(s, e.from, e.to, js);
    else s = replaceText(s, e.from, e.to, js);
  }
  return s;
}

// ---------- SEO: page title + description (Google snippet, link previews) ----------
const attrV = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function readSeo(html) {
  const dec = (v) => (v || '').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  const t = (html.match(/<title>([^<]*)<\/title>/i) || [])[1];
  const d = (html.match(/<meta name="description" content="([^"]*)"/i) || [])[1];
  return { title: dec(t), description: dec(d) };
}
export function seo(html, page, site) {
  const m = site && site.seo && site.seo[page];
  if (!m) return html;
  if (typeof m.title === 'string' && m.title.trim()) {
    const v = attrV(m.title.trim());
    html = html.replace(/<title>[^<]*<\/title>/i, `<title>${v}</title>`)
      .replace(/(<meta (?:property="og:title"|name="twitter:title") content=")[^"]*"/gi, `$1${v}"`);
  }
  if (typeof m.description === 'string' && m.description.trim()) {
    const v = attrV(m.description.trim());
    html = html.replace(/(<meta (?:name="description"|property="og:description"|name="twitter:description") content=")[^"]*"/gi, `$1${v}"`);
  }
  return html;
}

// ---------- analytics (GA4 / Google Ads) ----------
// One block right after <head>: gtag + a lead event when /api/lead answers ok (once per 30 min, so the
// "add more details" follow-up does not count twice) + clicks on Telegram / Instagram / mail / phone links.
const AN_RE = /<!--cms-analytics-->[\s\S]*?<!--\/cms-analytics-->/g;
export function analytics(html, site, on = true) {
  html = html.replace(AN_RE, '');
  const a = (site && site.analytics) || {};
  const ids = [a.ga4, a.ads].filter((x) => typeof x === 'string' && /^(G|AW)-[A-Z0-9]{4,16}$/.test(x));
  if (!on || !ids.length) return html;
  const conv = typeof a.adsLead === 'string' && /^AW-[A-Z0-9]+\/[\w-]+$/.test(a.adsLead) ? a.adsLead : '';
  const js = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());`
    + ids.map((id) => `gtag('config','${id}');`).join('')
    + `(function(){var f=window.fetch;if(!f)return;window.fetch=function(u,o){var p=f.apply(this,arguments);try{var s=typeof u==='string'?u:(u&&u.url)||'';if(s.indexOf('/api/lead')>-1){p.then(function(r){if(!r.ok)return;var k='bl-lead',t=Date.now(),l=0;try{l=+sessionStorage.getItem(k)||0}catch(e){}if(t-l<18e5)return;try{sessionStorage.setItem(k,String(t))}catch(e){}gtag('event','generate_lead',{page_path:location.pathname});`
    + (conv ? `gtag('event','conversion',{send_to:'${conv}'});` : '')
    + `}).catch(function(){})}}catch(e){}return p}})();`
    + `document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');if(!a)return;var h=a.getAttribute('href')||'',m=/t\\.me\\//.test(h)?'telegram':/instagram\\.com/.test(h)?'instagram':/^mailto:/.test(h)?'email':/^tel:/.test(h)?'phone':/behance\\.net/.test(h)?'behance':'';if(m)gtag('event','contact_click',{method:m,link_url:h})},true);`;
  const block = `<!--cms-analytics--><script async src="https://www.googletagmanager.com/gtag/js?id=${ids[0]}"></script><script>${js}</script><!--/cms-analytics-->`;
  return html.replace(/<head([^>]*)>/i, (m) => m + block);
}

// full transform of one source file; opts.analytics = false strips the tracking (admin preview)
export function makeBuilder(site, exists = () => false, opts = {}) {
  const b = blocks(site, exists);
  return (s, js, page) => { s = applyEdits(b(s, js, page), js, page, site.edits); return js ? s : analytics(seo(s, page, site), site, opts.analytics !== false); };
}
