// CRM health check: five short steps, an instant score on screen, and a PDF report.
// The report function (/api/health-check) emails the same PDF and records the lead.
import { ROLES, PAINS, MAX_PAINS, APPS, NOT_ZOHO, OTHER_CRMS, CRM_USERS, STATEMENTS, POLLS, clean, validEmail, score, match, worded, auditLine, langOf, label, likert, summary } from './hc-core.js?v=3';
import { buildPdf } from './hc-report.js?v=3';

const $ = id => document.getElementById(id);
// The page's own language (<html lang="fr-CA"> on /fr/bilan-crm/) picks the wording.
const L = langOf(document.documentElement.lang);
// "02, 05 and 07" / "02, 05 et 07"
const list = (ns, and) => ns.length < 2 ? ns.join('') : ns.slice(0, -1).join(', ') + ' ' + and + ' ' + ns[ns.length - 1];
const UI = {
  en: {
    tsError: "Our security check couldn't verify this browser. Try again, turn off a VPN or ad blocker, or email david@edinteractive.digital and we'll run the health check with you.",
    choose: 'Choose one', role: 'Pick the option that sounds most like you.',
    rate: ns => ns.length === 1 ? `Rate statement ${ns[0]} to continue.` : `Rate statements ${list(ns, 'and')} to continue.`,
    pollsLeft: n => n === 1 ? 'Answer the highlighted poll to continue.' : 'Answer the highlighted polls to continue.',
    polls: 'Answer all three polls to continue.', name: 'Please add your name.', email: 'Please add a valid work email.',
    submit: 'Request my health check', next: 'Continue →', focus: 'Health check focus: ',
    tsWait: 'One moment: the security check is still running. Try again in a few seconds.', building: 'Building your report…',
    sending: e => 'Sending your report to ' + e + '…', sent: e => 'Great, thank you! Your PDF report is on its way to ' + e + '.',
    saved: 'Thank you. Download your PDF report below. We have your answers and will follow up by email.',
    blocked: 'Download your PDF report below. We could not verify the request, so it was not sent or saved. Please reload and try again.',
    failed: 'Thank you. Download your PDF report below. We could not send it by email just now.',
    none: 'Nothing urgent. The full audit will confirm it against your real data.', basis: 'Based on your answers only. ',
    pdf: 'crm-health-check', fab: '/sample-report/', train: '/sample-report/training/'
  },
  fr: {
    tsError: 'Notre vérification de sécurité n’a pas pu valider ce navigateur. Réessayez, désactivez votre RPV ou votre bloqueur de publicité, ou écrivez à david@edinteractive.digital et nous ferons le bilan avec vous.',
    choose: 'Choisissez', role: 'Choisissez l’option qui vous ressemble le plus.',
    rate: ns => ns.length === 1 ? `Évaluez l’énoncé ${ns[0]} pour continuer.` : `Évaluez les énoncés ${list(ns, 'et')} pour continuer.`,
    pollsLeft: n => n === 1 ? 'Répondez au sondage en surbrillance pour continuer.' : 'Répondez aux sondages en surbrillance pour continuer.',
    polls: 'Répondez aux trois sondages pour continuer.', name: 'Veuillez indiquer votre nom.', email: 'Veuillez indiquer un courriel professionnel valide.',
    submit: 'Recevoir mon bilan', next: 'Continuer →', focus: 'Points à examiner : ',
    tsWait: 'Un instant : la vérification de sécurité est en cours. Réessayez dans quelques secondes.', building: 'Préparation de votre rapport…',
    sending: e => 'Envoi de votre rapport à ' + e + '…', sent: e => 'Merci! Votre rapport PDF est en route vers ' + e + '.',
    saved: 'Merci. Téléchargez votre rapport PDF ci-dessous. Nous avons bien reçu vos réponses et ferons un suivi par courriel.',
    blocked: 'Téléchargez votre rapport PDF ci-dessous. Nous n’avons pas pu valider la demande; elle n’a donc été ni envoyée ni enregistrée. Rechargez la page et réessayez.',
    failed: 'Merci. Téléchargez votre rapport PDF ci-dessous. Nous n’avons pas pu l’envoyer par courriel pour l’instant.',
    none: 'Rien d’urgent. L’audit complet le confirmera à partir de vos vraies données.', basis: 'Selon vos réponses seulement. ',
    pdf: 'bilan-crm', fab: '/fr/exemple-rapport/', train: '/fr/exemple-rapport/formation/'
  }
}[L];
const form = $('hc-flow');
const steps = [...form.querySelectorAll('.hc-step')];
const marks = [...form.querySelectorAll('.hc-steps li')];
const warn = $('hc-warn');
let at = 0;
let pdfBytes = null;
let pdfName = UI.pdf + '.pdf';

