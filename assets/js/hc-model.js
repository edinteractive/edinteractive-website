// CRM health check: the questions, the scoring and the practitioner match.
// Shared by the page (assets/js/health-check.js) and the report function
// (functions/api/health-check.js), so the score in the PDF always matches the screen.

export const ROLES = [
  { id: 'owner', title: 'Owner or general manager', text: "I run the business and can't get one trusted view of revenue, pipeline and margin.", match: 'analytics' },
  { id: 'sales', title: 'Sales or marketing lead', text: 'My team lives in the CRM, but duplicates, stale deals and guesswork forecasts slow us down.', match: 'workflow' },
  { id: 'ops', title: 'Operations or finance lead', text: 'I keep the CRM and accounting in sync by hand and want the manual steps automated.', match: 'automation' },
  { id: 'other', title: 'Something else', text: 'IT, consultant or not sure yet.', match: 'data' }
];

export const PAINS = [
  { id: 'sync', label: 'CRM and Books out of sync', match: 'automation' },
  { id: 'rekey', label: 'Re-keying orders and invoices', match: 'automation' },
  { id: 'approvals', label: 'Approvals stuck in email', match: 'automation' },
  { id: 'creator', label: 'Custom Creator app needs fixing', match: 'automation' },
  { id: 'margin', label: 'No margin or job-cost visibility', match: 'analytics' },
  { id: 'integrations', label: 'Integrations that break silently', match: 'automation' }
];
export const MAX_PAINS = 3;

export const APPS = ['CRM', 'Books', 'Creator', 'Analytics', 'Campaigns', 'Zoho One'];
export const NOT_ZOHO = 'Not on Zoho yet';
// What non-Zoho visitors use today: spreadsheets plus Zoho CRM's main competitors.
export const OTHER_CRMS = ['Excel or Google Sheets', 'Salesforce', 'HubSpot', 'Microsoft Dynamics 365', 'Pipedrive', 'monday CRM', 'Freshsales', 'Zendesk Sell', 'Keap', 'No CRM yet'];
export const CRM_USERS = ['1–5', '6–15', '16–50', '51+'];

export const AREAS = {
  data: 'Data quality',
  pipeline: 'Pipeline hygiene',
  connected: 'Connected reporting',
  automation: 'Automation'
};

export const LIKERT_SCALE = ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'];

export const STATEMENTS = [
  { id: 'dupes', area: 'data', text: 'Our CRM has very few duplicate contacts and accounts.',
    fix: 'Merge duplicate contacts and accounts, then turn on duplicate checks so new ones are blocked at entry.' },
  { id: 'fields', area: 'data', text: 'Key fields like industry, company size and owner are filled in on most records.',
    fix: 'Fill the key fields (industry, size, owner) on existing records and make them mandatory going forward.' },
  { id: 'rules', area: 'data', text: 'Validation rules or picklists stop bad data getting in.',
    fix: "Add validation rules and picklists so bad data can't get in through forms, imports or reps." },
  { id: 'nextstep', area: 'pipeline', text: 'Every open deal has a next step and recent activity.',
    fix: 'Review deals with no activity in 60 days: close the dead ones and give the rest a dated next step.' },
  { id: 'stages', area: 'pipeline', text: 'Our reps use deal stages the same way.',
    fix: 'Define each deal stage with clear entry criteria so every rep moves deals the same way.' },
  { id: 'books', area: 'connected', text: 'CRM and Books agree on customers, orders and invoices.',
    fix: 'Link Zoho Books customers to CRM accounts so revenue, invoices and deals line up in one view.' },
  { id: 'trust', area: 'connected', text: 'We trust the CRM numbers in meetings without a side spreadsheet.',
    fix: 'Build one Zoho Analytics dashboard from CRM, Creator and Books that the team reviews every week.' },
  { id: 'handoffs', area: 'automation', text: 'Follow-ups, lead routing and approvals run without anyone chasing them.',
    fix: 'Automate follow-ups, lead routing and approvals with workflows and AI, with a person approving what goes out.' }
];

export const POLLS = [
  { id: 'forecast', area: 'pipeline', q: "How confident are you in this quarter's forecast?",
    options: [['Very confident', 100], ['Somewhat', 50], ["Honestly, it's a guess", 0]],
    fix: 'Score open deals by stage age and activity so the forecast comes from data, not gut feel.' },
  { id: 'hours', area: 'automation', q: 'How many hours a week does your team spend re-keying data between apps?',
    options: [['Under 2', 100], ['2 to 5', 66], ['5 to 10', 33], ['More than 10', 0]],
    fix: 'Connect CRM, Books and Creator with Deluge and Zoho Flow so data is entered once.' },
  { id: 'priority', q: 'If you could fix one thing this quarter, what would it be?',
    options: [['Clean, trusted data', 'data'], ['Pipeline I can forecast from', 'pipeline'], ['Reports everyone believes', 'connected'], ['Fewer manual hand-offs', 'automation']] }
];

