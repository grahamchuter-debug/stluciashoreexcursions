#!/usr/bin/env python3
"""Build fully assembled static HTML for St Lucia Shore Excursions (World 2.0)."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOMAIN = "https://stluciashoreexcursions.com"
SITE = "St Lucia Shore Excursions"
EMAIL = "hello@stluciashoreexcursions.com"
FONTS = (
    "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700"
    "&family=Source+Sans+3:wght@400;500;600;700&display=swap"
)

EQUITY = [
    "best-st-lucia-shore-excursions.html",
    "pitons-volcano-tours.html",
    "soufriere-shore-excursions.html",
    "st-lucia-catamaran-cruises.html",
    "private-st-lucia-tours.html",
    "st-lucia-cruise-port-guide.html",
]

TRUST = [
    ("about", "About"),
    ("contact", "Contact"),
    ("privacy", "Privacy"),
    ("terms", "Terms"),
    ("methodology", "Methodology"),
    ("st-lucia-shore-excursions-faq", "FAQ"),
]


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    print(f"  wrote {path.relative_to(ROOT)}")


def nav(current: str) -> str:
    items = [
        ("/", "home", "Home"),
        ("/best-st-lucia-shore-excursions.html", "excursions", "Excursions"),
        ("/pitons-volcano-tours.html", "pitons", "Pitons"),
        ("/soufriere-shore-excursions.html", "soufriere", "Soufrière"),
        ("/st-lucia-catamaran-cruises.html", "catamaran", "Catamaran"),
        ("/private-st-lucia-tours.html", "private", "Private"),
        ("/st-lucia-cruise-port-guide.html", "port", "Port Guide"),
    ]

    def link(href: str, key: str, label: str) -> str:
        cur = ' aria-current="page"' if current == key else ""
        return f'<li><a href="{href}"{cur}>{label}</a></li>'

    desktop = "\n          ".join(link(*i) for i in items)
    mobile = "\n      ".join(
        f'<a href="{h}"{" aria-current=\"page\"" if current == k else ""}>{lab}</a>'
        for h, k, lab in items
    )
    return f"""<a class="skip-link" href="#main">Skip to content</a>
<header class="site-nav">
  <div class="wrap site-nav__inner">
    <a class="brand" href="/">
      <span class="brand__name">St Lucia Shore Excursions</span>
      <span class="brand__tag">Cruise passenger guide</span>
    </a>
    <nav aria-label="Primary">
      <ul class="nav-links">
          {desktop}
      </ul>
    </nav>
    <a class="nav-cta" href="/best-st-lucia-shore-excursions.html">Compare excursions</a>
    <button type="button" class="menu-toggle" id="menu-toggle" aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
    </button>
  </div>
  <div class="mobile-menu" id="mobile-menu" hidden>
    <div class="wrap">
      {mobile}
      <a href="/best-st-lucia-shore-excursions.html">Compare excursions</a>
      <a href="/contact/">Contact</a>
    </div>
  </div>
</header>"""


def footer() -> str:
    return f"""<footer class="site-footer">
  <div class="wrap footer-grid">
    <div>
      <p class="footer-brand">St Lucia Shore Excursions</p>
      <p>St Lucia Shore Excursions provides cruise-focused excursion information and independent destination advice for passengers visiting St Lucia. Not affiliated with any cruise line.</p>
      <p style="margin-top:0.85rem"><a href="mailto:{EMAIL}">{EMAIL}</a></p>
    </div>
    <div>
      <h2>Excursions</h2>
      <ul>
        <li><a href="/best-st-lucia-shore-excursions.html">Excursion hub</a></li>
        <li><a href="/pitons-volcano-tours.html">Pitons tours</a></li>
        <li><a href="/soufriere-shore-excursions.html">Soufrière</a></li>
        <li><a href="/st-lucia-catamaran-cruises.html">Catamaran</a></li>
        <li><a href="/private-st-lucia-tours.html">Private tours</a></li>
      </ul>
    </div>
    <div>
      <h2>Plan</h2>
      <ul>
        <li><a href="/st-lucia-cruise-port-guide.html">Cruise port guide</a></li>
        <li><a href="/st-lucia-shore-excursions-faq/">FAQ</a></li>
        <li><a href="/methodology/">Methodology</a></li>
      </ul>
    </div>
    <div>
      <h2>Trust</h2>
      <ul>
        <li><a href="/about/">About</a></li>
        <li><a href="/contact/">Contact</a></li>
        <li><a href="/privacy/">Privacy</a></li>
        <li><a href="/terms/">Terms</a></li>
      </ul>
    </div>
  </div>
  <div class="wrap footer-base">
    <p>&copy; 2026 St Lucia Shore Excursions · <a href="{DOMAIN}/">stluciashoreexcursions.com</a></p>
  </div>
</footer>"""


def hero_home() -> str:
    return """<section class="hero" aria-label="Homepage hero">
  <div class="hero__media">
    <img src="/images/hero-home.jpg" alt="The Pitons rising above the west coast of St Lucia" width="1920" height="1066" fetchpriority="high" />
  </div>
  <div class="hero__shade" aria-hidden="true"></div>
  <div class="hero__inner">
    <p class="hero__brand">St Lucia Shore Excursions</p>
    <h1>St Lucia Shore Excursions for Cruise Guests</h1>
    <p class="hero__lead">Plan a Castries port day around the Pitons, Soufrière, catamaran sails and private touring, with timing that respects your ship.</p>
    <div class="hero__actions">
      <a class="btn btn--primary" href="/best-st-lucia-shore-excursions.html">Compare excursions</a>
      <a class="btn btn--ghost" href="/st-lucia-cruise-port-guide.html">Explore the port guide</a>
    </div>
  </div>
