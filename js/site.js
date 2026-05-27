/**
 * Loads shared layout partials. Requires a local server (not file://).
 * Set on <body>: data-base, data-page, data-hero (optional), data-content (optional)
 *
 * REUSABLE FOR NEW PORTS: point data-hero and data-content at your partials/content files.
 */
(function () {
  function basePath() {
    var base = document.body.dataset.base;
    if (base === undefined || base === '') return '';
    return base.endsWith('/') ? base : base + '/';
  }

  async function loadInto(id, url) {
    var el = document.getElementById(id);
    if (!el || !url) return;

    try {
      var res = await fetch(basePath() + url, { cache: 'no-store' });
      if (!res.ok) throw new Error(res.statusText);
      el.innerHTML = await res.text();
    } catch (err) {
      console.error('Layout load failed:', url, err);
      el.innerHTML =
        '<p class="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">Could not load ' +
        url +
        '. Run the site with a local server, e.g. <code class="text-xs">python3 -m http.server</code>.</p>';
    }
  }

  function setActiveNav() {
    var page = document.body.dataset.page;
    if (!page) return;

    document.querySelectorAll('[data-nav]').forEach(function (link) {
      var isActive = link.dataset.nav === page;
      link.classList.toggle('text-ocean-600', isActive);
      link.classList.toggle('font-semibold', isActive);
      link.classList.toggle('bg-ocean-50', isActive && link.closest('#mobile-menu'));
      link.classList.toggle('text-gray-600', !isActive && !link.closest('#mobile-menu'));
      link.classList.toggle('text-gray-700', !isActive && link.closest('#mobile-menu'));
      if (isActive) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  document.addEventListener('DOMContentLoaded', async function () {
    var hero = document.body.dataset.hero;
    var content = document.body.dataset.content;
    var trustStrip = document.body.dataset.trustStrip;

    await Promise.all([
      loadInto('site-nav', 'partials/nav.html'),
      loadInto('site-footer', 'partials/footer.html'),
      loadInto('page-hero', hero),
      loadInto('page-trust-strip', trustStrip),
      loadInto('page-content', content),
    ]);

    setActiveNav();
    if (typeof window.initSiteUI === 'function') window.initSiteUI();
  });
})();