export const PRACTITIONERS = {
  data: { title: 'Zoho CRM Data Specialist', text: 'Cleans, de-duplicates and enriches your CRM, then sets the rules that keep it clean.',
    skills: ['Duplicate merge and prevention', 'Field completeness', 'Validation rules'] },
  analytics: { title: 'Zoho Analytics Consultant', text: 'Brings CRM, Creator and Books into one trusted dashboard for revenue, pipeline and margin.',
    skills: ['Zoho Analytics', 'Margin and job-cost reporting', 'Forecast dashboards'] },
  automation: { title: 'Zoho Automation Developer', text: 'Connects CRM, Books and Creator with Deluge and Flow so the double entry and hand-offs disappear.',
    skills: ['Deluge and Zoho Flow', 'CRM and Books integration', 'Creator apps'] },
  workflow: { title: 'Sales Workflow Strategist', text: 'Tightens your pipeline stages, lead routing and personalized follow-ups so deals stop going quiet.',
    skills: ['Pipeline stages', 'Lead routing', 'Personalized follow-ups'] }
};

// "Not on Zoho yet" visitors: the same questions and scoring, worded for whatever CRM and
// accounting they use today. Anything not listed here is already tool-neutral.
const NZ = {
  pains: {
    sync: 'CRM and accounting out of sync',
    creator: 'Spreadsheets or homegrown tools holding it together'
  },
  statements: {
    books: { text: 'Our CRM and accounting system agree on customers, orders and invoices.',
      fix: 'Connect your CRM and accounting so customers, invoices and deals line up in one view. On Zoho, that is CRM linked to Books.' },
    trust: { fix: 'Build one dashboard from your CRM and accounting data that the team reviews every week.' }
  },
  polls: {
    hours: { fix: 'Connect your CRM and accounting so data is entered once, not re-keyed between apps.' }
  },
  practitioners: {
    data: { title: 'CRM Data and Migration Specialist', text: 'Cleans and de-duplicates your data before it moves into Zoho CRM, then sets the rules that keep it clean.',
      skills: ['Cleanup before migration', 'Duplicate merge and prevention', 'Field mapping into Zoho CRM'] },
    analytics: { title: 'Reporting and Analytics Consultant', text: 'Brings your CRM and accounting data into one trusted dashboard for revenue, pipeline and margin.',
      skills: ['Zoho Analytics', 'Margin and job-cost reporting', 'Forecast dashboards'] },
    automation: { title: 'Automation and Integration Developer', text: 'Connects your CRM and accounting so the double entry and hand-offs disappear, today or after a move to Zoho.',
      skills: ['CRM and accounting integration', 'Workflow automation', 'Migration to Zoho One'] },
    workflow: { text: 'Tightens your pipeline stages, lead routing and personalized follow-ups so deals stop going quiet, in your current CRM or in Zoho.' }
  }
};

export const isNotZoho = a => Array.isArray(a && a.apps) && a.apps.includes(NOT_ZOHO);
// The wording to show for a pain, statement, poll or practitioner: the Zoho original, or the
// tool-neutral version for a visitor who is not on Zoho yet.
export function worded(kind, item, nz) {
  const alt = nz && NZ[kind] && NZ[kind][item.id];
  if (!alt) return item;
  return typeof alt === 'string' ? { ...item, label: alt } : { ...item, ...alt };
}
// One line on what the free full audit looks at.
export function auditLine(a) {
  return isNotZoho(a)
    ? 'The full audit reviews an export of your current CRM and accounting data and maps what moving to Zoho would fix.'
    : 'The full audit checks your real CRM and Books data through the API, read-only.';
}

const LIMIT = { name: 120, email: 200, company: 160, phone: 40, notes: 1500, other: 160 };

function clip(v, n) { return String(v == null ? '' : v).trim().slice(0, n); }

