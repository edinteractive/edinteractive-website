// POST /api/health-check: re-scores the answers, builds the PDF and emails it.
// Email goes out through Zoho Mail (SMTP). Set these in Cloudflare Pages > Settings > Variables and secrets:
//   SMTP_USER  the Zoho Mail address that sends, e.g. david@edinteractive.digital
//   SMTP_PASS  (secret) a Zoho Mail app-specific password for that address
//   SMTP_HOST  optional: smtppro.zoho.com (default, domain mailboxes), smtppro.zoho.ca for Canadian accounts
//   NOTIFY_TO  optional: where new health checks are copied (defaults to SMTP_USER)
// Without SMTP_USER and SMTP_PASS the visitor still gets the score and the PDF download; nothing is emailed.
// Bot check (Cloudflare Turnstile): set TURNSTILE_SECRET (secret) here and the matching site key
// in the turnstile-sitekey meta tag of health-check/index.html. Until both are set, the report is
// never emailed to the address typed in (only the copy to NOTIFY_TO), so the form can't be used
// to send mail to strangers from our domain. The visitor still gets the PDF download.
// Every health check also becomes a Lead in Zoho CRM through the Web-to-Lead form below (no keys needed).
import { clean, validEmail, score, summary, auditLine } from '../../assets/js/hc-core.js';
import { buildPdf } from '../../assets/js/hc-report.js';
import { json, esc, addr, mime, verified, smtp } from '../_shared/mail.js';

// From the Zoho CRM Web-to-Lead form's embed code (Setup > Developer Hub > Webforms). These values are public.
// Form: "Zoho Health Checkup" (US data centre). Leave xnQsjsdp empty to skip the CRM step.
const WEB_TO_LEAD = {
  url: 'https://crm.zoho.com/crm/WebToLeadForm',
  xnQsjsdp: '62bd2a3d68e0021f184f3c225b99346663884849d4ef2b4f25ccde71bda07148',
  xmIwtLD: '9e90b8692907b49ef0159284da9ae6ea3cec2e0582b1d0611e7a26852b786837dd154a51637adfa23a299e8ce4e573e5', actionType: 'TGVhZHM=', leadSource: 'Website - CRM health check', leadStatus: 'Not Contacted',
  // Custom Lead fields on the form (Setup > Modules and Fields > Leads), named as Zoho's embed code names them.
  scoreField: 'LEADCF52', resultsField: 'LEADCF15'
};

