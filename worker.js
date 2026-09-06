/**
 * St Lucia Shore Excursions — Workers Assets entry.
 * URL policy (Phase 12B): preserve .html equity as primary canonical.
 * - www → apex (one hop, path + query preserved)
 * - extensionless equity → .html (301)
 * - directory trust routes keep trailing slash; index rewrite under html_handling none
 */
const APEX_HOST = 'stluciashoreexcursions.com';

const HTML_EQUITY = new Set([
  'best-st-lucia-shore-excursions',
  'pitons-volcano-tours',
  'soufriere-shore-excursions',
  'st-lucia-catamaran-cruises',
  'private-st-lucia-tours',
  'st-lucia-cruise-port-guide',
]);

const BOOK_PRODUCTS = new Set([
  'soufriere-volcano-waterfalls-tour',
  'st-lucia-catamaran-cruise',
  'pitons-views-tour',
]);

const DIR_PAGES = new Set([
  'about',
  'contact',
  'privacy',
  'terms',
  'methodology',
  'st-lucia-shore-excursions-faq',
]);

function assetRequest(request, url, pathname) {
  const assetUrl = new URL(url.toString());
  assetUrl.pathname = pathname;
  return new Request(assetUrl.toString(), request);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();
    const path = url.pathname || '/';

    if (host === `www.${APEX_HOST}`) {
      const dest = new URL(url.toString());
      dest.hostname = APEX_HOST;
      dest.protocol = 'https:';
      return Response.redirect(dest.toString(), 301);
    }

    // Extensionless equity → .html (preserve query)
    if (!path.includes('.') && !path.endsWith('/')) {
      const slug = path.replace(/^\//, '');
      if (HTML_EQUITY.has(slug)) {
        const dest = new URL(url.toString());
        dest.hostname = APEX_HOST;
        dest.protocol = 'https:';
        dest.pathname = `/${slug}.html`;
        return Response.redirect(dest.toString(), 301);
      }
      if (DIR_PAGES.has(slug)) {
        const dest = new URL(url.toString());
        dest.hostname = APEX_HOST;
        dest.protocol = 'https:';
        dest.pathname = `/${slug}/`;
        return Response.redirect(dest.toString(), 301);
      }
    }

    // With html_handling none, rewrite directory indexes and homepage
    let assetPath = path;
    if (path === '/' || path === '') {
      assetPath = '/index.html';
    } else if (path.endsWith('/')) {
      const slug = path.slice(1, -1);
      if (DIR_PAGES.has(slug)) {
        assetPath = `/${slug}/index.html`;
      } else if (slug.startsWith('book/')) {
        const parts = slug.split('/');
        if (parts.length === 2 && BOOK_PRODUCTS.has(parts[1])) {
          assetPath = `/book/${parts[1]}/index.html`;
        } else if (parts.length === 3 && parts[2] === 'received' && BOOK_PRODUCTS.has(parts[1])) {
          assetPath = `/book/${parts[1]}/received/index.html`;
        }
      }
    } else if (path.startsWith('/book/') && !path.endsWith('/')) {
      // /book/{slug} → trailing slash
      const dest = new URL(url.toString());
      dest.hostname = APEX_HOST;
      dest.protocol = 'https:';
      dest.pathname = path.endsWith('/') ? path : `${path}/`;
      return Response.redirect(dest.toString(), 301);
    }

    const assetResponse = await env.ASSETS.fetch(assetRequest(request, url, assetPath));

    if (assetResponse.status === 404) {
      const notFound = await env.ASSETS.fetch(assetRequest(request, url, '/404.html'));
      return new Response(notFound.body, {
        status: 404,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store',
        },
      });
    }

    return assetResponse;
  },
};
