#!/usr/bin/env python3
"""Assemble St Lucia Shore Excursions static pages (World 2.0).

Equity theme URLs keep .html as primary canonical.
Trust routes use trailing-slash directory indexes.
"""
from __future__ import annotations

import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOMAIN = "https://stluciashoreexcursions.com"
SITE = "St Lucia Shore Excursions"
EMAIL = "hello@stluciashoreexcursions.com"
TODAY = date.today().isoformat()

PAGES = {
    "index.html": {
        "slug": "",
        "canonical": f"{DOMAIN}/",
        "title": "St Lucia Shore Excursions for Cruise Guests | Pitons & Port Days",
        "description": "Cruise-focused St Lucia shore excursion guidance from Castries and Pointe Seraphine. Compare Pitons, Soufrière, catamaran and private day styles.",
        "page": "home",
        "hero": "partials/hero-home.html",
        "trust": "partials/trust-strip.html",
        "content": "content/home.html",
        "og_image": "images/hero-home.jpg",
        "schema": "home",
    },
    "best-st-lucia-shore-excursions.html": {
        "slug": "best-st-lucia-shore-excursions.html",
        "canonical": f"{DOMAIN}/best-st-lucia-shore-excursions.html",
        "title": "Best St Lucia Shore Excursions | Compare Cruise Day Options",
        "description": "Compare Pitons, Soufrière, catamaran and private St Lucia shore excursions for cruise passengers. Scenery, vehicle time, water time and port-day fit.",
        "page": "excursions",
        "hero": "partials/hero-excursions.html",
        "content": "content/best-st-lucia-shore-excursions.html",
        "og_image": "images/excursions-hub.jpg",
        "schema": "webpage",
    },
    "pitons-volcano-tours.html": {
        "slug": "pitons-volcano-tours.html",
        "canonical": f"{DOMAIN}/pitons-volcano-tours.html",
        "title": "Pitons Volcano Tours | St Lucia Shore Excursions from Castries",
        "description": "Plan a Pitons-focused St Lucia shore day: viewpoints, volcanic landscape, land versus sea, and timing from Castries for cruise guests.",
        "page": "pitons",
        "hero": "partials/hero-pitons.html",
        "content": "content/pitons-volcano-tours.html",
        "og_image": "images/pitons-volcano-tours.jpg",
        "schema": "webpage",
    },
    "soufriere-shore-excursions.html": {
        "slug": "soufriere-shore-excursions.html",
        "canonical": f"{DOMAIN}/soufriere-shore-excursions.html",
        "title": "Soufrière Shore Excursions | Sulphur Springs & West Coast Days",
        "description": "Soufrière shore excursions for cruise passengers: town, Sulphur Springs, waterfalls, Pitons viewpoints and honest west-coast timing from Castries.",
        "page": "soufriere",
        "hero": "partials/hero-soufriere.html",
        "content": "content/soufriere-shore-excursions.html",
        "og_image": "images/soufriere-volcano.jpg",
        "schema": "webpage",
    },
    "st-lucia-catamaran-cruises.html": {
        "slug": "st-lucia-catamaran-cruises.html",
        "canonical": f"{DOMAIN}/st-lucia-catamaran-cruises.html",
        "title": "St Lucia Catamaran Cruises | Pitons from the Water for Cruise Guests",
        "description": "St Lucia catamaran cruises for cruise passengers: Pitons from the water, swim or snorkel stops, half-day versus longer sails, and port timing notes.",
        "page": "catamaran",
        "hero": "partials/hero-catamaran.html",
        "content": "content/st-lucia-catamaran-cruises.html",
        "og_image": "images/catamaran-coast.jpg",
        "schema": "webpage",
    },
    "private-st-lucia-tours.html": {
        "slug": "private-st-lucia-tours.html",
        "canonical": f"{DOMAIN}/private-st-lucia-tours.html",
        "title": "Private St Lucia Tours | Flexible Cruise Shore Days",
        "description": "Private St Lucia tours for cruise guests: flexible pacing, families and small groups, combinations around Castries port timing. Planning guidance only.",
        "page": "private",
        "hero": "partials/hero-private.html",
        "content": "content/private-st-lucia-tours.html",
        "og_image": "images/private-st-lucia-tours.jpg",
        "schema": "webpage",
    },
    "st-lucia-cruise-port-guide.html": {
        "slug": "st-lucia-cruise-port-guide.html",
        "canonical": f"{DOMAIN}/st-lucia-cruise-port-guide.html",
        "title": "St Lucia Cruise Port Guide | Castries & Pointe Seraphine",
        "description": "St Lucia cruise port guide for Castries and Pointe Seraphine: meeting considerations, west-coast timing to Soufrière and the Pitons, return-to-ship thinking.",
        "page": "port",
        "hero": "partials/hero-port-guide.html",
        "content": "content/st-lucia-cruise-port-guide.html",
        "og_image": "images/castries-cruise-port.jpg",
        "schema": "webpage",
    },
    "about/index.html": {
        "slug": "about/",
        "canonical": f"{DOMAIN}/about/",
        "title": "About | St Lucia Shore Excursions",
        "description": "About St Lucia Shore Excursions: cruise-focused excursion information and independent destination advice for passengers visiting St Lucia.",
        "page": "about",
        "content": "content/about.html",
        "og_image": "images/hero-home.jpg",
        "schema": "webpage",
        "main_class": "page-main--trust",
    },
    "contact/index.html": {
        "slug": "contact/",
        "canonical": f"{DOMAIN}/contact/",
        "title": "Contact | St Lucia Shore Excursions",
        "description": "Contact St Lucia Shore Excursions at hello@stluciashoreexcursions.com.",
        "page": "contact",
        "content": "content/contact.html",
        "og_image": "images/hero-home.jpg",
        "schema": "webpage",
        "main_class": "page-main--trust",
    },
    "privacy/index.html": {
        "slug": "privacy/",
        "canonical": f"{DOMAIN}/privacy/",
        "title": "Privacy | St Lucia Shore Excursions",
        "description": "Privacy policy for stluciashoreexcursions.com.",
        "page": "privacy",
        "content": "content/privacy.html",
        "og_image": "images/hero-home.jpg",
        "schema": "webpage",
        "main_class": "page-main--trust",
    },
    "terms/index.html": {
        "slug": "terms/",
        "canonical": f"{DOMAIN}/terms/",
        "title": "Terms | St Lucia Shore Excursions",
        "description": "Terms of use for the St Lucia Shore Excursions planning site.",
        "page": "terms",
        "content": "content/terms.html",
        "og_image": "images/hero-home.jpg",
        "schema": "webpage",
        "main_class": "page-main--trust",
    },
    "methodology/index.html": {
        "slug": "methodology/",
        "canonical": f"{DOMAIN}/methodology/",
        "title": "Methodology | St Lucia Shore Excursions",
        "description": "How this St Lucia cruise excursion guide is researched and kept honest.",
        "page": "methodology",
        "content": "content/methodology.html",
        "og_image": "images/hero-home.jpg",
        "schema": "webpage",
        "main_class": "page-main--trust",
    },
    "st-lucia-shore-excursions-faq/index.html": {
        "slug": "st-lucia-shore-excursions-faq/",
        "canonical": f"{DOMAIN}/st-lucia-shore-excursions-faq/",
        "title": "St Lucia Shore Excursions FAQ | Cruise Passenger Answers",
        "description": "FAQ for St Lucia cruise shore days: Castries, Pitons, Soufrière, catamaran options and return timing.",
        "page": "faq",
        "hero": "partials/hero-faq.html",
        "content": "content/st-lucia-shore-excursions-faq.html",
        "og_image": "images/excursions-hub.jpg",
        "schema": "faq",
    },
    "404.html": {
        "slug": "404",
        "canonical": f"{DOMAIN}/404.html",
        "title": "Page Not Found | St Lucia Shore Excursions",
        "description": "The requested St Lucia planning page was not found.",
        "page": "404",
        "content": "content/404.html",
        "og_image": "images/hero-home.jpg",
        "schema": "webpage",
        "main_class": "page-main--trust",
        "noindex": True,
    },
}