// Posts the lead to Zoho CRM. The score goes in Health Check Score; answers and fixes in Health Check Results.
// The lead note is always in English (with the visitor's language on the first line) so leads read the same.
async function crmLead(a, r, emailed, site) {
  if (!WEB_TO_LEAD.xnQsjsdp) return false;
  const lang = a.lang;
  a = { ...a, lang: 'en' }; r = score(a);
  const parts = a.name.trim().split(/\s+/);
  const last = parts.length > 1 ? parts.pop() : parts[0];
  const first = parts.length && last !== parts[0] ? parts.join(' ') : last; // the form requires both names
  const desc = [`Language: ${lang === 'fr' ? 'French' : 'English'}`, `CRM health check score: ${r.total}% (${r.band})`, `Match: ${r.match.title}`,
    `Report emailed: ${emailed ? 'yes' : 'no'}`, '', 'Fix these first:', ...r.fixes.map((f, i) => `${i + 1}. ${f}`), '',
    ...summary(a).map(([q, v]) => `${q}: ${v}`), ...(a.notes ? ['', 'Notes: ' + a.notes] : [])].join('\n');
  const body = new URLSearchParams({
    xnQsjsdp: WEB_TO_LEAD.xnQsjsdp, zc_gad: '', xmIwtLD: WEB_TO_LEAD.xmIwtLD, actionType: WEB_TO_LEAD.actionType,
    returnURL: `https://${site}${lang === 'fr' ? '/fr/bilan-crm/' : '/health-check/'}`, 'First Name': first, 'Last Name': last, Email: a.email,
    Company: a.company || a.name, Phone: a.phone, 'Lead Source': WEB_TO_LEAD.leadSource,
    'Lead Status': WEB_TO_LEAD.leadStatus, [WEB_TO_LEAD.scoreField]: String(r.total),
    [WEB_TO_LEAD.resultsField]: desc.slice(0, 30000),
    aG9uZXlwb3Q: '' // Zoho's own honeypot, must be empty
  });
  const res = await fetch(WEB_TO_LEAD.url, { method: 'POST', body, redirect: 'manual' });
  const where = res.headers.get('Location') || '';
  // Zoho answers with an HTML thank-you page: drop its styles, scripts and comments, keep the words.
  const text = (await res.text()).replace(/<(style|script)[\s\S]*?<\/\1>|<!--[\s\S]*?-->/gi, ' ')
    .replace(/[^<>]*-->/g, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const ok = res.status < 400 && /submitted successfully/i.test(text);
  const detail = ok ? `Zoho CRM: lead created (${res.status})` : `Zoho CRM ${res.status} ${where} ${text}`.slice(0, 300);
  console.log(detail);
  if (res.status >= 400) throw new Error(detail);
  return detail;
}

export async function onRequestPost({ request, env }) {
  // Content-Length can be missing (chunked uploads), so the size is checked on the body itself.
  if (Number(request.headers.get('Content-Length') || 0) > 20000) return json({ error: 'Too large.' }, 413);
  let raw;
  try {
    const body = await request.text();
    if (body.length > 20000) return json({ error: 'Too large.' }, 413);
    raw = JSON.parse(body);
  } catch { return json({ error: 'Bad request.' }, 400); }
  if (raw && raw.website) return json({ ok: true, emailed: false }); // honeypot: bots fill the hidden field

  const a = clean(raw);
  if (a.error) return json({ error: a.error }, 422);
  if (!a.name || !validEmail(a.email)) return json({ error: 'Please add your name and a valid work email.' }, 422);

  const human = await verified(env, raw.turnstile, request.headers.get('CF-Connecting-IP'));
  // With Turnstile on, a failed check stops here: no lead, no email.
  if (env.TURNSTILE_SECRET && !human) return json({ error: 'We could not verify the request. Please reload the page and try again.' }, 403);

  const r = score(a);
  const origin = new URL(request.url).origin;
  const pdf = buildPdf(a, r, new Date(), new URL(request.url).host, summary(a));
  const site = new URL(request.url).host;
  const lead = () => crmLead(a, r, emailed, site).catch(err => { console.error(err); return 'error: ' + String(err.message || err).slice(0, 300); });
  let emailed = false;
  const preview = site.endsWith('.pages.dev'); // Zoho's raw reply is shown on preview sites only
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    const crm = await lead();
    return json({ ok: true, emailed, crm: preview ? crm : undefined, score: r.total });
  }

  const from = addr(env.SMTP_USER, 'ED Interactive Group');
  const notify = env.NOTIFY_TO || env.SMTP_USER;
  const fr = a.lang === 'fr';
  const pdfName = fr ? 'bilan-crm.pdf' : 'crm-health-check.pdf';
  const first = a.name.split(/\s+/)[0];
  const fixes = r.fixes.map(f => `<li>${esc(f)}</li>`).join('');
  const prospectHtml = fr ? `<p>Bonjour ${esc(first)},</p>
<p>Merci d’avoir fait le bilan de santé CRM. Votre résultat est de <b>${r.total}&nbsp;%</b> : ${esc(r.band)}</p>
${fixes ? `<p>Les correctifs qui rapporteront en premier :</p><ol>${fixes}</ol>` : ''}
<p>Votre rapport complet est joint en PDF. La prochaine étape est un audit complet gratuit. ${esc(auditLine(a))} <a href="${origin}/fr/exemple-rapport/">Voyez un exemple de rapport</a>, puis répondez simplement à ce courriel pour réserver un moment.</p>
<p>ED Interactive Group<br>B2B différent, meilleur, plus futé.</p>` : `<p>Hi ${esc(first)},</p>
<p>Thanks for taking the CRM health check. Your score is <b>${r.total}%</b>: ${esc(r.band)}</p>
${fixes ? `<p>The fixes that will pay off first:</p><ol>${fixes}</ol>` : ''}
<p>Your full report is attached as a PDF. The next step is a free full audit. ${esc(auditLine(a))} <a href="${origin}/sample-report/">See a sample report</a>, then just reply to this email to book a time.</p>
<p>ED Interactive Group<br>B2B different, better, smarter.</p>`;

  if (human) try {
    await smtp(env, [a.email], mime({
      from, to: addr(a.email, a.name), replyTo: addr(notify), subject: fr ? `Votre bilan de santé CRM : ${r.total} %` : `Your CRM health check: ${r.total}%`,
      html: prospectHtml, pdf, pdfName
    }));
    emailed = true;
  } catch (err) { console.error(err); }

  const crm = await lead();
  // The copy to us is in English whatever language the visitor used.
  const en = { ...a, lang: 'en' }, re = score(en);
  const rows = [['Language', fr ? 'French' : 'English'], ['Name', a.name], ['Email', a.email], ['Company', a.company], ['Phone', a.phone], ['Notes', a.notes],
    ['Score', `${re.total}% (${re.band})`], ['Match', re.match.title], ['Report emailed', emailed ? 'Yes' : 'No'], ['Zoho CRM', crm || 'not sent'], ...summary(en)]
    .filter(([, v]) => v).map(([k, v]) => `<tr><td>${esc(k)}</td><td><b>${esc(v)}</b></td></tr>`).join('');
  try {
    await smtp(env, [notify], mime({
      from, to: addr(notify), replyTo: addr(a.email, a.name), subject: `New health check${fr ? ' (FR)' : ''}: ${a.company || a.name} scored ${r.total}%`,
      html: `<table cellpadding="4">${rows}</table>`, pdf, pdfName
    }));
  } catch (err) { console.error(err); }

  return json({ ok: true, emailed, crm: preview ? crm : undefined, score: r.total });
}
