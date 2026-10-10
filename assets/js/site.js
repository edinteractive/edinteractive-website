// Health check form: replace FORM_ENDPOINT with the Zoho CRM web-to-lead URL (or a Pages Function) before launch.
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
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = document.getElementById('hc-msg');
    msg.textContent = 'Thanks. We will be in touch within one business day.';
    msg.hidden = false;
  });
});
