// /book/ and /fr/reserver/: always open at the top of the page.
// Browsers restore the last scroll position, and the embedded Zoho calendar can pull focus
// (and the page) down to itself while it loads. Only a #book link or the visitor's own
// scrolling should move the page.
(() => {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const wantsCalendar = () => location.hash === '#book';
  let userMoved = false;
  const mark = () => { userMoved = true; };
  ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach((t) => addEventListener(t, mark, { passive: true }));
  addEventListener('hashchange', mark);

  const toTop = () => { if (!userMoved && !wantsCalendar()) scrollTo(0, 0); };
  toTop();
  addEventListener('load', toTop);

  const frame = document.querySelector('.bkg-embed iframe');
  if (frame) {
    frame.addEventListener('load', () => {
      // Undo any jump the widget causes in the first seconds after it loads.
      const until = Date.now() + 4000;
      const guard = () => { if (Date.now() > until || userMoved) { removeEventListener('scroll', guard); return; } toTop(); };
      addEventListener('scroll', guard, { passive: true });
      toTop();
    });
  }
})();
