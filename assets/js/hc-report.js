// Builds the CRM health check report as a PDF (Uint8Array) with no dependencies,
// so the same code runs in the browser (download) and in the Pages Function (email).
// Uses the built-in Helvetica fonts, which only cover Latin-1 text.
import { summary, isNotZoho } from './hc-core.js';

const W = 612, H = 792, M = 48; // US Letter, 48pt margins
const C = {
  ink: [0.078, 0.082, 0.094], paper: [0.98, 0.973, 0.953], gold: [1, 0.761, 0.102], deep: [0.549, 0.396, 0],
  teal: [0.055, 0.498, 0.447], muted: [0.302, 0.314, 0.345], line: [0.906, 0.898, 0.875], white: [1, 1, 1]
};

// Helvetica advance widths (1/1000 em) for ASCII 32-126.
const HELV = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const WIN = { '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '…': 0x85, '€': 0x80, ' ': 0x20, '→': 0x3e, '←': 0x3c };

// Unicode -> WinAnsi codes; anything outside Latin-1 becomes "?".
function codes(str) {
  const out = [];
  for (const ch of String(str).normalize('NFC')) {
    const c = ch.codePointAt(0);
    if (WIN[ch]) out.push(WIN[ch]);
    else if (c >= 32 && c <= 126) out.push(c);
    else if (c >= 160 && c <= 255) out.push(c);
    else if (c === 10 || c === 9) out.push(32);
    else out.push(63);
  }
  return out;
}
function width(str, size, bold) {
  let w = 0;
  for (const c of codes(str)) w += (c >= 32 && c <= 126 ? HELV[c - 32] : 556) * (bold ? 1.06 : 1);
  return w * size / 1000;
}
function pdfString(str) {
  let s = '(';
  for (const c of codes(str)) {
    if (c === 40 || c === 41 || c === 92) s += '\\' + String.fromCharCode(c);
    else s += String.fromCharCode(c);
  }
  return s + ')';
}
function wrap(str, size, bold, max) {
  const lines = [];
  for (const para of String(str).split('\n')) {
    let line = '';
    for (let word of para.split(/\s+/).filter(Boolean)) {
      // A word wider than the column (a URL, "Desk,Inventory,SalesIQ") is split so it can't run off the page.
      while (width(word, size, bold) > max && word.length > 1) {
        let n = word.length - 1;
        while (n > 1 && width(word.slice(0, n), size, bold) > max) n--;
        if (line) { lines.push(line); line = ''; }
        lines.push(word.slice(0, n));
        word = word.slice(n);
      }
      const next = line ? line + ' ' + word : word;
      if (width(next, size, bold) <= max || !line) line = next;
      else { lines.push(line); line = word; }
    }
    lines.push(line);
  }
  return lines;
}
const rgb = c => c.map(v => v.toFixed(3)).join(' ');

// site is the host shown in the report, e.g. edinteractive.digital.
export function buildPdf(a, r, date, site = 'edinteractive.digital') {
  const pages = [];
  let ops, y;

  function page() {
    ops = [];
    pages.push(ops);
    y = H - M;
  }
  function rect(x, yy, w, h, color) { ops.push(`${rgb(color)} rg ${x.toFixed(2)} ${yy.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`); }
  function text(x, yy, str, size, bold, color) {
    ops.push(`BT ${rgb(color)} rg /${bold ? 'F2' : 'F1'} ${size} Tf ${x.toFixed(2)} ${yy.toFixed(2)} Td ${pdfString(str)} Tj ET`);
  }
  function right(xr, yy, str, size, bold, color) { text(xr - width(str, size, bold), yy, str, size, bold, color); }
  function need(h) { if (y - h < M + 20) page(); }
  function para(str, size, bold, color, x = M, max = W - 2 * M, lead = 1.4) {
    for (const line of wrap(str, size, bold, max)) { need(size * lead); y -= size * lead; text(x, y, line, size, bold, color); }
  }
  function heading(str) { need(48); y -= 30; text(M, y, str, 15, true, C.ink); y -= 6; rect(M, y, W - 2 * M, 0.8, C.line); }

  page();

  // Header band.
  rect(0, H - 104, W, 104, C.ink);
  text(M, H - 42, 'ED Interactive Group', 11, true, C.gold);
  right(W - M, H - 42, date.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }), 10, false, C.line);
  text(M, H - 78, 'CRM health check report', 26, true, C.white);
  y = H - 104;

  // Who it's for.
  y -= 30; text(M, y, 'PREPARED FOR', 8.5, false, C.muted);
  y -= 4; para([a.name, a.company].filter(Boolean).join(', '), 14, true, C.ink, M, W - 2 * M, 1.3);

  // Score.
  y -= 62;
  text(M, y, String(r.total), 56, true, C.ink);
  const nx = M + width(String(r.total), 56, true) + 8;
  text(nx, y + 22, '/100', 13, false, C.muted);
  text(nx, y + 4, r.band, 13, true, r.total >= 80 ? C.teal : C.deep);

  // Areas.
  heading('Score by area');
  for (const x of r.areas) {
    need(34);
    y -= 22;
    text(M, y, x.label, 11, false, C.ink);
    right(W - M, y, x.pct + '%', 11, true, C.ink);
    y -= 10;
    rect(M, y, W - 2 * M, 6, C.line);
    rect(M, y, Math.max(x.pct, 3) / 100 * (W - 2 * M), 6, x.pct >= 75 ? C.teal : x.pct >= 50 ? C.gold : C.deep);
  }

  // Fixes.
  heading('Fix these first');
  const fixes = r.fixes.length ? r.fixes : ['Nothing urgent. The full audit will confirm it against your real data.'];
  fixes.forEach((f, i) => {
    const lines = wrap(f, 11, false, W - 2 * M - 28);
    need(lines.length * 15.4 + 8);
    y -= 8;
    rect(M, y - 19, 18, 18, C.gold);
    text(M + 6, y - 14.5, String(i + 1), 10, true, C.ink);
    lines.forEach(l => { y -= 15.4; text(M + 28, y, l, 11, false, C.ink); });
  });

  // Match.
  heading('Your match');
  y -= 4;
  para(r.match.title, 12, true, C.ink);
  para(r.match.text, 10.5, false, C.muted);
  para(r.match.skills.join('  ·  '), 10, false, C.teal);

  // Answers.
  heading('Your answers');
  const colQ = 300, colA = W - 2 * M - colQ - 20;
  for (const [q, ans] of summary(a)) {
    const ql = wrap(q, 9.5, false, colQ), al = wrap(ans, 9.5, true, colA);
    const h = Math.max(ql.length, al.length) * 13 + 6;
    need(h);
    y -= 6;
    ql.forEach((l, i) => text(M, y - 13 * (i + 1) + 3, l, 9.5, false, C.muted));
    al.forEach((l, i) => text(M + colQ + 20, y - 13 * (i + 1) + 3, l, 9.5, true, C.ink));
    y -= h - 6;
  }

  // Next step.
  const next = (isNotZoho(a) ? 'We review an export of your current CRM and accounting data, map what moving to Zoho would fix,' : 'We check your real CRM and Books data through the API, read-only,') + ' and send a ranked fix list with the revenue each fix is worth. See a sample report at ' + site + '/sample-report/. To book your free 30-minute walkthrough, reply to our email.';
  const nl = wrap(next, 10.5, false, W - 2 * M - 36);
  const boxH = 46 + nl.length * 15;
  need(boxH + 30);
  y -= 26 + boxH;
  rect(M, y, W - 2 * M, boxH, C.gold);
  text(M + 18, y + boxH - 26, 'Next step: the free full audit', 13, true, C.ink);
  nl.forEach((l, i) => text(M + 18, y + boxH - 46 - i * 15, l, 10.5, false, C.ink));

  // Footer on every page.
  pages.forEach((p, i) => {
    ops = p;
    text(M, 28, 'ED Interactive Group  ·  B2B different, better, smarter.  ·  ' + site, 8, false, C.muted);
    right(W - M, 28, `Page ${i + 1} of ${pages.length}`, 8, false, C.muted);
  });

  return assemble(pages.map(p => p.join('\n')));
}

// Writes the PDF objects and cross-reference table. Every byte is Latin-1, so string length = byte length.
function assemble(streams) {
  const objs = [];
  const kids = streams.map((_, i) => `${5 + i * 2} 0 R`).join(' ');
  objs.push('<< /Type /Catalog /Pages 2 0 R >>');
  objs.push(`<< /Type /Pages /Kids [${kids}] /Count ${streams.length} >>`);
  objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  streams.forEach((s, i) => {
    objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + i * 2} 0 R >>`);
    objs.push(`<< /Length ${s.length} >>\nstream\n${s}\nendstream`);
  });
  objs.push('<< /Title (CRM health check report) /Author (ED Interactive Group) /Producer (edinteractive.digital) >>');
  let out = '%PDF-1.4\n%âãÏÓ\n';
  const offsets = [];
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) out += String(off).padStart(10, '0') + ' 00000 n \n';
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info ${objs.length} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
  return bytes;
}