HOME_FAQ = [
    {
        "@type": "Question",
        "name": "Where do cruise ships arrive in St Lucia?",
        "acceptedAnswer": {
            "@type": "Answer",
            "text": "Most calls centre on the Castries area, commonly including Pointe Seraphine. Exact berth or tender arrangements can vary. Confirm on your ship’s daily programme.",
        },
    },
    {
        "@type": "Question",
        "name": "Can I see the Pitons on a cruise day?",
        "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, many passengers do, by land viewpoints near Soufrière or from a coastal catamaran. Both need realistic time for the west-coast journey and the return to the ship.",
        },
    },
    {
        "@type": "Question",
        "name": "Does this website take bookings or payments?",
        "acceptedAnswer": {
            "@type": "Answer",
            "text": "Not in the current phase. St Lucia Shore Excursions provides cruise-focused information and independent destination advice. Not affiliated with any cruise line.",
        },
    },
]

FAQ_PAGE = HOME_FAQ + [
    {
        "@type": "Question",
        "name": "What is the difference between Pitons and Soufrière excursions?",
        "acceptedAnswer": {
            "@type": "Answer",
            "text": "Pitons-focused days keep the peaks and viewpoints central. Soufrière days usually add town, Sulphur Springs and other inland stops.",
        },
    },
    {
        "@type": "Question",
        "name": "Is a catamaran a good cruise-day choice?",
        "acceptedAnswer": {
            "@type": "Answer",
            "text": "It is strong when you want coastal scenery, Pitons views from the water and swim or snorkel time with less road travel. Check meeting points and return timing carefully.",
        },
    },
    {
        "@type": "Question",
        "name": "How should I plan return timing?",
        "acceptedAnswer": {
            "@type": "Answer",
            "text": "Use your published all-aboard time and build buffer for traffic, embarkation queues and finding the ship. No page here guarantees a return.",
        },
    },
]


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def json_ld(meta: dict) -> str:
    url = meta["canonical"]
    graph: list[dict] = [
        {
            "@type": "WebSite",
            "name": SITE,
            "url": f"{DOMAIN}/",
            "description": "Cruise-focused excursion information and independent destination advice for passengers visiting St Lucia.",
            "inLanguage": "en-GB",
            "publisher": {"@type": "Organization", "name": SITE, "url": f"{DOMAIN}/"},
        },
        {
            "@type": "Organization",
            "name": SITE,
            "url": f"{DOMAIN}/",
            "email": EMAIL,
            "description": "Cruise-focused St Lucia excursion information and independent destination advice. Not affiliated with any cruise line.",
        },
        {
            "@type": "WebPage",
            "name": meta["title"],
            "url": url,
            "description": meta["description"],
            "isPartOf": {"@type": "WebSite", "name": SITE, "url": f"{DOMAIN}/"},
            "inLanguage": "en-GB",
        },
    ]
    if meta.get("slug") and meta["slug"] != "404":
        graph.append(
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{DOMAIN}/"},
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": meta["title"].split("|")[0].strip(),
                        "item": url,
                    },
                ],
            }
        )
    if meta.get("schema") == "home":
        graph.append({"@type": "FAQPage", "mainEntity": HOME_FAQ})
    elif meta.get("schema") == "faq":
        graph.append({"@type": "FAQPage", "mainEntity": FAQ_PAGE})
    return json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, indent=2)


