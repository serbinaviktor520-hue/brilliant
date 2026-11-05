// CMS build: applies content/site.json (projects, reviews, page text/photo edits) to the static site.
// Runs on Vercel on every deploy (vercel.json → buildCommand) and locally before a push.
// Idempotent: blocks are fully regenerated and edits are chain-safe, so running it twice gives the same files.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PAGES, makeBuilder } from './core.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/site.json'), 'utf8'));
const exists = (rel) => { try { return fs.statSync(path.join(ROOT, rel)).isFile(); } catch { return false; } };
const build = makeBuilder(site, exists);

const changedJS = [];
for (const pg of PAGES) {
  for (const [f, isJS] of [[pg.html, false], [pg.js, true]]) {
    if (!f) continue;
    const fp = path.join(ROOT, f);
    if (!fs.existsSync(fp)) continue;
    const before = fs.readFileSync(fp, 'utf8');
    const after = build(before, isJS, pg.id);
    if (after !== before) { fs.writeFileSync(fp, after); if (isJS) changedJS.push(f); }
  }
}
// bump ?v= cache keys of changed scripts
for (const js of changedJS) {
  const h = crypto.createHash('md5').update(fs.readFileSync(path.join(ROOT, js))).digest('hex').slice(0, 8);
  for (const pg of PAGES) {
    const fp = path.join(ROOT, pg.html); if (!fs.existsSync(fp)) continue;
    const s = fs.readFileSync(fp, 'utf8');
    const t = s.split(`${js}?v=`).map((x, i) => (i === 0 ? x : x.replace(/^[0-9a-f]+/, h))).join(`${js}?v=`);
    if (t !== s) fs.writeFileSync(fp, t);
  }
}
console.log('cms build: projects', (site.projects || []).length, 'reviews', (site.reviews || []).length, 'edits', (site.edits || []).length, 'changed', changedJS.join(', ') || 'none');
