// Homepage motion: sticky-header shadow, scroll-in cards, word-by-word statement, typing prompt bar,
// and the services tab strip. Everything here is decoration: without JS (or with reduced motion) the page reads the same.
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  root.classList.add('fx');

  // Header gets a hairline and shadow once the page scrolls.
  var header = document.querySelector('header');
  function onScroll() { if (header) header.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var io = 'IntersectionObserver' in window;

  // Scroll-in: only for things below the fold at load, so nothing visible ever blinks out.
  if (io && !reduce) {
    var targets = document.querySelectorAll('.sec-head, .pillar, .svc, .step, .compare, .voice, .closer > *');
    var fold = window.innerHeight;
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); seen.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    Array.prototype.forEach.call(targets, function (el) {
      if (el.getBoundingClientRect().top > fold) {
        var sibs = el.parentNode ? Array.prototype.indexOf.call(el.parentNode.children, el) : 0;
        el.style.transitionDelay = Math.min(sibs, 3) * 70 + 'ms';
        el.classList.add('rv');
        seen.observe(el);
      }
    });
  }

  // Statement: each word darkens as the paragraph scrolls through the viewport.
  var st = document.querySelector('.statement p');
  if (st && !reduce) {
    var words = [];
    (function split(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var s = document.createElement('span'); s.className = 'w'; s.textContent = part;
            words.push(s); frag.appendChild(s);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) { split(n); }
      });
    })(st);
    var ticking = false;
    function paint() {
      ticking = false;
      var r = st.getBoundingClientRect(), vh = window.innerHeight;
      var p = (vh * 0.85 - r.top) / (r.height + vh * 0.35);
      var n = Math.round(Math.max(0, Math.min(1, p)) * words.length);
      for (var i = 0; i < words.length; i++) words[i].classList.toggle('on', i < n);
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }, { passive: true });
    paint();
  }

  // Prompt bar: types example questions from data-phrases ("|" separated).
  var typed = document.querySelector('.prompt .typed');
  if (typed) {
    var phrases = (typed.getAttribute('data-phrases') || '').split('|').filter(Boolean);
    if (phrases.length && !reduce) {
      var pi = 0, ci = 0, del = false;
      (function tick() {
        var full = phrases[pi];
        ci += del ? -1 : 1;
        typed.textContent = full.slice(0, ci);
        var wait = del ? 22 : 48;
        if (!del && ci === full.length) { del = true; wait = 1900; }
        else if (del && ci === 0) { del = false; pi = (pi + 1) % phrases.length; wait = 350; }
        setTimeout(tick, wait);
      })();
    } else if (phrases.length) { typed.textContent = phrases[0]; }
  }

  // Services tab strip: highlights the card in view; clicking scrolls to it.
  var tabs = document.querySelectorAll('.svc-tabs a');
  if (tabs.length && io) {
    var byId = {};
    Array.prototype.forEach.call(tabs, function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var cards = document.querySelectorAll('.svc[id]');
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        Array.prototype.forEach.call(tabs, function (a) { a.classList.remove('active'); a.removeAttribute('aria-current'); });
        Array.prototype.forEach.call(cards, function (c) { c.classList.toggle('active', c === e.target); });
        var a = byId[e.target.id];
        if (a) { a.classList.add('active'); a.setAttribute('aria-current', 'true'); }
      });
    }, { rootMargin: '-40% 0px -50% 0px' });
    Array.prototype.forEach.call(cards, function (c) { spy.observe(c); });
  }
})();
