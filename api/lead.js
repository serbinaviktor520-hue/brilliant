// Vercel Edge Function: приймає повідомлення з чату на сайті й пересилає в Telegram.
// Потрібні змінні середовища у Vercel: TG_BOT_TOKEN (токен бота від @BotFather) і TG_CHAT_ID (ваш chat id).
export const config = { runtime: 'edge' };

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

export default async function handler(req) {
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  const token = process.env.TG_BOT_TOKEN, chat = process.env.TG_CHAT_ID;
  if (!token || !chat) return json({ ok: false, error: 'config' }, 500);
  let fd;
  try { fd = await req.formData(); } catch (e) { return json({ ok: false, error: 'body' }, 400); }
  const text = String(fd.get('text') || '').slice(0, 3000).trim();
  const contact = String(fd.get('contact') || '').slice(0, 200).trim();
  const page = String(fd.get('page') || '').slice(0, 200);
  const voice = fd.get('voice');
  const hasVoice = voice && typeof voice === 'object' && voice.size > 0;
  if (contact.length < 4 || (!text && !hasVoice)) return json({ ok: false, error: 'empty' }, 400);
  if (hasVoice && voice.size > 20 * 1024 * 1024) return json({ ok: false, error: 'size' }, 413);

  const api = (m) => 'https://api.telegram.org/bot' + token + '/' + m;
  const msg = '🆕 Заявка з чату на сайті\n\n'
    + '👤 Контакт: ' + contact + '\n'
    + '📄 Сторінка: ' + (page || '/') + '\n\n'
    + (text ? '💬 ' + text : '🎙 Голосове повідомлення нижче');
  const r1 = await fetch(api('sendMessage'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text: msg }) });
  if (!r1.ok) return json({ ok: false, error: 'telegram' }, 502);

  if (hasVoice) {
    const f = new FormData();
    f.append('chat_id', chat);
    f.append('caption', '🎙 Голосове від ' + contact);
    f.append('document', voice, voice.name || 'voice.webm');
    const r2 = await fetch(api('sendDocument'), { method: 'POST', body: f });
    if (!r2.ok) return json({ ok: false, error: 'telegram-voice' }, 502);
  }
  return json({ ok: true });
}
