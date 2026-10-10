// POST /api/health-check: re-scores the answers, builds the PDF and emails it.
// Email goes through Zoho ZeptoMail. Set these in Cloudflare Pages > Settings > Variables and secrets:
//   ZEPTOMAIL_TOKEN  (secret) Send Mail token from ZeptoMail, without the "Zoho-enczapikey" prefix
//   MAIL_FROM        verified sender, e.g. healthcheck@edinteractivegroup.com
//   NOTIFY_TO        where new health checks are copied (your inbox)
//   ZEPTOMAIL_HOST   optional, api.zeptomail.ca for a Canadian account (default api.zeptomail.com)
// Without ZEPTOMAIL_TOKEN the visitor still gets the score and the PDF download; nothing is emailed.
import { clean, validEmail, score, summary } from '../../assets/js/hc-model.js';
import { buildPdf } from '../../assets/js/hc-pdf.js';

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function base64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function send(env, msg) {
  const host = env.ZEPTOMAIL_HOST || 'api.zeptomail.com';
  const res = await fetch(`https://${host}/v1.1/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'Zoho-enczapikey ' + env.ZEPTOMAIL_TOKEN },
    body: JSON.stringify(msg)
  });
  if (!res.ok) throw new Error('ZeptoMail ' + res.status + ' ' + (await res.text()).slice(0, 300));
}

export async function onRequestPost({ request, env }) {
  if ((request.headers.get('Content-Length') || 0) > 20000) return json({ error: 'Too large.' }, 413);
  let raw;
  try { raw = await request.json(); } catch { return json({ error: 'Bad request.' }, 400); }
  if (raw && raw.website) return json({ ok: true, emailed: false }); // honeypot: bots fill the hidden field

  const a = clean(raw);
  if (a.error) return json({ error: a.error }, 422);
  if (!a.name || !validEmail(a.email)) return json({ error: 'Please add your name and a valid work email.' }, 422);

  const r = score(a);
  const pdf = buildPdf(a, r, new Date());
  if (!env.ZEPTOMAIL_TOKEN || !env.MAIL_FROM) return json({ ok: true, emailed: false, score: r.total });

  const from = { address: env.MAIL_FROM, name: 'ED Interactive Group' };
  const attachments = [{ name: 'crm-health-check.pdf', mime_type: 'application/pdf', content: base64(pdf) }];
  const first = a.name.split(/\s+/)[0];
  const fixes = r.fixes.map(f => `<li>${esc(f)}</li>`).join('');
  const prospectHtml = `<p>Hi ${esc(first)},</p>
<p>Thanks for taking the CRM health check. Your score is <b>${r.total}/100</b>: ${esc(r.band)}</p>
${fixes ? `<p>The fixes that will pay off first:</p><ol>${fixes}</ol>` : ''}
<p>Your full report is attached as a PDF. The next step is a free full audit: we check your real CRM and Books data through the API, read-only, and walk you through it in 30 minutes. Just reply to this email to book a time.</p>
<p>ED Interactive Group<br>B2B different, better, smarter.</p>`;

  let emailed = false;
  try {
    await send(env, {
      from, to: [{ email_address: { address: a.email, name: a.name } }],
      reply_to: env.NOTIFY_TO ? [{ address: env.NOTIFY_TO }] : undefined,
      subject: `Your CRM health check: ${r.total}/100`, htmlbody: prospectHtml, attachments
    });
    emailed = true;
  } catch (err) { console.error(err); }

  if (env.NOTIFY_TO) {
    const rows = [['Name', a.name], ['Email', a.email], ['Company', a.company], ['Phone', a.phone], ['Notes', a.notes],
      ['Score', `${r.total}/100 (${r.band})`], ['Match', r.match.title], ['Report emailed', emailed ? 'Yes' : 'No'], ...summary(a)]
      .filter(([, v]) => v).map(([k, v]) => `<tr><td>${esc(k)}</td><td><b>${esc(v)}</b></td></tr>`).join('');
    try {
      await send(env, {
        from, to: [{ email_address: { address: env.NOTIFY_TO } }], reply_to: [{ address: a.email, name: a.name }],
        subject: `New health check: ${a.company || a.name} scored ${r.total}/100`,
        htmlbody: `<table cellpadding="4">${rows}</table>`, attachments
      });
    } catch (err) { console.error(err); }
  }

  return json({ ok: true, emailed, score: r.total });
}