</section>"""


def hero_page(title: str, lead: str, image: str, alt: str, crumb: str) -> str:
    return f"""<section class="hero hero--page" aria-label="{title}">
  <div class="hero__media">
    <img src="{image}" alt="{alt}" width="1600" height="900" fetchpriority="high" />
  </div>
  <div class="hero__shade" aria-hidden="true"></div>
  <div class="hero__inner">
    <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> · {crumb}</nav>
    <h1>{title}</h1>
    <p class="hero__lead">{lead}</p>
  </div>
</section>"""


def page_shell(
    *,
    title: str,
    description: str,
    canonical: str,
    og_image: str,
    nav_key: str,
    hero: str,
    body: str,
    schema: dict | list | None = None,
    preload: str | None = None,
) -> str:
    canon = canonical if canonical.startswith("http") else f"{DOMAIN}{canonical}"
    preload = preload or og_image
    graph: list = [
        {
            "@type": "WebSite",
            "name": SITE,
            "url": f"{DOMAIN}/",
            "description": "Cruise-focused St Lucia shore excursion information and independent destination advice.",
            "inLanguage": "en-GB",
            "publisher": {"@type": "Organization", "name": SITE, "url": f"{DOMAIN}/", "email": EMAIL},
        },
        {
            "@type": "Organization",
            "name": SITE,
            "url": f"{DOMAIN}/",
            "email": EMAIL,
            "description": "St Lucia Shore Excursions provides cruise-focused excursion information and independent destination advice for passengers visiting St Lucia. Not affiliated with any cruise line.",
        },
        {
            "@type": "WebPage",
            "name": title.replace("&amp;", "&"),
            "url": canon,
            "description": description,
            "isPartOf": {"@type": "WebSite", "name": SITE, "url": f"{DOMAIN}/"},
            "inLanguage": "en-GB",
        },
    ]
    if schema:
        if isinstance(schema, list):
            graph.extend(schema)
        elif isinstance(schema, dict):
            graph.append({k: v for k, v in schema.items() if k != "@context"})

    schema_block = (
        '  <script type="application/ld+json">\n'
        + json.dumps({"@context": "https://schema.org", "@graph": graph}, indent=2, ensure_ascii=False)
        + "\n  </script>\n"
    )
    return f"""<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <meta name="description" content="{description}" />
  <link rel="canonical" href="{canon}" />
  <link rel="icon" href="/images/favicon.svg" type="image/svg+xml" />
  <link rel="preload" as="image" href="{preload}" fetchpriority="high" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="{canon}" />
  <meta property="og:title" content="{title}" />
  <meta property="og:description" content="{description}" />
  <meta property="og:image" content="{DOMAIN}{og_image}" />
  <meta property="og:site_name" content="{SITE}" />
  <meta property="og:locale" content="en_GB" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{title}" />
  <meta name="twitter:description" content="{description}" />
  <meta name="twitter:image" content="{DOMAIN}{og_image}" />
{schema_block}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="{FONTS}" rel="stylesheet" />
  <link rel="stylesheet" href="/css/site.css" />
</head>
<body data-page="{nav_key}">
{nav(nav_key)}
{hero}
<main id="main">
{body}
</main>
{footer()}
  <script src="/js/nav.js" defer></script>
</body>
</html>
"""


def crumbs(items: list[tuple[str, str]]) -> dict:
    elements = []
    for i, (name, url) in enumerate(items, start=1):
        elements.append({"@type": "ListItem", "position": i, "name": name, "item": url})
    return {"@type": "BreadcrumbList", "itemListElement": elements}


def home_body() -> str:
    return f"""
<section class="section">
  <div class="wrap grid-2">
    <div class="prose">
      <p class="eyebrow">Castries · Pointe Seraphine</p>
      <h2>A cruise day shaped by distance and scenery</h2>
      <p>Most ships call at Castries, often at Pointe Seraphine or nearby berths. The island's signature scenery sits farther south around the Pitons and Soufrière, so the real planning question is how much road time you want versus time on the water or in town.</p>
      <p>Use this site to compare the main excursion styles, then read the <a href="/st-lucia-cruise-port-guide.html">St Lucia cruise port guide</a> before you lock a plan to your all-aboard time.</p>
      <p class="note">St Lucia Shore Excursions provides cruise-focused excursion information and independent destination advice for passengers visiting St Lucia. Not affiliated with any cruise line.</p>
    </div>
    <div class="media-frame">
      <img src="/images/castries-cruise-port.jpg" alt="Cruise ships in Castries harbour, St Lucia" width="1024" height="768" loading="lazy" />
    </div>
  </div>
</section>