// Cloudflare Turnstile bot check, loaded only when the contact step opens.
const siteKey = (document.querySelector('meta[name=turnstile-sitekey]') || {}).content || '';
let tsWidget = null;
let tsFailed = false;
function loadTurnstile() {
  if (!siteKey || tsWidget !== null || document.getElementById('hc-ts-js')) return;
  window.hcTurnstileReady = () => {
    tsWidget = window.turnstile.render('#hc-ts', {
      sitekey: siteKey, action: 'health-check', size: 'flexible', language: L === 'fr' ? 'fr' : 'auto', 'retry-interval': 4000,
      callback: () => { if (!warn.hidden) warn.hidden = true; },
      // A failed check (some VPNs, privacy extensions, automated browsers) shouldn't leave the visitor guessing.
      'error-callback': code => {
        tsFailed = true;
        warn.textContent = UI.tsError;
        warn.hidden = false;
        console.warn('Turnstile error', code);
        return true; // handled: no uncaught error in the console
      },
      'expired-callback': () => window.turnstile.reset(tsWidget)
    });
  };
  const js = document.createElement('script');
  js.id = 'hc-ts-js';
  js.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=hcTurnstileReady';
  js.async = true;
  document.head.appendChild(js);
}
const tsToken = () => (siteKey && window.turnstile && tsWidget !== null ? window.turnstile.getResponse(tsWidget) : '') || '';

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function choice(type, name, value, labelCls) {
  const lab = el('label', labelCls);
  const input = el('input');
  input.type = type; input.name = name; input.value = value;
  lab.appendChild(input);
  return [lab, input];
}

// Step 1: role cards.
for (const role of ROLES) {
  const r = worded('roles', role, false, L);
  const [lab] = choice('radio', 'role', r.id, 'hc-role' + (r.id === 'other' ? ' hc-role-else' : ''));
  lab.appendChild(el('b', null, r.title));
  lab.appendChild(el('span', null, r.text));
  $('hc-roles').appendChild(lab);
}

