// POST /api/buyer-persona: records a finished buyer persona as a Lead in Zoho CRM and emails a copy to us.
// The persona text goes in the Lead Magnet Results field (API name Health_Check_Results, webform LEADCF15),
// with Lead Source "Website - Buyer persona" so these leads can be filtered from health check leads.
// Uses the same Web-to-Lead form, Turnstile widget and Zoho Mail settings as /api/health-check.
import { json, esc, addr, mime, verified, smtp } from '../_shared/mail.js';

const WEB_TO_LEAD = {
  url: 'https://crm.zoho.com/crm/WebToLeadForm',
  xnQsjsdp: '62bd2a3d68e0021f184f3c225b99346663884849d4ef2b4f25ccde71bda07148',
  xmIwtLD: '9e90b8692907b49ef0159284da9ae6ea3cec2e0582b1d0611e7a26852b786837dd154a51637adfa23a299e8ce4e573e5',
  actionType: 'TGVhZHM=', leadSource: 'Website - Buyer persona', leadStatus: 'Not Contacted', resultsField: 'LEADCF15'
};

const clip = (v, n) => String(v == null ? '' : v).replace(/\r/g, '').trim().slice(0, n);
const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

async function crmLead(p, site) {
  const parts = p.name.split(/\s+/);
  const last = parts.length > 1 ? parts.pop() : parts[0];
  const first = parts.length && last !== parts[0] ? parts.join(' ') : last; // the form requires both names
  const body = new URLSearchParams({
    xnQsjsdp: WEB_TO_LEAD.xnQsjsdp, zc_gad: '', xmIwtLD: WEB_TO_LEAD.xmIwtLD, actionType: WEB_TO_LEAD.actionType,
    returnURL: `https://${site}/buyer-persona/`, 'First Name': first, 'Last Name': last, Email: p.email,
    Company: p.company || p.name, 'Lead Source': WEB_TO_LEAD.leadSource, 'Lead Status': WEB_TO_LEAD.leadStatus,
    [WEB_TO_LEAD.resultsField]: p.text.slice(0, 30000),
    aG9uZXlwb3Q: '' // Zoho's own honeypot, must be empty
  });
  const res = await fetch(WEB_TO_LEAD.url, { method: 'POST', body, redirect: 'manual' });
  const text = (await res.text()).replace(/<(style|script)[\s\S]*?<\/\1>|<!--[\s\S]*?-->/gi, ' ')
    .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const ok = res.status < 400 && /submitted successfully/i.test(text);
  const detail = ok ? `Zoho CRM: lead created (${res.status})` : `Zoho CRM ${res.status} ${text}`.slice(0, 300);
  console.log(detail);
  return detail;
}

export async function onRequestPost({ request, env }) {
  let raw;
  try {
    const body = await request.text();
    if (body.length > 60000) return json({ error: 'Too large.' }, 413);
    raw = JSON.parse(body);
  } catch { return json({ error: 'Bad request.' }, 400); }
  if (raw && raw.website) return json({ ok: true }); // honeypot

  const p = {
    name: clip(raw.name, 120), email: clip(raw.email, 200).toLowerCase(), company: clip(raw.company, 160),
    persona: clip(raw.persona, 120), text: clip(raw.text, 30000)
  };
  if (!p.name || !validEmail(p.email) || !p.text) return json({ error: 'Please add your name, a valid work email and your answers.' }, 422);
  if (/https?:|www\./i.test(p.name + ' ' + p.company)) return json({ error: 'Please leave links out of your name and company.' }, 422);

  const human = await verified(env, raw.turnstile, request.headers.get('CF-Connecting-IP'));
  if (env.TURNSTILE_SECRET && !human) return json({ error: 'We could not verify the request. Please reload the page and try again.' }, 403);

  const site = new URL(request.url).host;
  const crm = await crmLead(p, site).catch(err => { console.error(err); return 'error: ' + String(err.message || err).slice(0, 200); });

  let notified = false;
  if (env.SMTP_USER && env.SMTP_PASS) {
    const notify = env.NOTIFY_TO || env.SMTP_USER;
    try {
      await smtp(env, [notify], mime({
        from: addr(env.SMTP_USER, 'ED Buyer Persona Builder'), to: addr(notify), replyTo: addr(p.email, p.name),
        subject: `New buyer persona: ${p.persona || 'Unnamed'} (${p.company || p.name})`,
        html: `<p><b>${esc(p.name)}</b> &lt;${esc(p.email)}&gt;, ${esc(p.company)}</p><p>Zoho CRM: ${esc(crm)}</p><pre style="white-space:pre-wrap;font:14px/1.5 sans-serif">${esc(p.text)}</pre>`
      }));
      notified = true;
    } catch (err) { console.error(err); }
  }
  const saved = /lead created/.test(crm);
  return json({ ok: saved || notified, saved, notified, crm: site.endsWith('.pages.dev') ? crm : undefined });
}