<section class="section section--alt">
  <div class="wrap">
    <p class="eyebrow">Start here</p>
    <h2>Four ways to spend a St Lucia port day</h2>
    <p class="lead">Pick a theme first. Exact tour products vary by operator and season; these pages help you compare the day you will actually have.</p>
    <div class="theme-list" style="margin-top:1.5rem">
      <a class="theme-link" href="/pitons-volcano-tours.html">
        <div class="theme-link__img"><img src="/images/pitons-volcano-tours.jpg" alt="The Pitons near Soufrière" width="600" height="400" loading="lazy" /></div>
        <div class="theme-link__body"><h3>Pitons tours</h3><p>Viewpoints, volcanic landscape and the island's most photographed skyline.</p></div>
      </a>
      <a class="theme-link" href="/soufriere-shore-excursions.html">
        <div class="theme-link__img"><img src="/images/soufriere-volcano.jpg" alt="Soufrière town with the Pitons beyond" width="600" height="400" loading="lazy" /></div>
        <div class="theme-link__body"><h3>Soufrière day</h3><p>Town, Sulphur Springs, mud baths, waterfalls and coastal stops in one land itinerary.</p></div>
      </a>
      <a class="theme-link" href="/st-lucia-catamaran-cruises.html">
        <div class="theme-link__img"><img src="/images/catamaran-coast.jpg" alt="Coastal cliffs and Petit Piton above Caribbean water" width="600" height="400" loading="lazy" /></div>
        <div class="theme-link__body"><h3>Catamaran cruises</h3><p>Pitons from the water, swim stops and a lighter day when road time feels too long.</p></div>
      </a>
      <a class="theme-link" href="/private-st-lucia-tours.html">
        <div class="theme-link__img"><img src="/images/private-st-lucia-tours.jpg" alt="View over Soufrière and surrounding hills" width="600" height="400" loading="lazy" /></div>
        <div class="theme-link__body"><h3>Private tours</h3><p>Flexible pacing for families and small groups who want to combine stops carefully.</p></div>
      </a>
    </div>
    <p style="margin-top:1.5rem"><a class="btn btn--solid" href="/best-st-lucia-shore-excursions.html">Open the excursion comparison</a></p>
  </div>
</section>

<section class="section">
  <div class="wrap prose">
    <p class="eyebrow">Port timing</p>
    <h2>Choose by hours ashore, not by brochure titles</h2>
    <p>A full land day to Soufrière and the Pitons usually needs a generous call. Shorter calls often suit a northern sail, a shorter private loop, or a simpler Castries-based plan. Confirm pier assignment and all-aboard on your ship's daily programme, then work backwards with a buffer you are comfortable keeping.</p>
    <div class="hero__actions">
      <a class="btn btn--outline" href="/st-lucia-cruise-port-guide.html">Plan with the port guide</a>
      <a class="btn btn--solid" href="/st-lucia-shore-excursions-faq/">Read the FAQ</a>
    </div>
  </div>
</section>

<section class="section section--deep">
  <div class="wrap" style="text-align:center;max-width:40rem;margin-inline:auto">
    <h2>Ready to compare options?</h2>
    <p>See how Pitons, Soufrière, catamaran and private days differ on scenery, vehicle time, water time and flexibility.</p>
    <div class="hero__actions" style="justify-content:center;margin-top:1.25rem">
      <a class="btn btn--primary" href="/best-st-lucia-shore-excursions.html">Compare excursions</a>
      <a class="btn btn--ghost" href="/contact/">Contact us</a>
    </div>
  </div>
</section>
"""


def hub_body() -> str:
    return """
<section class="section">
  <div class="wrap prose">
    <p class="eyebrow">Comparison hub</p>
    <h2>Match the day to your ship hours</h2>
    <p>St Lucia's headline scenery clusters around Soufrière and the Pitons, a meaningful drive from Castries. Catamaran days trade some inland stops for water time. Private tours trade shared pacing for control. Use the table as a planning lens, not a promise of exact durations.</p>
    <dl class="snapshot" aria-label="Cruise passenger snapshot">
      <div><dt>Typical call length</dt><dd>Often a full day; confirm your ship</dd></div>
      <div><dt>Main decision</dt><dd>South land day vs coastal sail vs flexible private</dd></div>
      <div><dt>Best next read</dt><dd><a href="/st-lucia-cruise-port-guide.html">Cruise port guide</a></dd></div>
    </dl>
  </div>
</section>
<section class="section section--alt">
  <div class="wrap">
    <div class="compare-wrap">
      <table class="compare">
        <caption>Pitons vs Soufrière vs catamaran vs private</caption>
        <thead>
          <tr>
            <th scope="col">Dimension</th>
            <th scope="col">Pitons focus</th>
            <th scope="col">Soufrière day</th>
            <th scope="col">Catamaran</th>
            <th scope="col">Private</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Scenery</th>
            <td>Twin peaks, viewpoints, volcanic skyline</td>
            <td>Town, springs, falls, Pitons as part of a wider loop</td>
            <td>Coastline and Pitons from the water</td>
            <td>You choose the mix</td>
          </tr>
          <tr>
            <th scope="row">Vehicle time</th>
            <td>Significant Castries–south road time</td>
            <td>Significant, often the fullest land day</td>
            <td>Usually less inland driving</td>
            <td>Adjustable with your guide</td>
          </tr>
          <tr>
            <th scope="row">Water time</th>
            <td>Optional, not the main point</td>
            <td>Sometimes included as a coastal or snorkel add-on</td>
            <td>Core of the day</td>
            <td>Optional</td>
          </tr>
          <tr>
            <th scope="row">Activity feel</th>
            <td>Scenic stops and photo moments</td>
            <td>More varied stops in one itinerary</td>
            <td>Sailing, swim or snorkel stops</td>
            <td>Pace set by your group</td>
          </tr>
          <tr>
            <th scope="row">Flexibility</th>
            <td>Shared tours follow a set route</td>
            <td>Shared tours pack several highlights</td>
            <td>Boat schedule leads; weather matters</td>
            <td>Highest control over order and dwell time</td>
          </tr>
          <tr>
            <th scope="row">Best suited</th>
            <td>Guests who want the Pitons as the star</td>
            <td>Guests who want town, springs and scenery together</td>
            <td>Guests who prefer sea over a long road day</td>
            <td>Families, small groups, mixed mobility needs</td>
          </tr>
          <tr>
            <th scope="row">Port-day fit</th>
            <td>Needs a generous call</td>
            <td>Needs a generous call</td>
            <td>Often easier on moderate calls if transfers work</td>
            <td>Scales to your hours if planned conservatively</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="theme-list" style="margin-top:2rem">
      <a class="theme-link" href="/pitons-volcano-tours.html"><div class="theme-link__img"><img src="/images/pitons-volcano-tours.jpg" alt="" width="400" height="300" loading="lazy" /></div><div class="theme-link__body"><h3>Explore Pitons tours</h3><p>Land vs sea viewpoints and timing from Castries.</p></div></a>
      <a class="theme-link" href="/soufriere-shore-excursions.html"><div class="theme-link__img"><img src="/images/soufriere-volcano.jpg" alt="" width="400" height="300" loading="lazy" /></div><div class="theme-link__body"><h3>Explore Soufrière</h3><p>How a town-and-springs day differs from a Pitons-only focus.</p></div></a>
      <a class="theme-link" href="/st-lucia-catamaran-cruises.html"><div class="theme-link__img"><img src="/images/catamaran-coast.jpg" alt="" width="400" height="300" loading="lazy" /></div><div class="theme-link__body"><h3>Explore catamaran days</h3><p>Half-day vs longer sails and what to check before you go.</p></div></a>
      <a class="theme-link" href="/private-st-lucia-tours.html"><div class="theme-link__img"><img src="/images/private-st-lucia-tours.jpg" alt="" width="400" height="300" loading="lazy" /></div><div class="theme-link__body"><h3>Explore private touring</h3><p>Combinations, pace and port-day discipline.</p></div></a>
    </div>
  </div>