// Step 2: pain chips (max three), app chips, team size.
for (const p of PAINS) {
  const [lab] = choice('checkbox', 'pains', p.id, 'hc-chip');
  lab.appendChild(el('span', 'hc-pain-t', worded('pains', p, false, L).label));
  lab.dataset.id = p.id;
  $('hc-pains').appendChild(lab);
}
$('hc-pains').addEventListener('change', e => {
  const on = form.querySelectorAll('input[name=pains]:checked');
  if (on.length > MAX_PAINS) { e.target.checked = false; flash($('hc-pain-hint')); }
});
function chip(box, name, value) {
  const [lab, input] = choice('checkbox', name, value, 'hc-chip');
  lab.appendChild(el('span', null, label(value, L)));
  $(box).appendChild(lab);
  return input;
}
const notZoho = chip('hc-nozoho', 'apps', NOT_ZOHO);
for (const a of APPS) chip('hc-apps', 'apps', a);
for (const c of OTHER_CRMS) chip('hc-crms', 'crms', c);
// "Not on Zoho yet" switches off the Zoho apps and asks what they use instead.
function syncZoho() {
  const off = notZoho.checked;
  for (const box of $('hc-apps').querySelectorAll('input')) { box.disabled = off; if (off) box.checked = false; }
  $('hc-apps').classList.toggle('hc-off', off);
  $('hc-apps-other').disabled = off;
  if (off) $('hc-apps-other').value = '';
  $('hc-crm-wrap').hidden = !off;
  // Visitors not on Zoho see the same questions worded for the CRM and accounting they use today.
  for (const lab of $('hc-pains').children) lab.querySelector('.hc-pain-t').textContent = worded('pains', PAINS.find(p => p.id === lab.dataset.id), off, L).label;
  for (const s of STATEMENTS) $('hc-st-' + s.id).textContent = worded('statements', s, off, L).text;
  if (!off) {
    for (const box of $('hc-crms').querySelectorAll('input')) box.checked = false;
    $('hc-crm-other').value = '';
  }
  syncNotZoho();
}
// The other way round: once a Zoho app is picked (or typed in), "Not on Zoho yet" can't be.
function syncNotZoho() {
  const usesZoho = !!$('hc-apps').querySelector('input:checked') || !!$('hc-apps-other').value.trim();
  notZoho.disabled = usesZoho && !notZoho.checked;
  $('hc-nozoho').classList.toggle('hc-off', notZoho.disabled);
}
notZoho.addEventListener('change', syncZoho);
$('hc-apps').addEventListener('change', syncNotZoho);
$('hc-apps-other').addEventListener('input', syncNotZoho);
const users = $('hc-users');
users.appendChild(new Option(UI.choose, ''));
for (const u of CRM_USERS) users.appendChild(new Option(u, u));

// Step 3: Likert scales.
const SCALE = likert(L);
STATEMENTS.forEach((s, i) => {
  const fs = el('fieldset', 'hc-scale');
  fs.id = 'hc-fs-' + s.id;
  const lg = el('legend');
  lg.appendChild(el('span', 'hc-n', String(i + 1).padStart(2, '0')));
  lg.appendChild(el('span', null, worded('statements', s, false, L).text)).id = 'hc-st-' + s.id;
  fs.appendChild(lg);
  const row = el('div', 'hc-dots');
  SCALE.forEach((word, v) => {
    const [lab] = choice('radio', 'lk-' + s.id, String(v + 1), 'hc-dot');
    lab.appendChild(el('span', 'hc-sr', word));
    lab.title = word;
    row.appendChild(lab);
  });
  fs.appendChild(row);
  const ends = el('div', 'hc-ends');
  ends.appendChild(el('span', null, SCALE[0]));
  ends.appendChild(el('span', null, SCALE[4]));
  fs.appendChild(ends);
  $('hc-likert').appendChild(fs);
});

// Step 4: polls.
for (const poll of POLLS) {
  const p = worded('polls', poll, false, L);
  const fs = el('fieldset', 'hc-poll');
  fs.id = 'hc-pf-' + poll.id;
  fs.appendChild(el('legend', null, p.q));
  p.options.forEach(([label], i) => {
    const [lab] = choice('radio', 'poll-' + p.id, String(i), 'hc-opt-row');
    lab.appendChild(el('span', null, label));
    fs.appendChild(lab);
  });
  $('hc-polls').appendChild(fs);
}

function flash(node) { node.classList.remove('hc-flash'); void node.offsetWidth; node.classList.add('hc-flash'); }
const picked = name => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map(i => i.value);

function answers() {
  const likert = {}, polls = {};
  for (const s of STATEMENTS) likert[s.id] = Number(picked('lk-' + s.id)[0]);
  for (const p of POLLS) { const v = picked('poll-' + p.id)[0]; polls[p.id] = v == null ? NaN : Number(v); }
  return {
    lang: L, role: picked('role')[0], pains: picked('pains'), apps: picked('apps'), appsOther: $('hc-apps-other').value,
    crms: picked('crms'), crmOther: $('hc-crm-other').value,
    users: users.value, likert, polls,
    name: $('hc-name').value, email: $('hc-email').value, company: $('hc-company').value,
    phone: $('hc-phone').value, notes: $('hc-notes').value, website: $('hc-website').value
  };
}