def build_head(meta: dict) -> str:
    url = meta["canonical"]
    og = f"{DOMAIN}/{meta['og_image']}"
    robots = '  <meta name="robots" content="noindex, follow" />\n' if meta.get("noindex") else ""
    preload = ""
    if meta.get("hero") == "partials/hero-home.html":
        preload = f'  <link rel="preload" as="image" href="/{meta["og_image"]}" fetchpriority="high" />\n'
    return f"""<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{meta["title"]}</title>
  <meta name="description" content="{meta["description"]}" />
{robots}  <link rel="canonical" href="{url}" />
  <link rel="icon" href="/images/favicon.svg" type="image/svg+xml" />
{preload}  <meta property="og:type" content="website" />
  <meta property="og:url" content="{url}" />
  <meta property="og:title" content="{meta["title"]}" />
  <meta property="og:description" content="{meta["description"]}" />
  <meta property="og:image" content="{og}" />
  <meta property="og:site_name" content="{SITE}" />
  <meta property="og:locale" content="en_GB" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{meta["title"]}" />
  <meta name="twitter:description" content="{meta["description"]}" />
  <meta name="twitter:image" content="{og}" />
  <script type="application/ld+json">
{json_ld(meta)}
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,650;9..144,700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/css/site.css" />
</head>
"""