</section>
"""


def pitons_body() -> str:
    return """
<section class="section">
  <div class="wrap grid-2">
    <div class="prose">
      <p class="eyebrow">Possible commercial candidate</p>
      <h2>The Pitons as a port-day idea, not a tick-box photo</h2>
      <p>Gros Piton and Petit Piton define St Lucia's western skyline. On a cruise day the question is less whether you will see the Pitons and more how you want to meet them: roadside viewpoints, a Soufrière-area loop, or a water-level approach by boat.</p>
      <p>A Pitons-focused land day emphasises volcanic landscape, lookouts and the drama of the peaks themselves. It differs from a broader <a href="/soufriere-shore-excursions.html">Soufrière shore excursion</a>, which may spend more time in town, at Sulphur Springs, mud baths or waterfalls with the Pitons as one thread among several.</p>
      <dl class="snapshot">
        <div><dt>From Castries</dt><dd>Plan for a long scenic drive each way</dd></div>
        <div><dt>Land vs sea</dt><dd>Viewpoints inland; <a href="/st-lucia-catamaran-cruises.html">catamaran</a> for water angles</dd></div>
        <div><dt>Best paired with</dt><dd><a href="/st-lucia-cruise-port-guide.html">Port timing notes</a></dd></div>
      </dl>
    </div>
    <div class="media-frame">
      <img src="/images/pitons-viewpoint.jpg" alt="Petit Piton rising above the Soufrière coast" width="1920" height="1440" loading="lazy" />
    </div>
  </div>
</section>
<section class="section section--alt">
  <div class="wrap prose">
    <h2>What makes a Pitons day feel different</h2>
    <p>Expect the day to revolve around scenery and geometry: ridges, coastal cliffs and those two volcanic plugs. Stops may include classic viewpoints south of Castries and time near Soufrière where the peaks dominate the bay. Hiking Gros Piton is a separate, more physical undertaking and may not fit a standard cruise call.</p>
    <p>If your priority is mud baths, Sulphur Springs detail and town wandering, read the Soufrière page first. If you want the peaks from the water with swim time, compare <a href="/st-lucia-catamaran-cruises.html">St Lucia catamaran cruises</a>.</p>
    <p class="note">This page describes excursion styles for planning. Product details, inclusions and timing always need confirming with any operator you later choose.</p>
    <div class="hero__actions">
      <a class="btn btn--solid" href="/best-st-lucia-shore-excursions.html">Compare all themes</a>
      <a class="btn btn--outline" href="/soufriere-shore-excursions.html">Contrast with Soufrière</a>
    </div>
  </div>
</section>
"""


def soufriere_body() -> str:
    return """
<section class="section">
  <div class="wrap grid-2">
    <div class="prose">
      <p class="eyebrow">Possible commercial candidate</p>
      <h2>Soufrière is a place as much as a viewpoint</h2>
      <p>Soufrière sits in the island's volcanic west, with the Pitons framing the bay and a town rhythm that feels distinct from Castries. Cruise-day itineraries here often weave Sulphur Springs, mud baths, waterfall stops, Pitons viewpoints and occasional coastal or snorkel add-ons into one long land day.</p>
      <p>That breadth is the difference from a purely <a href="/pitons-volcano-tours.html">Pitons-focused tour</a>. You trade some single-minded peak time for a fuller sense of the district. The cost is vehicle time: the drive from Castries is winding and scenic, and it consumes a real share of hours ashore.</p>
      <dl class="snapshot">
        <div><dt>Journey time</dt><dd>Treat Castries–Soufrière as a major segment each way</dd></div>
        <div><dt>Trade-off</dt><dd>More stops vs deeper time at any one place</dd></div>
        <div><dt>Sea alternative</dt><dd><a href="/st-lucia-catamaran-cruises.html">Catamaran days</a></dd></div>
      </dl>
    </div>
    <div class="media-frame">
      <img src="/images/soufriere-town.jpg" alt="Soufrière town with the Pitons in the background" width="1920" height="1440" loading="lazy" />
    </div>
  </div>
