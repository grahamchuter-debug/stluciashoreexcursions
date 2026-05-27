/**
 * St Lucia Shore Excursions — client interactions
 * REUSABLE: mobile nav, smooth scroll, FAQ helpers for future port sites.
 */
(function () {
  'use strict';

  function initMobileNav() {
    var toggle = document.getElementById('menu-toggle');
    var menu = document.getElementById('mobile-menu');
    if (!toggle || !menu) return;

    var iconOpen = toggle.querySelector('.menu-icon-open');
    var iconClose = toggle.querySelector('.menu-icon-close');

    function setOpen(open) {
      menu.classList.toggle('hidden', !open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (iconOpen) iconOpen.classList.toggle('hidden', open);
      if (iconClose) iconClose.classList.toggle('hidden', !open);
      document.body.classList.toggle('overflow-hidden', open && window.innerWidth < 1280);
    }

    toggle.addEventListener('click', function () {
      setOpen(menu.classList.contains('hidden'));
    });

    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        setOpen(false);
      });
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1280) setOpen(false);
    });
  }

  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        var id = anchor.getAttribute('href');
        if (!id || id === '#') return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.pushState(null, '', id);
      });
    });
  }

  window.initSiteUI = function () {
    initMobileNav();
    initSmoothScroll();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if (!document.body.dataset.content) window.initSiteUI();
    });
  }
})();