// What still needs an answer on a step: the message, and the blocks to highlight.
function check(step) {
  if (step === 0 && !picked('role').length) return { msg: UI.role, miss: [$('hc-roles')] };
  if (step === 2) {
    const left = STATEMENTS.map((s, i) => [s, String(i + 1).padStart(2, '0')]).filter(([s]) => !picked('lk-' + s.id).length);
    if (left.length) return { msg: UI.rate(left.map(x => x[1])), miss: left.map(([s]) => $('hc-fs-' + s.id)) };
  }
  if (step === 3) {
    const left = POLLS.filter(p => !picked('poll-' + p.id).length);
    if (left.length) return { msg: UI.pollsLeft(left.length), miss: left.map(p => $('hc-pf-' + p.id)) };
  }
  if (step === 4) {
    if (!$('hc-name').value.trim()) return { msg: UI.name, miss: [$('hc-name').closest('label')] };
    if (!validEmail($('hc-email').value.trim())) return { msg: UI.email, miss: [$('hc-email').closest('label')] };
  }
  return { msg: '', miss: [] };
}
const problem = step => check(step).msg;
// Shade every unanswered block and bring the first one into view, so it's clear what was missed.
function highlight(miss) {
  for (const n of form.querySelectorAll('.hc-missing')) n.classList.remove('hc-missing');
  for (const n of miss) n.classList.add('hc-missing');
  if (!miss.length) return;
  miss[0].scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  const first = miss[0].querySelector('input:not([type=hidden])') || miss[0];
  first.focus({ preventScroll: true });
}

function show(step) {
  at = step;
  steps.forEach((s, i) => { s.hidden = i !== step; });
  marks.forEach((m, i) => {
    m.classList.toggle('done', i < step);
    m.classList.toggle('now', i === step);
    if (i === step) m.setAttribute('aria-current', 'step'); else m.removeAttribute('aria-current');
  });
  $('hc-back').hidden = step === 0;
  $('hc-next').textContent = step === steps.length - 1 ? UI.submit : UI.next;
  $('hc-fine').hidden = step !== steps.length - 1;
  warn.hidden = true;
  if (step === 4) loadTurnstile();
  if (step === 4) renderMatch($('hc-match'), match(clean(answers())));
}

function renderMatch(box, m) {
  box.textContent = '';
  box.appendChild(el('b', null, m.title));
  box.appendChild(el('p', null, m.text));
  const ul = el('ul', 'checks');
  for (const s of m.skills) ul.appendChild(el('li', null, s));
  box.appendChild(ul);
  const pains = picked('pains').map(id => worded('pains', PAINS.find(p => p.id === id), notZoho.checked, L).label);
  if (pains.length) box.appendChild(el('p', 'hc-focus', UI.focus + pains.join(', ')));
}

form.addEventListener('change', e => {
  // An answered block loses its highlight straight away.
  const box = e.target.closest('.hc-missing');
  if (box && !check(at).miss.includes(box)) box.classList.remove('hc-missing');
  if (!warn.hidden && !problem(at)) warn.hidden = true;
});
form.addEventListener('input', e => {
  const box = e.target.closest('label.hc-missing');
  if (box && e.target.value.trim()) box.classList.remove('hc-missing');
});

$('hc-back').addEventListener('click', () => { show(at - 1); steps[at].querySelector('h2').focus(); });

form.addEventListener('submit', async e => {
  e.preventDefault();
  const { msg, miss } = check(at);
  if (msg) { warn.textContent = msg; warn.hidden = false; highlight(miss); return; }
  highlight([]);
  if (at < steps.length - 1) { show(at + 1); steps[at].querySelector('h2').focus(); form.scrollIntoView({ block: 'start' }); return; }
  await finish();
});