</section>
<section class="section section--alt">
  <div class="wrap grid-2">
    <div class="media-frame">
      <img src="/images/sulphur-springs.jpg" alt="Sulphur Springs volcanic landscape near Soufrière" width="1600" height="1200" loading="lazy" />
    </div>
    <div class="prose">
      <h2>Cruise-day trade-offs</h2>
      <p>Shared Soufrière excursions tend to move with the group. Private touring can reorder stops, but physics still apply: road time, heat and your return buffer. On shorter calls, a full Soufrière circuit can feel rushed; on longer calls it is one of the island's richest land options.</p>
      <p>Read the <a href="/st-lucia-cruise-port-guide.html">port guide</a> for meeting and timing considerations, then use the <a href="/best-st-lucia-shore-excursions.html">excursion hub</a> to compare against Pitons-only, catamaran and private approaches.</p>
    </div>
  </div>
</section>
"""


def catamaran_body() -> str:
    return """
<section class="section">
  <div class="wrap grid-2">
    <div class="prose">
      <p class="eyebrow">SEO priority theme</p>
      <h2>See the Pitons from the water</h2>
      <p>A St Lucia catamaran day suits cruise passengers who want coastal scenery, a chance to swim or snorkel, and less of the long inland road to Soufrière. Longer sails can reveal the Pitons from sea level; shorter outings may stay closer to northern coasts depending on the boat's programme.</p>
      <p>Departure points and pickup logistics vary. Northern marina areas around Rodney Bay are commonly associated with day sails; Castries guests should confirm transfer details and how they mesh with pier location and all-aboard. Treat half-day versus longer itineraries as a timing decision first, a brochure decision second.</p>
      <dl class="snapshot">
        <div><dt>Who it suits</dt><dd>Guests who prefer sea time to a full road day</dd></div>
        <div><dt>Land contrast</dt><dd><a href="/pitons-volcano-tours.html">Pitons land viewpoints</a></dd></div>
        <div><dt>Check before you go</dt><dd>Transfer time, swim stops, weather, return buffer</dd></div>
      </dl>
    </div>
    <div class="media-frame">
      <img src="/images/sailing-bay.jpg" alt="Sailing boats in a bay of Saint Lucia" width="1920" height="1079" loading="lazy" />
    </div>
  </div>
</section>
<section class="section section--alt">
  <div class="wrap prose">
    <h2>What to verify on any catamaran offer</h2>
    <p>Ask how long you will actually be under way, whether swim or snorkel stops are planned, and what guests typically bring themselves. Inclusions such as snorkel equipment vary by operator and are not something this guide can promise. Sea conditions and seasonal weather can change the feel of the day even when the boat still sails.</p>
    <p>If your heart is set on volcanic landscape, town and Sulphur Springs, compare a <a href="/soufriere-shore-excursions.html">Soufrière land day</a>. If you want flexible combinations for a family group, see <a href="/private-st-lucia-tours.html">private St Lucia tours</a>.</p>
    <div class="hero__actions">
      <a class="btn btn--solid" href="/best-st-lucia-shore-excursions.html">Compare land vs sea</a>
      <a class="btn btn--outline" href="/st-lucia-cruise-port-guide.html">Check port timing</a>
    </div>
  </div>
</section>
"""


def private_body() -> str:
    return """
<section class="section">
  <div class="wrap grid-2">
    <div class="prose">
      <p class="eyebrow">Flexible touring</p>
      <h2>Private vehicle and guide, paced for your group</h2>
      <p>Private St Lucia tours appeal when shared coaches feel too rigid: families with mixed ages, small groups who want longer at one viewpoint, or passengers combining Castries-area stops with a carefully timed push south. The idea is simple: a private vehicle and guide, an agreed outline, and room to adjust dwell time.</p>
      <p>Flexibility is not infinite. Road time to Soufrière and the Pitons still applies, and your ship's clock still wins. A good private plan starts with hours ashore, then chooses a realistic combination rather than trying to see the whole island.</p>
      <dl class="snapshot">
        <div><dt>Strength</dt><dd>Pace and stop order you can discuss in advance</dd></div>
        <div><dt>Common mixes</dt><dd>Pitons viewpoints, Soufrière highlights, lighter north options</dd></div>
        <div><dt>Discipline</dt><dd>Keep a return buffer you actually intend to use</dd></div>
      </dl>
    </div>
    <div class="media-frame">
      <img src="/images/private-st-lucia-tours.jpg" alt="Elevated view toward Soufrière and St Lucia's west coast" width="1200" height="800" loading="lazy" />
    </div>
  </div>
</section>
<section class="section section--alt">
  <div class="wrap prose">
    <h2>How to brief a private day</h2>
    <p>Decide whether scenery (Pitons), variety (Soufrière district) or a gentler Castries-proximate day matters most. Share mobility needs and interest in heat-heavy stops such as Sulphur Springs. Cross-read the <a href="/pitons-volcano-tours.html">Pitons</a> and <a href="/soufriere-shore-excursions.html">Soufrière</a> pages so you are not inventing an itinerary that cannot fit the clock.</p>
    <p>This site does not list vehicles, capacities or prices. When you later speak with an operator, confirm meeting point, route outline and how they handle ship schedules.</p>
    <div class="hero__actions">
      <a class="btn btn--solid" href="/best-st-lucia-shore-excursions.html">Back to comparison</a>
      <a class="btn btn--outline" href="/contact/">Contact</a>
    </div>
  </div>
</section>
"""


def port_body() -> str:
    return """
