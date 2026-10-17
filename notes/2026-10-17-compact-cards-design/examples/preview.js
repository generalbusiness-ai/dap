// Static design navigation and natural-height evidence only. No MCP bridge,
// host call, service, signing or write is implemented by these examples.
const root = document.querySelector('[data-content-root]');
const measure = () => {
  window.designHeight = Math.ceil(root.getBoundingClientRect().height);
  root.dataset.measuredHeight = String(window.designHeight);
};
if (root) {
  new ResizeObserver(measure).observe(root);
  document.fonts.ready.then(measure);
  measure();
}
// The browser rehearsal carries its local return point in the URL. This
// only links static snapshots; actual host transitions and refresh are S2.
const returned = new URL(location.href).searchParams.get('return');
const back = document.querySelector('.back');
if (back) {
  const destination = new URL(returned || back.href, location.href);
  if (destination.origin === location.origin && destination.pathname.endsWith('.html')) {
    destination.searchParams.set('restore', '1');
    back.href = destination.href;
  }
}
document.addEventListener('click', event => {
  const link = event.target.closest('a.slide-title, .read-links a');
  if (!link) return;
  const destination = new URL(link.href);
  destination.searchParams.set('return', location.pathname + location.search);
  link.href = destination.href;
});
const focusTarget = new URL(location.href).searchParams.has('restore')
  ? document.querySelector('.slide-title, h1')
  : document.body.classList.contains('full') ? document.querySelector('h1') : null;
if (focusTarget) {
  if (focusTarget.tagName !== 'A') focusTarget.tabIndex = -1;
  focusTarget.focus({ preventScroll: true });
}
document.addEventListener('keydown', event => {
  if (!event.target.closest('[data-carousel]') || event.target.closest('input, textarea, [contenteditable]')) return;
  const direction = event.key === 'ArrowRight' ? 'next' : event.key === 'ArrowLeft' ? 'previous' : null;
  const link = direction && document.querySelector(`[data-${direction}]`);
  if (link) { event.preventDefault(); location.href = link.href; }
});