def assemble_page(filename: str, meta: dict) -> str:
    nav = read("partials/nav.html")
    footer = read("partials/footer.html")
    hero = read(meta["hero"]) if meta.get("hero") else ""
    trust = read(meta["trust"]) if meta.get("trust") else ""
    content = read(meta["content"])
    main_class = meta.get("main_class", "page-main")
    body = f"""<body data-page="{meta["page"]}" data-static="1">
  <div id="site-nav" data-inlined="true">{nav}</div>
  <div id="page-hero" data-inlined="true">{hero}</div>
  <div id="page-trust-strip" data-inlined="true">{trust}</div>
  <main id="page-content" class="{main_class}">{content}</main>
  <div id="site-footer" data-inlined="true">{footer}</div>
  <script src="/js/site.js" defer></script>
</body>
</html>
"""
    return build_head(meta) + body


PRIORITY = {
    "": 1.0,
    "best-st-lucia-shore-excursions.html": 0.95,
    "pitons-volcano-tours.html": 0.9,
    "soufriere-shore-excursions.html": 0.9,
    "st-lucia-catamaran-cruises.html": 0.95,
    "private-st-lucia-tours.html": 0.85,
    "st-lucia-cruise-port-guide.html": 0.9,
    "st-lucia-shore-excursions-faq/": 0.7,
    "about/": 0.5,
    "contact/": 0.5,
    "methodology/": 0.4,
    "privacy/": 0.3,
    "terms/": 0.3,
}


def write_sitemap() -> None:
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for _, meta in PAGES.items():
        if meta.get("noindex") or meta["slug"] == "404":
            continue
        slug = meta["slug"]
        pri = PRIORITY.get(slug, 0.6)
        lines += [
            "  <url>",
            f"    <loc>{meta['canonical']}</loc>",
            f"    <lastmod>{TODAY}</lastmod>",
            f"    <changefreq>{'weekly' if pri >= 0.9 else 'monthly'}</changefreq>",
            f"    <priority>{pri:.1f}</priority>",
            "  </url>",
        ]
    lines.append("</urlset>")
    (ROOT / "sitemap.xml").write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_robots() -> None:
    (ROOT / "robots.txt").write_text(
        f"User-agent: *\nAllow: /\n\nSitemap: {DOMAIN}/sitemap.xml\n",
        encoding="utf-8",
    )


def main() -> None:
    for filename, meta in PAGES.items():
        out = ROOT / filename
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(assemble_page(filename, meta), encoding="utf-8")
        print(f"wrote {filename}")
    write_sitemap()
    write_robots()
    count = sum(1 for m in PAGES.values() if not m.get("noindex") and m["slug"] != "404")
    print(f"sitemap urls: {count}")


if __name__ == "__main__":
    main()