<section class="section">
  <div class="wrap grid-2">
    <div class="prose">
      <p class="eyebrow">Castries orientation</p>
      <h2>Arrive ready for distance and timing</h2>
      <p>Cruise calls centre on Castries. Pointe Seraphine is a frequently used cruise facility; exact berth or tender arrangements can vary by ship and day, so treat the morning programme as the source of truth for where you step ashore.</p>
      <p>Independent meeting points should be agreed clearly with whoever you plan to meet. Downtown Castries sits close to the harbour area, but Soufrière and the Pitons are a different proposition: scenic coastal and mountain roads that take a meaningful share of a port day in each direction.</p>
      <dl class="snapshot">
        <div><dt>Confirm on the day</dt><dd>Pier or tender assignment and all-aboard</dd></div>
        <div><dt>Southbound awareness</dt><dd>Soufrière / Pitons need generous hours</dd></div>
        <div><dt>Return planning</dt><dd>Build a buffer; do not cut it fine</dd></div>
      </dl>
    </div>
    <div class="media-frame">
      <img src="/images/castries-harbor.jpg" alt="Castries harbour from Morne Fortune with cruise ships at berth" width="1024" height="768" loading="lazy" />
    </div>
  </div>
</section>
<section class="section section--alt">
  <div class="wrap prose">
    <h2>Independent considerations</h2>
    <p>If you explore near the port, stay aware of traffic, heat and how long walks feel after a morning on the pier. If you leave for Soufrière or a sail, know your meeting time for the return and how you will communicate if plans slip. This guide does not guarantee return-to-ship outcomes; that depends on your choices, traffic, weather and the operators you engage.</p>
    <p>Next, compare excursion styles on the <a href="/best-st-lucia-shore-excursions.html">hub</a>, or jump to <a href="/pitons-volcano-tours.html">Pitons</a>, <a href="/soufriere-shore-excursions.html">Soufrière</a>, <a href="/st-lucia-catamaran-cruises.html">catamaran</a> or <a href="/private-st-lucia-tours.html">private</a> pages.</p>
  </div>
</section>
"""


def trust_about() -> str:
    return f"""
<section class="section"><div class="wrap prose">
  <p class="eyebrow">About</p>
  <h2>Independent St Lucia cruise advice</h2>
  <p>St Lucia Shore Excursions provides cruise-focused excursion information and independent destination advice for passengers visiting St Lucia. We publish comparison pages on the Pitons, Soufrière, catamaran sailing, private touring and Castries port logistics so guests can choose a day that fits their ship hours.</p>
  <p>Not affiliated with any cruise line. The site is pre-commercial: we are structuring clear theme pages for future product work, without presenting live booking, prices or supplier inventory here.</p>
  <p>Questions: <a href="mailto:{EMAIL}">{EMAIL}</a> or the <a href="/contact/">contact page</a>.</p>
</div></section>
"""


def trust_contact() -> str:
    return f"""
<section class="section"><div class="wrap prose">
  <p class="eyebrow">Contact</p>
  <h2>Email us</h2>
  <p>For questions about this St Lucia cruise excursion guide, email <a href="mailto:{EMAIL}">{EMAIL}</a>. We read messages as capacity allows and cannot arrange ship-side meetups or confirm third-party tour availability by email.</p>
  <p class="note">There is no booking form on this page. When commercial products launch, purchase flows will be clearly labelled.</p>
  <p><a class="btn btn--solid" href="mailto:{EMAIL}">Email {EMAIL}</a></p>
</div></section>
"""


def trust_privacy() -> str:
    return f"""
<section class="section"><div class="wrap prose">
  <h2>Privacy</h2>
  <p>This website is an informational site for St Lucia cruise passengers. If you email {EMAIL}, we use your address only to respond. We do not sell personal data.</p>
  <p>Standard server and CDN logs may collect IP address, user agent and requested URLs for security and reliability. Analytics, if enabled later, will be described here.</p>
  <p>For privacy questions, contact <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
</div></section>
"""


def trust_terms() -> str:
    return f"""
<section class="section"><div class="wrap prose">
  <h2>Terms of use</h2>
  <p>Content on stluciashoreexcursions.com is general information for cruise passengers planning time ashore in St Lucia. Conditions change: roads, weather, pier assignments and operator practices can differ from published descriptions.</p>
  <p>You are responsible for confirming details with your cruise line and any providers you engage, and for returning to your ship on time. We are not liable for missed ships, itinerary changes or third-party services.</p>
  <p>Not affiliated with any cruise line. For questions: <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>
</div></section>
"""


def trust_methodology() -> str:
    return """
<section class="section"><div class="wrap prose">
  <h2>Methodology</h2>
  <p>Pages are written for cruise-passenger decisions: hours ashore, distance from Castries, land versus sea trade-offs and how themes differ. We favour clear comparisons over rankings or fabricated scores.</p>
  <p>We do not invent prices, vehicle capacities, guaranteed return policies or supplier quality claims. When a theme is marked as a possible future commercial candidate, that is an editorial signal about demand and clarity, not a live product listing.</p>
  <p>Imagery is rights-cleared (see <a href="/images/ATTRIBUTION.md">image attribution</a>). Destination facts are checked against reputable public references and revised when we find clearer local detail.</p>
</div></section>
"""


def trust_faq() -> str:
    faqs = [
        (
            "Where do cruise ships arrive in St Lucia?",
            "Calls centre on Castries, often using Pointe Seraphine or nearby arrangements. Confirm your ship's daily programme for the exact setup on your call.",
        ),
        (
            "How far are the Pitons and Soufrière from the cruise port?",
            "They sit on the west and south-west of the island. From Castries the drive is scenic and substantial in both directions, so full land days need a generous call.",
        ),
        (
            "Should I choose a land day or a catamaran?",
            "Choose land for Soufrière district variety or Pitons viewpoints. Choose a catamaran when you prefer coastal scenery and swim time with less inland driving. Compare both on the excursion hub.",
        ),
        (
            "Does this website sell tours today?",
            "The site is pre-commercial. It provides cruise-focused information and independent destination advice. Future products will be labelled clearly when available.",
        ),
        (
            "How do I contact you?",
            f"Email {EMAIL}. There is no automated booking form on the contact page.",
        ),
    ]
    items = []
    schema_q = []
    for q, a in faqs:
        items.append(f"<details><summary>{q}</summary><p>{a}</p></details>")
        schema_q.append(
            {
                "@type": "Question",
                "name": q,
                "acceptedAnswer": {"@type": "Answer", "text": a},
            }
        )
    body = f"""