// Returns a clean copy of the answers, or { error } if something required is missing.
export function clean(raw) {
  raw = raw || {};
  const role = ROLES.find(r => r.id === raw.role);
  if (!role) return { error: 'Pick the option that sounds most like you.' };
  const pains = (Array.isArray(raw.pains) ? raw.pains : []).filter(id => PAINS.some(p => p.id === id)).slice(0, MAX_PAINS);
  const notZoho = Array.isArray(raw.apps) && raw.apps.includes(NOT_ZOHO);
  // "Not on Zoho yet" rules out Zoho apps; the CRM they use instead is asked only then.
  const apps = notZoho ? [NOT_ZOHO] : (Array.isArray(raw.apps) ? raw.apps : []).filter(a => APPS.includes(a));
  const crms = notZoho ? (Array.isArray(raw.crms) ? raw.crms : []).filter(c => OTHER_CRMS.includes(c)) : [];
  const users = CRM_USERS.includes(raw.users) ? raw.users : '';
  const likert = {};
  for (const s of STATEMENTS) {
    const v = Number(raw.likert && raw.likert[s.id]);
    if (!(v >= 1 && v <= 5 && Number.isInteger(v))) return { error: 'Rate every statement.' };
    likert[s.id] = v;
  }
  const polls = {};
  for (const p of POLLS) {
    const i = Number(raw.polls && raw.polls[p.id]);
    if (!(i >= 0 && i < p.options.length && Number.isInteger(i))) return { error: 'Answer every poll question.' };
    polls[p.id] = i;
  }
  const contact = {
    name: clip(raw.name, LIMIT.name), email: clip(raw.email, LIMIT.email).toLowerCase(),
    company: clip(raw.company, LIMIT.company), phone: clip(raw.phone, LIMIT.phone), notes: clip(raw.notes, LIMIT.notes)
  };
  // Name and company go into the email and PDF, so links are kept out ("Acme.com Inc" is still fine).
  if (/https?:|www\./i.test(contact.name + ' ' + contact.company))
    return { error: 'Please leave links out of your name and company.' };
  return { role: role.id, pains, apps, appsOther: notZoho ? '' : clip(raw.appsOther, LIMIT.other),
    crms, crmOther: notZoho ? clip(raw.crmOther, LIMIT.other) : '', users, likert, polls, ...contact };
}

export function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e); }

export function band(score) {
  return score >= 80 ? 'Healthy. A few tune-ups.' : score >= 50 ? 'Fixable. Real money on the table.' : 'Needs attention now.';
}

// Scores clean answers: each area is the average of its items (0-100), the total is the average of the areas.
export function score(a) {
  const nz = isNotZoho(a);
  const items = [];
  for (const s of STATEMENTS) items.push({ area: s.area, pts: (a.likert[s.id] - 1) * 25, fix: worded('statements', s, nz).fix });
  for (const p of POLLS) if (p.area) items.push({ area: p.area, pts: p.options[a.polls[p.id]][1], fix: worded('polls', p, nz).fix });

  const areas = Object.keys(AREAS).map(k => {
    const mine = items.filter(i => i.area === k);
    const pct = Math.round(mine.reduce((t, i) => t + i.pts, 0) / mine.length);
    return { id: k, label: AREAS[k], pct };
  });
  const total = Math.round(areas.reduce((t, x) => t + x.pct, 0) / areas.length);

  // Fixes: weakest answers first; the area they said they'd fix first wins ties.
  const priority = POLLS.find(p => p.id === 'priority').options[a.polls.priority][1];
  const fixes = items.filter(i => i.pts < 75)
    .sort((x, y) => (x.pts - (x.area === priority ? 30 : 0)) - (y.pts - (y.area === priority ? 30 : 0)))
    .slice(0, 3).map(i => i.fix);

  return { total, band: band(total), areas, fixes, priority, match: match(a) };
}

// Matches a practitioner. Each pain picked is one vote; the "fix one thing" poll is a slightly
// heavier vote, so it wins a tie with a single pain; the role breaks any remaining tie.
// Without the poll vote, a sales lead who picked any pain could never get the Sales Workflow
// Strategist, and only "Something else" could ever get the Data Specialist.
const PRIORITY_MATCH = { data: 'data', pipeline: 'workflow', connected: 'analytics', automation: 'automation' };
export function match(a) {
  const role = ROLES.find(r => r.id === a.role);
  const votes = {};
  const vote = (k, n) => { votes[k] = (votes[k] || 0) + n; };
  for (const id of a.pains) vote(PAINS.find(x => x.id === id).match, 1);
  const pick = POLLS.find(p => p.id === 'priority').options[a.polls && a.polls.priority];
  if (pick) vote(PRIORITY_MATCH[pick[1]], 1.1);
  vote(role.match, 0.5);
  const best = Object.keys(votes).sort((x, y) => votes[y] - votes[x])[0];
  return worded('practitioners', { id: best, ...PRACTITIONERS[best] }, isNotZoho(a));
}

// Plain-language summary of the answers, used in the report and the lead note.
export function summary(a) {
  const role = ROLES.find(r => r.id === a.role);
  const nz = isNotZoho(a);
  const rows = [
    ['Role', role.title],
    ['Manual work piles up in', a.pains.map(id => worded('pains', PAINS.find(p => p.id === id), nz).label).join(', ') || 'Not given'],
    ['Zoho apps', [...a.apps, a.appsOther].filter(Boolean).join(', ') || 'Not given'],
    ...(a.apps.includes(NOT_ZOHO) ? [['Uses today instead', [...a.crms, a.crmOther].filter(Boolean).join(', ') || 'Not given']] : []),
    ['People using the CRM', a.users || 'Not given']
  ];
  for (const p of POLLS) rows.push([p.q, p.options[a.polls[p.id]][0]]);
  for (const s of STATEMENTS) rows.push([worded('statements', s, nz).text, LIKERT_SCALE[a.likert[s.id] - 1]]);
  return rows;
}
