// CMS build: rewrites the editable blocks of the static site from content/site.json.
// Runs on Vercel on every deploy (vercel.json → buildCommand) and locally before a push.
// Idempotent: each block is fully regenerated, so running it twice gives the same files.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/site.json'), 'utf8'));
const P = site.projects || [];
const R = (site.reviews || []).filter((r) => r.quote && r.name);

// ---------- helpers ----------
const escH = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const brk = (s) => escH(s).replace(/\r?\n/g, '<br />');
const exists = (rel) => { try { return fs.statSync(path.join(ROOT, rel)).isFile(); } catch { return false; } };
const v900 = (src) => src.replace(/\.webp$/, '-900.webp');
const srcset = (src, w) => (src.startsWith('assets/') && exists(v900(src)) ? ` srcset="${v900(src)} 900w, ${src} ${w}w" sizes="(max-width: 1023px) 100vw, 50vw"` : '');
const ARROW_A = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"></path></svg>';
const ARROW_B = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"></path></svg>';
const BADGE = '<span class="cpt-b">Концепт</span>';
const CATS = { re: 'Нерухомість', ag: 'Агенції', br: 'Бренди', art: 'Арт' };

// in JS files the markup sits inside html`…` template literals
const forJS = (s) => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

// find the element that opens with `openRe`, return [innerStart, innerEnd]
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
// the element that directly wraps the first `childRe` match
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

// ---------- blocks ----------
const works = P.filter((p) => p.inWorks);
const featured = works.find((p) => p.featured) || null;
const rest = works.filter((p) => p !== featured);

function worksGrid() {
  let out = '\n';
  if (featured) {
    const p = featured;
    out += `<a class="wfeat" data-c="${p.cat}" href="${escH(p.url)}" target="_blank" rel="noopener" style="--i: 0; grid-column: 1 / -1; position: relative; display: flex; flex-direction: column; gap: 28px; color: #0F0F0F; text-decoration: none">\n`
      + `<div class="wf-media">${p.concept ? BADGE : ''}<img loading="lazy" decoding="async" src="${escH(p.imgWide)}"${srcset(p.imgWide, 1800)} alt="${escH(p.imgAlt || p.name)}" draggable="false" class="case-img" style="aspect-ratio: 16 / 9; border-radius: 24px; background: #1A1A1A" /></div>\n`
      + `<div class="wf-meta"><div><p class="wf-title" style="margin: 0; font-size: 48px; font-weight: 600; line-height: 0.95; letter-spacing: -0.045em">${escH(p.name)}</p><p class="bd mut-l" style="margin-top: 12px">${escH(p.location)}</p></div>`
      + `<div><p class="bd" style="margin: 0; max-width: 560px">${brk(p.longText)}</p>`
      + (p.tags && p.tags.length ? `<div style="margin-top: 18px; display: flex; gap: 6px; flex-wrap: wrap">${p.tags.map((t) => `<span class="wf-tag">${escH(t)}</span>`).join('')}</div>` : '')
      + `<span class="w-go" aria-hidden="true">${escH(p.linkLabel || 'Дивитися сайт')}${ARROW_A}</span></div></div>\n</a>\n`;
  }
  rest.forEach((p, i) => {
    out += `<a class="ru" data-c="${p.cat}" href="${escH(p.url)}" target="_blank" rel="noopener" style="--i: ${i % 2}; position: relative; display: flex; flex-direction: column; gap: 20px; color: #0F0F0F; text-decoration: none">\n`
      + (p.concept ? BADGE + '\n' : '')
      + `<img loading="lazy" decoding="async" src="${escH(p.imgWide)}"${srcset(p.imgWide, 1800)} alt="${escH(p.imgAlt || p.name)}" draggable="false" class="case-img" style="aspect-ratio: 1920 / 1080; border-radius: 24px; background: #1A1A1A" />\n`
      + `<div style="display: flex; flex-direction: column; gap: 6px"><p style="margin: 0; font-size: 22px; font-weight: 600; line-height: 1.15; letter-spacing: -0.02em">${escH(p.name)}</p><p class="bd mut-l" style="max-width: 520px">${brk(p.cardText)}</p><span class="w-go" aria-hidden="true">${escH(p.linkLabel || 'Дивитися сайт')}${ARROW_A}</span></div>\n</a>\n`;
  });
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
    if (withHref) open = open.replace('<div class="ring-card"', `<div class="ring-card" data-href="${escH(p.url)}"`);
    out += open + E(`<img loading="lazy" decoding="async" draggable="false" src="${escH(p.imgCard || p.imgWide)}" alt="${escH(p.name)} — проєкт Brilliant" style="width: 100%; height: 260px; object-fit: cover; display: block; box-sizing: border-box; border: 1px solid #2B2B2B; border-radius: 10px; background: #1A1A1A" />`
      + `<div style="padding: 14px 2px 0"><p style="margin: 0; font-size: 22px; font-weight: 600; line-height: 1.2; color: ${withHref ? '#EBEBEB' : '#0F0F0F'}">${escH(p.name)}</p><p style="margin: 6px 0 0; font-size: 17px; line-height: 1.2; color: ${withHref ? 'rgba(255,255,255,0.5)' : 'rgba(15,15,15,0.55)'}">${brk(p.cardSub)}</p></div></div>\n`);
  }
  return out;
}