<section class="section"><div class="wrap">
  <p class="eyebrow">FAQ</p>
  <h2>St Lucia shore excursion questions</h2>
  <div class="faq" style="margin-top:1.25rem;max-width:44rem">
    {''.join(items)}
  </div>
  <p style="margin-top:1.5rem"><a href="/best-st-lucia-shore-excursions.html">Compare excursion themes</a> · <a href="/st-lucia-cruise-port-guide.html">Port guide</a></p>
</div></section>
"""
    return body, {"@type": "FAQPage", "mainEntity": schema_q}


def page_404() -> str:
    return f"""<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Page not found | {SITE}</title>
  <meta name="description" content="The requested St Lucia Shore Excursions page was not found." />
  <meta name="robots" content="noindex" />
  <link rel="canonical" href="{DOMAIN}/404.html" />
  <link rel="stylesheet" href="/css/site.css" />
  <link rel="icon" href="/images/favicon.svg" type="image/svg+xml" />
  <link href="{FONTS}" rel="stylesheet" />
</head>
<body>
{nav("home")}
<main id="main" class="page-404">
  <div>
    <p class="eyebrow">404</p>
    <h1>This page is not on our chart</h1>
    <p class="lead" style="margin-inline:auto">The link may be outdated. Try the excursion hub or port guide.</p>
    <div class="hero__actions" style="justify-content:center;margin-top:1.25rem">
      <a class="btn btn--solid" href="/">Home</a>
      <a class="btn btn--outline" href="/best-st-lucia-shore-excursions.html">Excursion hub</a>
    </div>
  </div>
</main>
{footer()}
<script src="/js/nav.js" defer></script>
</body>
</html>
"""


def sitemap() -> str:
    urls = [
        f"{DOMAIN}/",
        *[f"{DOMAIN}/{p}" for p in EQUITY],
        *[f"{DOMAIN}/{slug}/" for slug, _ in TRUST],
    ]
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for u in urls:
        lines.append("  <url>")
        lines.append(f"    <loc>{u}</loc>")
        lines.append("  </url>")
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def robots() -> str:
    return f"""User-agent: *
Allow: /

