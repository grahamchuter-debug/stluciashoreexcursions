(() => {
  const toggle = document.getElementById('menu-toggle');
  const menu = document.getElementById('mobile-menu');
  if (!toggle || !menu) return;

  const setOpen = (open) => {
    menu.classList.toggle('is-open', open);
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };

  setOpen(false);
  toggle.addEventListener('click', () => setOpen(!menu.classList.contains('is-open')));
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
})();
