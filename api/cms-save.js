// Vercel Edge Function: saves edits from /admin into the site repository on GitHub.
// One request = one commit (content/site.json + any new images in uploads/). Vercel then redeploys
// the site and cms/build.mjs rebuilds the editable blocks from the new site.json (≈1 minute).
// Environment variables (Vercel → Settings → Environment Variables):
//   ADMIN_PASSWORD  — password for /admin
//   GITHUB_TOKEN    — fine-grained token with "Contents: Read and write" on the site repository
//   GITHUB_REPO     — optional, default serbinaviktor520-hue/brilliant
//   GITHUB_BRANCH   — optional, default main
export const config = { runtime: 'edge' };

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

const fails = new Map(); // ip -> [timestamps of wrong passwords]
function locked(ip) {
  const now = Date.now(), win = 15 * 60 * 1000;
  const arr = (fails.get(ip) || []).filter((t) => now - t < win);
  fails.set(ip, arr);
  return arr.length >= 8;
}
function fail(ip) { const a = fails.get(ip) || []; a.push(Date.now()); fails.set(ip, a); if (fails.size > 5000) fails.clear(); }

function same(a, b) {
  const x = new TextEncoder().encode(String(a)), y = new TextEncoder().encode(String(b));
  let d = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] || 0) ^ (y[i] || 0);
  return d === 0;
}

const b64 = (str) => { const bytes = new TextEncoder().encode(str); let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); };

function validSite(site) {
  if (!site || typeof site !== 'object' || !Array.isArray(site.projects) || !Array.isArray(site.reviews)) return 'Неправильний формат даних';
  if (site.projects.length > 60 || site.reviews.length > 40) return 'Забагато записів';
  for (const p of site.projects) {
    if (!p || typeof p.name !== 'string' || !p.name.trim()) return 'У кожного проєкту має бути назва';
    if (p.url && !/^https?:\/\//.test(p.url)) return `Посилання проєкту «${p.name}» має починатися з https://`;
  }
  if (site.projects.filter((p) => p.inWorks && p.featured).length > 1) return 'Великою карткою може бути лише один проєкт';
  return '';
}

export default async function handler(req) {
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (locked(ip)) return json({ ok: false, error: 'Забагато спроб. Спробуйте за 15 хвилин.' }, 429);
  const PASS = process.env.ADMIN_PASSWORD, TOKEN = process.env.GITHUB_TOKEN;
  if (!PASS || !TOKEN) return json({ ok: false, error: 'Адмінку ще не налаштовано: додайте ADMIN_PASSWORD і GITHUB_TOKEN у Vercel.' }, 500);
  let body;
  try { body = await req.json(); } catch { return json({ ok: false, error: 'Неправильний запит' }, 400); }
  if (!same(body.password || '', PASS)) { fail(ip); return json({ ok: false, error: 'Неправильний пароль' }, 401); }
  if (body.action === 'check') return json({ ok: true });

  const site = body.site;
  const err = validSite(site);
  if (err) return json({ ok: false, error: err }, 400);
  const files = Array.isArray(body.files) ? body.files : [];
  if (files.length > 16) return json({ ok: false, error: 'Забагато нових фото за раз (максимум 16). Опублікуйте частинами.' }, 400);
  for (const f of files) {
    if (!f || !/^uploads\/[a-z0-9][a-z0-9-]{0,80}\.(webp|jpg|jpeg|png)$/.test(f.path || '') || typeof f.base64 !== 'string') return json({ ok: false, error: 'Неправильний файл' }, 400);
  }
  site.updatedAt = Date.now();

  const REPO = process.env.GITHUB_REPO || 'serbinaviktor520-hue/brilliant';
  const BRANCH = process.env.GITHUB_BRANCH || 'main';
  const gh = async (p, opt = {}) => {
    const r = await fetch(`https://api.github.com/repos/${REPO}${p}`, { ...opt, headers: { authorization: `Bearer ${TOKEN}`, accept: 'application/vnd.github+json', 'user-agent': 'brilliant-admin', 'content-type': 'application/json', ...(opt.headers || {}) } });
    const t = await r.text(); let d = null; try { d = JSON.parse(t); } catch {}
    if (!r.ok) throw new Error(`GitHub ${r.status}: ${(d && d.message) || t.slice(0, 120)}`);
    return d;
  };
  try {
    const ref = await gh(`/git/ref/heads/${BRANCH}`);
    const head = await gh(`/git/commits/${ref.object.sha}`);
    const entries = [];
    const blob = async (content) => (await gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content, encoding: 'base64' }) })).sha;
    for (const f of files) entries.push({ path: f.path, mode: '100644', type: 'blob', sha: await blob(f.base64) });
    entries.push({ path: 'content/site.json', mode: '100644', type: 'blob', sha: await blob(b64(JSON.stringify(site, null, 2) + '\n')) });
    const tree = await gh('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: head.tree.sha, tree: entries }) });
    const msg = (typeof body.message === 'string' && body.message.trim()) ? body.message.trim().slice(0, 120) : 'Оновлення з адмінки';
    const commit = await gh('/git/commits', { method: 'POST', body: JSON.stringify({ message: msg, tree: tree.sha, parents: [ref.object.sha] }) });
    await gh(`/git/refs/heads/${BRANCH}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha }) });
    return json({ ok: true, commit: commit.sha.slice(0, 7), updatedAt: site.updatedAt });
  } catch (e) {
    return json({ ok: false, error: 'Не вдалося зберегти: ' + e.message }, 502);
  }
}