function cases() {
  const list = P.filter((p) => p.dev && p.dev.show);
  return '\n' + list.map((p) => {
    const d = p.dev;
    return `<article class="cs-card"><a class="cs-cover" href="${escH(p.url)}" target="_blank" rel="noopener" aria-label="${escH(p.name)} — відкрити сайт"></a>${p.concept ? BADGE : ''}`
      + `<img loading="lazy" decoding="async" src="${escH(d.img || p.imgWide)}"${srcset(d.img || '', 1200)} alt="${escH(d.imgAlt || p.name)}" class="case-img" style="aspect-ratio: 4 / 3" />`
      + `<div style="margin-top: 18px; display: flex; justify-content: space-between; align-items: baseline; gap: 12px"><p class="tu">${escH(p.name)}</p><p class="bd sm mut-l">${escH(d.location)}</p></div>`
      + (d.tags && d.tags.length ? `<div style="margin-top: 12px; display: flex; gap: 6px; flex-wrap: wrap">${d.tags.map((t) => `<span class="cs-tag">${escH(t)}</span>`).join('')}</div>` : '')
      + `<div style="margin-top: 16px">${(d.rows || []).filter((r) => r.text).map((r) => `<div class="cs-row"><p class="bd sm mut-l">${escH(r.label)}</p><p class="bd" style="margin-top: 4px">${brk(r.text)}</p></div>`).join('')}</div>`
      + `<span class="cs-open" aria-hidden="true">${escH(d.linkLabel || 'Відкрити сайт')}${ARROW_B}</span></article>`;
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

// ---------- apply ----------
const splice = (s, rg, txt) => s.slice(0, rg[0]) + txt + s.slice(rg[1]);
function apply(s, js, page) {
  const T = js ? forJS : (x) => x;
  let rg;
  if ((rg = inner(s, /<div class="wgrid"[^>]*>/g))) s = splice(s, rg, T(worksGrid()));
  if (page === 'home' || page === 'projects') s = tabs(s);
  if (page === 'home' && (rg = wrapper(s, /<div class="ring-card"/))) {
    const tpl = firstOpenTag(s.slice(rg[0]), /<div class="ring-card"[^>]*>/);
    s = splice(s, rg, ring(P.filter((p) => p.inGallery), 14, tpl, false, T));
  }
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
}
const PAGES = [
  ['index.html', 'assets/app.js', 'home'],
  ['projects.html', 'assets/app-projects.js', 'projects'],
  ['development.html', 'assets/app-development.js', 'dev'],
];
const changedJS = [];
for (const [html, js, page] of PAGES) {
  for (const [f, isJS] of [[html, false], [js, true]]) {
    const fp = path.join(ROOT, f);
    if (!fs.existsSync(fp)) continue;
    const before = fs.readFileSync(fp, 'utf8');
    const after = apply(before, isJS, page);
    if (after !== before) { fs.writeFileSync(fp, after); if (isJS) changedJS.push(f); }
  }
}
// bump ?v= cache keys of changed scripts
for (const js of changedJS) {
  const h = crypto.createHash('md5').update(fs.readFileSync(path.join(ROOT, js))).digest('hex').slice(0, 8);
  for (const [html] of PAGES.concat([['contacts.html'], ['404.html'], ['privacy.html']])) {
    const fp = path.join(ROOT, html); if (!fs.existsSync(fp)) continue;
    const s = fs.readFileSync(fp, 'utf8');
    const t = s.split(`${js}?v=`).map((x, i) => (i === 0 ? x : x.replace(/^[0-9a-f]+/, h))).join(`${js}?v=`);
    if (t !== s) fs.writeFileSync(fp, t);
  }
}
console.log('cms build: projects', P.length, 'reviews', R.length, 'changed', changedJS.join(', ') || 'none');
