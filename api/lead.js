// Vercel Edge Function: приймає заявки з форм і чату на сайті.
// Куди йде заявка:
//   1) Telegram — змінні TG_BOT_TOKEN і TG_CHAT_ID;
//   2) резервна копія в Google-таблицю — змінна LEAD_SHEET_URL (необов'язково, адреса Apps Script);
//   3) завжди — рядок у логах Vercel (Logs → /api/lead).
// Заявка вважається прийнятою, якщо дійшла хоча б в одне місце (Telegram або таблиця).
// Захист від спаму: поля t (час на сторінці) і k (контрольне число) ставить скрипт сайту,
// ліміт — 6 заявок з однієї IP за 10 хвилин. Спам отримує «ok», щоб бот не пробував знову.
export const config = { runtime: 'edge' };

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

const hits = new Map(); // ip -> [timestamps]; живе в межах одного інстансу
function limited(ip) {
  const now = Date.now(), win = 10 * 60 * 1000;
  const arr = (hits.get(ip) || []).filter((x) => now - x < win);
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 6;
}

async function toSheet(row) {
  const url = process.env.LEAD_SHEET_URL;
  if (!url) return false;
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'text/plain;charset=utf-8' }, body: JSON.stringify(row), redirect: 'follow' });
    return r.ok;
  } catch (e) { return false; }
}

export default async function handler(req) {
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return json({ ok: true, skipped: 'rate' });

  const token = process.env.TG_BOT_TOKEN, chat = process.env.TG_CHAT_ID;
  let fd;
  try { fd = await req.formData(); } catch (e) { return json({ ok: false, error: 'body' }, 400); }
  const api = (m) => 'https://api.telegram.org/bot' + token + '/' + m;
  const tg = async (method, init) => {
    if (!token || !chat) return false;
    try { const r = await fetch(api(method), init); return r.ok; } catch (e) { return false; }
  };
  const when = new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv' });

  const form = String(fd.get('form') || '').slice(0, 100).trim();
  if (form) {
    const fields = String(fd.get('fields') || '').replace(/\r\n/g, '\n').slice(0, 3000).trim();
    const pg = String(fd.get('page') || '').slice(0, 200);
    if (fields.length < 4) return json({ ok: false, error: 'empty' }, 400);
    // антиспам: скрипт сайту ставить t і k; бот, що шле напряму, їх не має
    const t = Number(fd.get('t') || 0), k = String(fd.get('k') || '');
    if (k !== 'b' + (fields.length * 7 + 13) || t < 2500) {
      console.log('lead spam-skip', JSON.stringify({ ip, form, t }));
      return json({ ok: true, skipped: 'check' });
    }
    console.log('lead', JSON.stringify({ when, form, page: pg, fields }));
    const m = (/^\/en(\/|$)/.test(pg) ? '🇬🇧 EN · ' : '') + '🆕 Заявка: ' + form + '\n📄 Сторінка: ' + (pg || '/') + '\n\n' + fields;
    const [a, b] = await Promise.all([
      tg('sendMessage', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text: m }) }),
      toSheet({ when, form, page: pg, fields }),
    ]);
    return a || b ? json({ ok: true, telegram: a, sheet: b }) : json({ ok: false, error: 'delivery' }, 502);
  }

  // чат на сайті (текст або голосове)
  const text = String(fd.get('text') || '').slice(0, 3000).trim();
  const contact = String(fd.get('contact') || '').slice(0, 200).trim();
  const page = String(fd.get('page') || '').slice(0, 200);
  const voice = fd.get('voice');
  const hasVoice = voice && typeof voice === 'object' && voice.size > 0;
  if (contact.length < 4 || (!text && !hasVoice)) return json({ ok: false, error: 'empty' }, 400);
  if (hasVoice && voice.size > 20 * 1024 * 1024) return json({ ok: false, error: 'size' }, 413);
  console.log('lead', JSON.stringify({ when, form: 'Чат', page, contact, text, voice: !!hasVoice }));

  const msg = (/^\/en(\/|$)/.test(page) ? '🇬🇧 EN · ' : '') + '🆕 Заявка з чату на сайті\n\n'
    + '👤 Контакт: ' + contact + '\n'
    + '📄 Сторінка: ' + (page || '/') + '\n\n'
    + (text ? '💬 ' + text : '🎙 Голосове повідомлення нижче');
  const [a, b] = await Promise.all([
    tg('sendMessage', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text: msg }) }),
    toSheet({ when, form: 'Чат', page, fields: 'Контакт: ' + contact + '\n' + (text || '(голосове — дивіться Telegram)') }),
  ]);
  if (!a && !b) return json({ ok: false, error: 'delivery' }, 502);

  if (hasVoice && a) {
    const f = new FormData();
    f.append('chat_id', chat);
    f.append('caption', '🎙 Голосове від ' + contact);
    f.append('document', voice, voice.name || 'voice.webm');
    await tg('sendDocument', { method: 'POST', body: f });
  }
  return json({ ok: true, telegram: a, sheet: b });
}
