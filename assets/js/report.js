// Sample report: personalise with the prospect's company name (?company=) and keep it across the industry switch.
document.addEventListener('DOMContentLoaded', function () {
  var params = new URLSearchParams(location.search);
  var company = (params.get('company') || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 60);
  if (company) {
    document.querySelectorAll('[data-company],[data-company-full]').forEach(function (el) { el.textContent = company; });
    var banner = document.querySelector('[data-banner]');
    if (banner) banner.textContent = 'This example shows the kind of report ' + company + ' would get. The figures are illustrative until we run the full audit on your own Zoho data.';
    document.title = company + ': sample CRM audit report | ED Interactive Group';
  }
  document.querySelectorAll('.r-switch a').forEach(function (a) {
    if (company) a.href = a.getAttribute('href') + '?company=' + encodeURIComponent(company);
  });
});
