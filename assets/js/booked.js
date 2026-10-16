// /booked/: fills the summary card from the booking details Zoho Bookings appends to the URL.
// Values are written with textContent only, and anything missing simply stays hidden.
// When the booking was made in the widget embedded on /book/, Zoho opens this page inside that frame.
// Reload it as the whole page instead (same origin, so this is allowed).
if (window.top !== window.self) {
  try { window.top.location.replace(location.href); } catch (e) { /* cross-origin parent: stay framed */ }
}
(() => {
  const q = new URLSearchParams(location.search);
  const lower = new Map();
  q.forEach((v, k) => lower.set(k.toLowerCase().replace(/[\s-]/g, '_'), v));
  const pick = (...keys) => {
    for (const k of keys) {
      const v = (lower.get(k) || '').trim();
      if (v && v.length < 200 && !/^https?:|^\{|^\$\{|^(undefined|null)$/i.test(v)) return v;
    }
    return '';
  };

  const name = pick('customer_first_name', 'customer_name', 'name', 'first_name');
  const first = name.split(/\s+/)[0];
  if (first && first.length > 1) {
    document.querySelector('[data-bk-name]').textContent = ', ' + first;
  }

  // Zoho sends booking_start_time as an ISO date; show it in the visitor's own time zone.
  let when = '', tz = '';
  const start = new Date(pick('booking_start_time'));
  if (!isNaN(start)) {
    try {
      when = start.toLocaleString(document.documentElement.lang || undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' });
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch (e) { when = start.toString(); }
  } else {
    const date = pick('booking_date', 'appointment_date', 'date');
    const time = pick('booking_time', 'appointment_time', 'time');
    when = [date, time].filter(Boolean).join(' · ');
  }

  const rows = {
    service: pick('service_name', 'service'),
    staff: pick('assigned_to', 'staff_name', 'staff'),
    when,
    tz: pick('time_zone', 'timezone') || tz,
    id: pick('booking_id', 'appointment_id'),
  };

  let any = false;
  for (const [key, val] of Object.entries(rows)) {
    const row = document.querySelector(`[data-bk-row="${key}"]`);
    if (!row) continue;
    if (val) { row.querySelector('dd').textContent = val; any = true; } else { row.hidden = true; }
  }
  if (any) document.querySelector('[data-bk-card]').hidden = false;

  // Keep personal details out of the address bar, history and analytics once they are shown.
  if (location.search) history.replaceState(null, '', location.pathname);
})();
