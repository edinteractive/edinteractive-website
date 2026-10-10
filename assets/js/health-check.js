// CRM health check: five short steps, an instant score on screen, and a PDF report.
// The report function (/api/health-check) emails the same PDF and records the lead.
import { ROLES, PAINS, MAX_PAINS, APPS, CRM_USERS, STATEMENTS, LIKERT_SCALE, POLLS, clean, validEmail, score, match } from './hc-model.js';
import { buildPdf } from './hc-pdf.js';

const $ = id => document.getElementById(id);
const form = $('hc-flow');
const steps = [...form.querySelectorAll('.hc-step')];
const marks = [...form.querySelectorAll('.hc-steps li')];
const warn = $('hc-warn');
let at = 0;
let pdfBytes = null;
let pdfName = 'crm-health-check.pdf';

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
for (const r of ROLES) {
  const [lab] = choice('radio', 'role', r.id, 'hc-role' + (r.id === 'other' ? ' hc-role-else' : ''));
  lab.appendChild(el('b', null, r.title));
  lab.appendChild(el('span', null, r.text));
  $('hc-roles').appendChild(lab);
}

// Step 2: pain chips (max three), app chips, team size.
for (const p of PAINS) {
  const [lab] = choice('checkbox', 'pains', p.id, 'hc-chip');
  lab.appendChild(el('span', null, p.label));
  $('hc-pains').appendChild(lab);
}
$('hc-pains').addEventListener('change', e => {
  const on = form.querySelectorAll('input[name=pains]:checked');
  if (on.length > MAX_PAINS) { e.target.checked = false; flash($('hc-pain-hint')); }
});
for (const a of APPS) {
  const [lab] = choice('checkbox', 'apps', a, 'hc-chip');
  lab.appendChild(el('span', null, a));
  $('hc-apps').appendChild(lab);
}
const users = $('hc-users');
users.appendChild(new Option('Choose one', ''));
for (const u of CRM_USERS) users.appendChild(new Option(u, u));

// Step 3: Likert scales.
STATEMENTS.forEach((s, i) => {
  const fs = el('fieldset', 'hc-scale');
  const lg = el('legend');
  lg.appendChild(el('span', 'hc-n', String(i + 1).padStart(2, '0')));
  lg.appendChild(document.createTextNode(s.text));
  fs.appendChild(lg);
  const row = el('div', 'hc-dots');
  LIKERT_SCALE.forEach((word, v) => {
    const [lab] = choice('radio', 'lk-' + s.id, String(v + 1), 'hc-dot');
    lab.appendChild(el('span', 'hc-sr', word));
    lab.title = word;
    row.appendChild(lab);
  });
  fs.appendChild(row);
  const ends = el('div', 'hc-ends');
  ends.appendChild(el('span', null, LIKERT_SCALE[0]));
  ends.appendChild(el('span', null, LIKERT_SCALE[4]));
  fs.appendChild(ends);
  $('hc-likert').appendChild(fs);
});

// Step 4: polls.
for (const p of POLLS) {
  const fs = el('fieldset', 'hc-poll');
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
    role: picked('role')[0], pains: picked('pains'), apps: picked('apps'), appsOther: $('hc-apps-other').value,
    users: users.value, likert, polls,
    name: $('hc-name').value, email: $('hc-email').value, company: $('hc-company').value,
    phone: $('hc-phone').value, notes: $('hc-notes').value, website: $('hc-website').value
  };
}

function problem(step) {
  if (step === 0 && !picked('role').length) return 'Pick the option that sounds most like you.';
  if (step === 2) {
    const left = STATEMENTS.filter(s => !picked('lk-' + s.id).length).length;
    if (left) return `Rate ${left === 1 ? 'the last statement' : 'the remaining ' + left + ' statements'} to continue.`;
  }
  if (step === 3 && POLLS.some(p => !picked('poll-' + p.id).length)) return 'Answer all three polls to continue.';
  if (step === 4) {
    if (!$('hc-name').value.trim()) return 'Please add your name.';
    if (!validEmail($('hc-email').value.trim())) return 'Please add a valid work email.';
  }
  return '';
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
  $('hc-next').textContent = step === steps.length - 1 ? 'Request my health check' : 'Continue →';
  $('hc-fine').hidden = step !== steps.length - 1;
  warn.hidden = true;
  if (step === 4) renderMatch($('hc-match'), match(clean(answers())));
}

function renderMatch(box, m) {
  box.textContent = '';
  box.appendChild(el('b', null, m.title));
  box.appendChild(el('p', null, m.text));
  const ul = el('ul', 'checks');
  for (const s of m.skills) ul.appendChild(el('li', null, s));
  box.appendChild(ul);
  const pains = picked('pains').map(id => PAINS.find(p => p.id === id).label);
  if (pains.length) box.appendChild(el('p', 'hc-focus', 'Health check focus: ' + pains.join(', ')));
}

form.addEventListener('change', () => { if (!warn.hidden && !problem(at)) warn.hidden = true; });

$('hc-back').addEventListener('click', () => { show(at - 1); steps[at].querySelector('h2').focus(); });

form.addEventListener('submit', async e => {
  e.preventDefault();
  const msg = problem(at);
  if (msg) { warn.textContent = msg; warn.hidden = false; return; }
  if (at < steps.length - 1) { show(at + 1); steps[at].querySelector('h2').focus(); form.scrollIntoView({ block: 'start' }); return; }
  await finish();
});

async function finish() {
  const raw = answers();
  const a = clean(raw);
  if (a.error) { warn.textContent = a.error; warn.hidden = false; return; }
  const next = $('hc-next');
  next.disabled = true; next.textContent = 'Building your report…';

  const result = score(a);
  pdfBytes = buildPdf(a, result, new Date(), location.host);
  pdfName = 'crm-health-check-' + (a.company || a.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.pdf';
  renderResult(a, result);

  const sent = $('hc-sent');
  sent.textContent = 'Sending your report to ' + a.email + '…';
  try {
    const res = await fetch('/api/health-check', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(raw)
    });
    const out = await res.json().catch(() => ({}));
    sent.textContent = out.emailed
      ? 'Thank you. Your PDF report is on its way to ' + a.email + '.'
      : 'Thank you. Download your PDF report below. We have your answers and will follow up by email.';
    if (location.hostname.endsWith('.pages.dev') && out.crm) $('hc-sent').textContent += ' [test: ' + out.crm + ']'; // previews only
    if (!res.ok && !out.emailed) sent.textContent = 'Thank you. Download your PDF report below. We could not send it by email just now.';
  } catch {
    sent.textContent = 'Thank you. Download your PDF report below. We could not send it by email just now.';
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
    row.appendChild(el('span', 'v', x.pct + '%'));
    const bar = el('span', 'bar');
    const fill = el('i', x.pct >= 75 ? 'ok' : x.pct >= 50 ? 'mid' : 'low');
    fill.style.width = Math.max(x.pct, 3) + '%';
    bar.appendChild(fill); row.appendChild(bar); rows.appendChild(row);
  }
  const list = $('hc-fixes');
  list.textContent = '';
  for (const f of r.fixes) list.appendChild(el('li', null, f));
  if (!r.fixes.length) list.appendChild(el('li', null, 'Nothing urgent. The full audit will confirm it against your real data.'));
  renderMatch($('hc-match-2'), r.match);
  const q = a.company ? '?company=' + encodeURIComponent(a.company.slice(0, 60)) : '';
  $('hc-s-fab').href = '/sample-report/' + q;
  $('hc-s-train').href = '/sample-report/training/' + q;

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

show(0);