async function finish() {
  const raw = answers();
  const a = clean(raw);
  if (a.error) { warn.textContent = a.error; warn.hidden = false; return; }
  raw.turnstile = tsToken();
  if (siteKey && !raw.turnstile) {
    if (tsFailed && window.turnstile) { tsFailed = false; window.turnstile.reset(tsWidget); }
    warn.textContent = UI.tsWait;
    warn.hidden = false;
    return;
  }
  const next = $('hc-next');
  next.disabled = true; next.textContent = UI.building;

  const result = score(a);
  pdfBytes = buildPdf(a, result, new Date(), location.host, summary(a));
  const slug = (a.company || a.name).normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  pdfName = slug ? UI.pdf + '-' + slug + '.pdf' : UI.pdf + '.pdf';
  renderResult(a, result);

  const sent = $('hc-sent');
  sent.textContent = UI.sending(a.email);
  try {
    const res = await fetch('/api/health-check', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(raw)
    });
    const out = await res.json().catch(() => ({}));
    sent.textContent = out.emailed
      ? UI.sent(a.email)
      : UI.saved;
    if (location.hostname.endsWith('.pages.dev') && out.crm) $('hc-sent').textContent += ' [test: ' + out.crm + ']'; // previews only
    if (res.status === 403) sent.textContent = UI.blocked;
    else if (!res.ok && !out.emailed) sent.textContent = UI.failed;
  } catch {
    sent.textContent = UI.failed;
  }
}

function renderResult(a, r) {
  $('hc-for').textContent = a.company || a.name;
  $('hc-score').textContent = r.total;
  $('hc-band').textContent = r.band;
  const rows = $('hc-areas');
  rows.textContent = '';
  for (const x of r.areas) {
    const row = el('div', 'row');
    row.appendChild(el('span', null, x.label));
    row.appendChild(el('span', 'v', x.pct + (L === 'fr' ? '\u00a0%' : '%')));
    const bar = el('span', 'bar');
    const fill = el('i', x.pct >= 75 ? 'ok' : x.pct >= 50 ? 'mid' : 'low');
    fill.style.width = Math.max(x.pct, 3) + '%';
    bar.appendChild(fill); row.appendChild(bar); rows.appendChild(row);
  }
  const list = $('hc-fixes');
  list.textContent = '';
  for (const f of r.fixes) list.appendChild(el('li', null, f));
  if (!r.fixes.length) list.appendChild(el('li', null, UI.none));
  renderMatch($('hc-match-2'), r.match);
  $('hc-foot').textContent = UI.basis + auditLine(a);
  const q = a.company ? '?company=' + encodeURIComponent(a.company.slice(0, 60)) : '';
  $('hc-s-fab').href = UI.fab + q;
  $('hc-s-train').href = UI.train + q;

  form.hidden = true;
  const box = $('hc-result');
  box.hidden = false;
  box.focus();
  box.scrollIntoView({ block: 'start' });
}

$('hc-pdf').addEventListener('click', () => {
  if (!pdfBytes) return;
  const url = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));
  const link = el('a');
  link.href = url; link.download = pdfName;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
});

// Prefill from the homepage form (?name=&email=&apps=CRM,Books&other=).
const pre = new URLSearchParams(location.search);
if (pre.get('name')) $('hc-name').value = pre.get('name').slice(0, 120);
if (pre.get('email')) $('hc-email').value = pre.get('email').slice(0, 200);
if (pre.get('other')) $('hc-apps-other').value = pre.get('other').slice(0, 160);
for (const a of (pre.get('apps') || '').split(',')) {
  const box = form.querySelector(`input[name=apps][value="${CSS.escape(a)}"]`);
  if (box) box.checked = true;
}
syncZoho();

show(0);
