// CRM health check: scores the ten answers in the browser, shows the result, then offers the full-audit form.
// The audit form is not connected yet: add the Zoho CRM web-to-lead URL before launch (see site.js).
document.addEventListener('DOMContentLoaded', function () {
  var quiz = document.getElementById('hc-quiz');
  if (!quiz) return;
  var sets = Array.prototype.slice.call(quiz.querySelectorAll('fieldset'));
  var AREAS = { data: 'Data quality', pipeline: 'Pipeline hygiene', connected: 'Connected reporting', automation: 'Automation' };
  var progress = document.getElementById('hc-progress');
  var warn = document.getElementById('hc-warn');

  function answered() { return sets.filter(function (f) { return f.querySelector('input:checked'); }).length; }
  quiz.addEventListener('change', function () {
    progress.textContent = answered() + ' of ' + sets.length + ' answered';
    if (answered() === sets.length) warn.hidden = true;
  });

  quiz.addEventListener('submit', function (e) {
    e.preventDefault();
    if (answered() < sets.length) { warn.hidden = false; return; }
    var total = 0, byArea = {}, fixes = [], answers = [];
    sets.forEach(function (f, i) {
      var input = f.querySelector('input:checked');
      var pts = Number(input.value);
      var area = f.dataset.area;
      total += pts;
      byArea[area] = byArea[area] || { got: 0, max: 0 };
      byArea[area].got += pts; byArea[area].max += 10;
      if (pts < 10) fixes.push({ pts: pts, text: f.dataset.fix });
      answers.push('Q' + (i + 1) + ': ' + input.parentNode.textContent.trim());
    });
    var score = Math.round(total / sets.length * 10);
    document.getElementById('hc-score').textContent = score;
    document.getElementById('hc-band').textContent =
      score >= 80 ? 'Healthy. A few tune-ups.' : score >= 50 ? 'Fixable. Real money on the table.' : 'Needs attention now.';

    var rows = document.getElementById('hc-areas');
    rows.textContent = '';
    Object.keys(AREAS).forEach(function (k) {
      if (!byArea[k]) return;
      var pct = Math.round(byArea[k].got / byArea[k].max * 100);
      var row = document.createElement('div'); row.className = 'row';
      var name = document.createElement('span'); name.textContent = AREAS[k];
      var v = document.createElement('span'); v.className = 'v'; v.textContent = pct + '%';
      var bar = document.createElement('span'); bar.className = 'bar';
      var fill = document.createElement('i'); fill.className = pct >= 80 ? 'ok' : pct >= 50 ? 'mid' : 'low';
      fill.style.width = Math.max(pct, 3) + '%';
      bar.appendChild(fill); row.appendChild(name); row.appendChild(v); row.appendChild(bar); rows.appendChild(row);
    });

    var list = document.getElementById('hc-fixes');
    list.textContent = '';
    fixes.sort(function (a, b) { return a.pts - b.pts; }).slice(0, 3).forEach(function (fx) {
      var li = document.createElement('li'); li.textContent = fx.text; list.appendChild(li);
    });
    if (!fixes.length) { var li = document.createElement('li'); li.textContent = 'Nothing urgent. The full audit will confirm it against your real data.'; list.appendChild(li); }

    document.getElementById('hc-score-field').value = score;
    document.getElementById('hc-answers-field').value = answers.join(' | ');
    var result = document.getElementById('hc-result');
    result.hidden = false;
    document.getElementById('start').hidden = false;
    document.getElementById('hc-see').textContent = 'Update my score';
    if (window.matchMedia('(max-width:860px)').matches) result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
