// POST /api/health-check: re-scores the answers, builds the PDF and emails it.
// Email goes out through Zoho Mail (SMTP). Set these in Cloudflare Pages > Settings > Variables and secrets:
//   SMTP_USER  the Zoho Mail address that sends, e.g. david@edinteractive.digital
//   SMTP_PASS  (secret) a Zoho Mail app-specific password for that address
//   SMTP_HOST  optional: smtppro.zoho.com (default, domain mailboxes), smtppro.zoho.ca for Canadian accounts
//   NOTIFY_TO  optional: where new health checks are copied (defaults to SMTP_USER)
// Without SMTP_USER and SMTP_PASS the visitor still gets the score and the PDF download; nothing is emailed.
// Every health check also becomes a Lead in Zoho CRM through the Web-to-Lead form below (no keys needed).
import { clean, validEmail, score, summary } from '../../assets/js/hc-model.js';
import { buildPdf } from '../../assets/js/hc-pdf.js';

// From the Zoho CRM Web-to-Lead form's embed code (Setup > Developer Hub > Webforms). These values are public.
// Form: "Zoho Health Checkup" (US data centre). Leave xnQsjsdp empty to skip the CRM step.
const WEB_TO_LEAD = {
  url: 'https://crm.zoho.com/crm/WebToLeadForm',
  xnQsjsdp: '62bd2a3d68e0021f184f3c225b99346663884849d4ef2b4f25ccde71bda07148',
  xmIwtLD: '9e90b8692907b49ef0159284da9ae6ea3cec2e0582b1d0611e7a26852b786837dd154a51637adfa23a299e8ce4e573e5', actionType: 'TGVhZHM=', leadSource: 'Website - CRM health check'
};

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function base64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
const b64 = s => base64(new TextEncoder().encode(s));
const lines76 = s => s.replace(/.{1,76}/g, '$&\r\n');
const header = s => /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`;
const addr = (email, name) => name ? `${header(name.replace(/["\r\n]/g, ''))} <${email}>` : `<${email}>`;

// One email with an HTML body and a PDF attachment, as a MIME message.
function mime({ from, to, replyTo, subject, html, pdf, pdfName }) {
  const b = 'ed-' + crypto.randomUUID();
  return [
    `From: ${from}`, `To: ${to}`, replyTo ? `Reply-To: ${replyTo}` : null, `Subject: ${header(subject)}`,
    `Date: ${new Date().toUTCString()}`, `Message-ID: <${crypto.randomUUID()}@edinteractive.digital>`,
    'MIME-Version: 1.0', `Content-Type: multipart/mixed; boundary="${b}"`, '',
    `--${b}`, 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', lines76(b64(html)),
    `--${b}`, `Content-Type: application/pdf; name="${pdfName}"`, 'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${pdfName}"`, '', lines76(base64(pdf)),
    `--${b}--`, ''
  ].filter(l => l !== null).join('\r\n');
}

// Posts the lead to Zoho CRM. Answers, score and fixes go in Description so they show on the Lead record.
async function crmLead(a, r, emailed, site) {
  if (!WEB_TO_LEAD.xnQsjsdp) return false;
  const parts = a.name.trim().split(/\s+/);
  const last = parts.length > 1 ? parts.pop() : parts[0];
  const first = parts.length && last !== parts[0] ? parts.join(' ') : last; // the form requires both names
  const desc = [`CRM health check score: ${r.total}/100 (${r.band})`, `Match: ${r.match.title}`,
    `Report emailed: ${emailed ? 'yes' : 'no'}`, '', 'Fix these first:', ...r.fixes.map((f, i) => `${i + 1}. ${f}`), '',
    ...summary(a).map(([q, v]) => `${q}: ${v}`), ...(a.notes ? ['', 'Notes: ' + a.notes] : [])].join('\n');
  const body = new URLSearchParams({
    xnQsjsdp: WEB_TO_LEAD.xnQsjsdp, zc_gad: '', xmIwtLD: WEB_TO_LEAD.xmIwtLD, actionType: WEB_TO_LEAD.actionType,
    returnURL: `https://${site}/health-check/`, 'First Name': first, 'Last Name': last, Email: a.email,
    Company: a.company || a.name, Phone: a.phone, Description: desc.slice(0, 30000), 'Lead Source': WEB_TO_LEAD.leadSource,
    aG9uZXlwb3Q: '' // Zoho's own honeypot, must be empty
  });
  const res = await fetch(WEB_TO_LEAD.url, { method: 'POST', body, redirect: 'manual' });
  if (res.status >= 400) throw new Error('Zoho CRM ' + res.status);
  return true;
}

// Minimal SMTP client over Cloudflare's TCP sockets: implicit TLS on 465, STARTTLS otherwise.
async function smtp(env, envelopeTo, message) {
  const { connect } = await import('cloudflare:sockets');
  const port = Number(env.SMTP_PORT || 465);
  const tls = env.SMTP_TLS || (port === 465 ? 'on' : 'starttls');
  let socket = connect({ hostname: env.SMTP_HOST || 'smtppro.zoho.com', port }, { secureTransport: tls, allowHalfOpen: false });
  let reader = socket.readable.getReader(), writer = socket.writable.getWriter();
  const enc = new TextEncoder(), dec = new TextDecoder();
  let buf = '';
  async function reply(ok) {
    for (;;) {
      const m = buf.match(/(?:^|\r\n)(\d{3}) [^\r\n]*\r\n/);
      if (m) {
        const end = buf.indexOf(m[0]) + m[0].length, text = buf.slice(0, end);
        buf = buf.slice(end);
        if (!String(ok).split(',').includes(m[1])) throw new Error('SMTP ' + text.trim().slice(0, 200));
        return text;
      }
      const { value, done } = await reader.read();
      if (done) throw new Error('SMTP connection closed');
      buf += dec.decode(value, { stream: true });
    }
  }
  const send = s => writer.write(enc.encode(s + '\r\n'));
  try {
    await reply(220);
    await send('EHLO edinteractive.digital'); await reply(250);
    if (tls === 'starttls') {
      await send('STARTTLS'); await reply(220);
      reader.releaseLock(); writer.releaseLock();
      socket = socket.startTls();
      reader = socket.readable.getReader(); writer = socket.writable.getWriter();
      await send('EHLO edinteractive.digital'); await reply(250);
    }
    await send('AUTH LOGIN'); await reply(334);
    await send(b64(env.SMTP_USER)); await reply(334);
    await send(b64(env.SMTP_PASS)); await reply(235);
    await send(`MAIL FROM:<${env.SMTP_USER}>`); await reply(250);
    for (const to of envelopeTo) { await send(`RCPT TO:<${to}>`); await reply('250,251'); }
    await send('DATA'); await reply(354);
    await writer.write(enc.encode(message.replace(/\r\n\./g, '\r\n..') + '\r\n.\r\n')); await reply(250);
    await send('QUIT');
  } finally {
    try { await socket.close(); } catch { /* already closed */ }
  }
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
  const origin = new URL(request.url).origin;
  const pdf = buildPdf(a, r, new Date(), new URL(request.url).host);
  const site = new URL(request.url).host;
  const lead = () => crmLead(a, r, emailed, site).catch(err => { console.error(err); return false; });
  let emailed = false;
  if (!env.SMTP_USER || !env.SMTP_PASS) return json({ ok: true, emailed, crm: await lead(), score: r.total });

  const from = addr(env.SMTP_USER, 'ED Interactive Group');
  const notify = env.NOTIFY_TO || env.SMTP_USER;
  const pdfName = 'crm-health-check.pdf';
  const first = a.name.split(/\s+/)[0];
  const fixes = r.fixes.map(f => `<li>${esc(f)}</li>`).join('');
  const prospectHtml = `<p>Hi ${esc(first)},</p>
<p>Thanks for taking the CRM health check. Your score is <b>${r.total}/100</b>: ${esc(r.band)}</p>
${fixes ? `<p>The fixes that will pay off first:</p><ol>${fixes}</ol>` : ''}
<p>Your full report is attached as a PDF. The next step is a free full audit: we check your real CRM and Books data through the API, read-only, and walk you through it in 30 minutes. <a href="${origin}/sample-report/">See a sample report</a>, then just reply to this email to book a time.</p>
<p>ED Interactive Group<br>B2B different, better, smarter.</p>`;

  try {
    await smtp(env, [a.email], mime({
      from, to: addr(a.email, a.name), replyTo: addr(notify), subject: `Your CRM health check: ${r.total}/100`,
      html: prospectHtml, pdf, pdfName
    }));
    emailed = true;
  } catch (err) { console.error(err); }

  const rows = [['Name', a.name], ['Email', a.email], ['Company', a.company], ['Phone', a.phone], ['Notes', a.notes],
    ['Score', `${r.total}/100 (${r.band})`], ['Match', r.match.title], ['Report emailed', emailed ? 'Yes' : 'No'], ...summary(a)]
    .filter(([, v]) => v).map(([k, v]) => `<tr><td>${esc(k)}</td><td><b>${esc(v)}</b></td></tr>`).join('');
  try {
    await smtp(env, [notify], mime({
      from, to: addr(notify), replyTo: addr(a.email, a.name), subject: `New health check: ${a.company || a.name} scored ${r.total}/100`,
      html: `<table cellpadding="4">${rows}</table>`, pdf, pdfName
    }));
  } catch (err) { console.error(err); }

  const crm = await lead();
  return json({ ok: true, emailed, crm, score: r.total });
}