Sitemap: {DOMAIN}/sitemap.xml
"""


def main() -> None:
    print("Building St Lucia World 2.0…")

    write(
        ROOT / "index.html",
        page_shell(
            title="St Lucia Shore Excursions for Cruise Guests | Pitons, Soufrière &amp; Catamaran",
            description="Cruise-focused St Lucia shore excursion information: compare Pitons, Soufrière, catamaran and private days from Castries and Pointe Seraphine.",
            canonical="/",
            og_image="/images/hero-home.jpg",
            nav_key="home",
            hero=hero_home(),
            body=home_body(),
        ),
    )

    pages = [
        (
            "best-st-lucia-shore-excursions.html",
            "Best St Lucia Shore Excursions for Cruise Guests | Compare Themes",
            "Compare Pitons, Soufrière, catamaran and private St Lucia shore excursions on scenery, vehicle time, water time and port-day fit.",
            "/best-st-lucia-shore-excursions.html",
            "excursions",
            hero_page(
                "Best St Lucia Shore Excursions",
                "A practical comparison of the main cruise-day themes from Castries.",
                "/images/excursions-hub.jpg",
                "The Pitons in the Soufrière district of Saint Lucia",
                "Excursion hub",
            ),
            hub_body(),
            "/images/excursions-hub.jpg",
            [
                crumbs(
                    [
                        ("Home", f"{DOMAIN}/"),
                        ("Best St Lucia Shore Excursions", f"{DOMAIN}/best-st-lucia-shore-excursions.html"),
                    ]
                )
            ],
        ),
        (
            "pitons-volcano-tours.html",
            "Pitons Volcano Tours from Cruise Port | St Lucia Shore Excursions",
            "Plan Pitons-focused St Lucia shore excursions: viewpoints, volcanic landscape, land vs sea and timing from Castries.",
            "/pitons-volcano-tours.html",
            "pitons",
            hero_page(
                "Pitons Volcano Tours",
                "Scenery-first days built around St Lucia's twin peaks.",
                "/images/pitons-volcano-tours.jpg",
                "The Pitons at Soufrière, Saint Lucia",
                "Pitons",
            ),
            pitons_body(),
            "/images/pitons-volcano-tours.jpg",
            [
                crumbs(
                    [
                        ("Home", f"{DOMAIN}/"),
                        ("Pitons Volcano Tours", f"{DOMAIN}/pitons-volcano-tours.html"),
                    ]
                )
            ],
        ),
        (
            "soufriere-shore-excursions.html",
            "Soufrière Shore Excursions for Cruise Guests | St Lucia",
            "Soufrière cruise excursions: town, Sulphur Springs, mud baths, waterfalls and Pitons viewpoints, with honest timing from Castries.",
            "/soufriere-shore-excursions.html",
            "soufriere",
            hero_page(
                "Soufrière Shore Excursions",
                "A fuller west-coast land day beyond a single Pitons viewpoint.",
                "/images/soufriere-volcano.jpg",
                "Soufrière town and the Pitons",
                "Soufrière",
            ),
            soufriere_body(),
            "/images/soufriere-volcano.jpg",
            [
                crumbs(
                    [
                        ("Home", f"{DOMAIN}/"),
                        ("Soufrière Shore Excursions", f"{DOMAIN}/soufriere-shore-excursions.html"),
                    ]
                )
            ],
        ),
        (
            "st-lucia-catamaran-cruises.html",
            "St Lucia Catamaran Cruises for Cruise Passengers",
            "St Lucia catamaran cruises for cruise guests: Pitons from the water, swim stops, half-day vs longer sails and port timing checks.",
            "/st-lucia-catamaran-cruises.html",
            "catamaran",
            hero_page(
                "St Lucia Catamaran Cruises",
                "Coastal sailing days when you want sea time more than a long inland drive.",
                "/images/catamaran-coast.jpg",
                "Petit Piton above the Caribbean coast of Saint Lucia",
                "Catamaran",
            ),
            catamaran_body(),
            "/images/catamaran-coast.jpg",
            [
                crumbs(
                    [
                        ("Home", f"{DOMAIN}/"),
                        ("Catamaran Cruises", f"{DOMAIN}/st-lucia-catamaran-cruises.html"),
                    ]
                )
            ],
        ),
        (
            "private-st-lucia-tours.html",
            "Private St Lucia Tours for Cruise Guests",
            "Private St Lucia tours for cruise passengers: flexible pacing, combinations and port-day planning without invented prices or capacities.",
            "/private-st-lucia-tours.html",
            "private",
            hero_page(
                "Private St Lucia Tours",
                "Shape a Castries port day around your group's pace and interests.",
                "/images/private-st-lucia-tours.jpg",
                "View over Soufrière, Saint Lucia",
                "Private tours",
            ),
            private_body(),
            "/images/private-st-lucia-tours.jpg",
            [
                crumbs(
                    [
                        ("Home", f"{DOMAIN}/"),
                        ("Private St Lucia Tours", f"{DOMAIN}/private-st-lucia-tours.html"),
                    ]
                )
            ],
        ),
        (
            "st-lucia-cruise-port-guide.html",
            "St Lucia Cruise Port Guide | Castries &amp; Pointe Seraphine",
            "St Lucia cruise port guide for Castries and Pointe Seraphine: meeting tips, timing awareness for Soufrière and the Pitons, and independent planning notes.",
            "/st-lucia-cruise-port-guide.html",
            "port",
            hero_page(
                "St Lucia Cruise Port Guide",
                "Castries orientation for cruise guests planning time ashore.",
                "/images/castries-cruise-port.jpg",
                "Cruise ships at Castries cruise port",
                "Port guide",
            ),
            port_body(),
            "/images/castries-cruise-port.jpg",
            [
                crumbs(
                    [
                        ("Home", f"{DOMAIN}/"),
                        ("Cruise Port Guide", f"{DOMAIN}/st-lucia-cruise-port-guide.html"),
                    ]
                )
            ],
        ),
    ]

    for filename, title, desc, canon, key, hero, body, og, schema in pages:
        write(
            ROOT / filename,
            page_shell(
                title=title,
                description=desc,
                canonical=canon,
                og_image=og,
                nav_key=key,
                hero=hero,
                body=body,
                schema=schema,
                preload=og,
            ),
        )

    trust_pages = [
        ("about", "About | St Lucia Shore Excursions", "About this independent St Lucia cruise excursion information site.", trust_about(), "about", None),
        ("contact", "Contact | St Lucia Shore Excursions", f"Contact St Lucia Shore Excursions at {EMAIL}.", trust_contact(), "contact", None),
        ("privacy", "Privacy | St Lucia Shore Excursions", "Privacy information for stluciashoreexcursions.com.", trust_privacy(), "privacy", None),
        ("terms", "Terms | St Lucia Shore Excursions", "Terms of use for St Lucia Shore Excursions.", trust_terms(), "terms", None),
        ("methodology", "Methodology | St Lucia Shore Excursions", "How we research and write St Lucia cruise excursion guidance.", trust_methodology(), "methodology", None),
    ]
    for slug, title, desc, body, key, _ in trust_pages:
        write(
            ROOT / slug / "index.html",
            page_shell(
                title=title,
                description=desc,
                canonical=f"/{slug}/",
                og_image="/images/hero-home.jpg",
                nav_key=key,
                hero=hero_page(title.split("|")[0].strip(), desc, "/images/hero-home.jpg", "The Pitons, Saint Lucia", title.split("|")[0].strip()),
                body=body,
                schema=[crumbs([("Home", f"{DOMAIN}/"), (title.split("|")[0].strip(), f"{DOMAIN}/{slug}/")])],
            ),
        )

    faq_body, faq_schema = trust_faq()
    write(
        ROOT / "st-lucia-shore-excursions-faq" / "index.html",
        page_shell(
            title="St Lucia Shore Excursions FAQ",
            description="FAQ for St Lucia cruise shore excursions: Castries port, Pitons distance, catamaran vs land days and how to contact us.",
            canonical="/st-lucia-shore-excursions-faq/",
            og_image="/images/hero-home.jpg",
            nav_key="faq",
            hero=hero_page(
                "St Lucia Shore Excursions FAQ",
                "Clear answers for cruise passengers planning a Castries call.",
                "/images/hero-home.jpg",
                "The Pitons, Saint Lucia",
                "FAQ",
            ),
            body=faq_body,
            schema=[
                crumbs([("Home", f"{DOMAIN}/"), ("FAQ", f"{DOMAIN}/st-lucia-shore-excursions-faq/")]),
                faq_schema,
            ],
        ),
    )

    write(ROOT / "404.html", page_404())
    write(ROOT / "sitemap.xml", sitemap())
    write(ROOT / "robots.txt", robots())
    print("Done.")


if __name__ == "__main__":
    main()
