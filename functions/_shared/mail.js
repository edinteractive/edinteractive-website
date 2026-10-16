// Shared by the Pages Functions: JSON replies, email (MIME + Zoho Mail SMTP) and the Turnstile check.
// Lives under _shared so it is never a route of its own.
export const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});

export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function base64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
export const b64 = s => base64(new TextEncoder().encode(s));
export const lines76 = s => s.replace(/.{1,76}/g, '$&\r\n');
export const header = s => /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`;
export const addr = (email, name) => name ? `${header(name.replace(/["\r\n]/g, ''))} <${email}>` : `<${email}>`;

// One email with an HTML body and a PDF attachment, as a MIME message.
export function mime({ from, to, replyTo, subject, html, pdf, pdfName }) {
  const b = 'ed-' + crypto.randomUUID();
  return [
    `From: ${from}`, `To: ${to}`, replyTo ? `Reply-To: ${replyTo}` : null, `Subject: ${header(subject)}`,
    `Date: ${new Date().toUTCString()}`, `Message-ID: <${crypto.randomUUID()}@edinteractive.digital>`,
    'MIME-Version: 1.0', `Content-Type: multipart/mixed; boundary="${b}"`, '',
    `--${b}`, 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', lines76(b64(html)),
    ...(pdf ? [`--${b}`, `Content-Type: application/pdf; name="${pdfName}"`, 'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${pdfName}"`, '', lines76(base64(pdf))] : []),
    `--${b}--`, ''
  ].filter(l => l !== null).join('\r\n');
}

export async function verified(env, token, ip) {
  if (!env.TURNSTILE_SECRET || !token) return false;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: String(token).slice(0, 2048), remoteip: ip || '' })
    });
    const out = await res.json();
    return out.success === true;
  } catch (err) { console.error('Turnstile', err); return false; }
}

// Minimal SMTP client over Cloudflare's TCP sockets: implicit TLS on 465, STARTTLS otherwise.
export async function smtp(env, envelopeTo, message) {
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

