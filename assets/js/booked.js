// /booked/: fills the summary card from the booking details Zoho Bookings appends to the URL.
// Values are written with textContent only, and anything missing simply stays hidden.
(() => {
  const q = new URLSearchParams(location.search);
  const lower = new Map();
  q.forEach((v, k) => lower.set(k.toLowerCase().replace(/[\s-]/g, '_'), v));
  const pick = (...keys) => {
    for (const k of keys) {
      const v = (lower.get(k) || '').trim();
      if (v && v.length < 200 && !/^https?:|^\{|^\$\{/i.test(v)) return v;
    }
    return '';
  };

  const name = pick('customer_name', 'name', 'first_name', 'customername');
  const first = name.split(/\s+/)[0];
  if (first && first.length > 1) {
    document.querySelector('[data-bk-name]').textContent = ', ' + first;
  }

  const date = pick('booking_date', 'appointment_date', 'date', 'start_date');
  const time = pick('booking_time', 'appointment_time', 'start_time', 'time', 'from_time');
  const when = pick('appointment_start_time', 'start_datetime', 'booked_time') ||
    [date, time].filter(Boolean).join(' · ');

  const rows = {
    service: pick('service_name', 'service', 'event_name', 'servicename'),
    staff: pick('staff_name', 'staff', 'host', 'staffname'),
    when,
    tz: pick('time_zone', 'timezone', 'customer_timezone', 'tz'),
    id: pick('booking_id', 'bookingid', 'appointment_id', 'id'),
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
