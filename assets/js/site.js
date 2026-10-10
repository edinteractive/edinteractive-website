// Homepage health check form: opens the full health check with name, email and apps filled in.
document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('hc-form');
  if (!form) return;
  var apps = document.getElementById('hc-apps');
  var otherWrap = document.getElementById('hc-other-wrap');
  if (apps && otherWrap) {
    apps.addEventListener('change', function () {
      otherWrap.hidden = apps.value !== 'Other';
      if (!otherWrap.hidden) document.getElementById('hc-other').focus();
    });
  }
  var appsFor = { 'Not on Zoho yet': 'Not on Zoho yet', 'CRM only': 'CRM', 'CRM + Books': 'CRM,Books', 'CRM + Creator + Books': 'CRM,Creator,Books', 'Zoho One': 'Zoho One' };
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = new URLSearchParams();
    var name = document.getElementById('hc-name').value.trim();
    var email = document.getElementById('hc-email').value.trim();
    if (name) q.set('name', name);
    if (email) q.set('email', email);
    if (apps && appsFor[apps.value]) q.set('apps', appsFor[apps.value]);
    var other = document.getElementById('hc-other');
    if (apps && apps.value === 'Other' && other.value.trim()) q.set('other', other.value.trim());
    var qs = q.toString();
    location.href = '/health-check/' + (qs ? '?' + qs : '');
  });
});
