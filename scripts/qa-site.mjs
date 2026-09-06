#!/usr/bin/env node
/**
 * Local static QA for St Lucia World 2.0 rebuild.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
let failed = 0;

function fail(msg) {
  console.error("FAIL:", msg);
  failed += 1;
}
function ok(msg) {
  console.log("OK:", msg);
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (["node_modules", ".git", "quarantine", "scripts", "partials", "content"].includes(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (name.endsWith(".html")) acc.push(p);
  }
  return acc;
}

const banned = [
  /shoreexcursionsgroup/i,
  /viator/i,
  /getyourguide/i,
  /top rated/i,
  /editorial purposes only/i,
  /planning purposes only/i,
  /we do not sell excursions/i,
  /not a booking site/i,
  /cdn\.tailwindcss\.com/i,
  /info@wowatour\.com/i,
  /localhost/i,
  /sk_live_/i,
  /sk_test_/i,
  /snorkel gear provided/i,
  /AggregateRating/,
  /"@type":\s*"Product"/,
];

const requiredHtml = [
  "index.html",
  "best-st-lucia-shore-excursions.html",
  "pitons-volcano-tours.html",
  "soufriere-shore-excursions.html",
  "st-lucia-catamaran-cruises.html",
  "private-st-lucia-tours.html",
  "st-lucia-cruise-port-guide.html",
  "about/index.html",
  "contact/index.html",
  "privacy/index.html",
  "terms/index.html",
  "methodology/index.html",
  "st-lucia-shore-excursions-faq/index.html",
  "404.html",
  "book/soufriere-volcano-waterfalls-tour/index.html",
  "book/st-lucia-catamaran-cruise/index.html",
  "book/pitons-views-tour/index.html",
  "book/soufriere-volcano-waterfalls-tour/received/index.html",
  "book/st-lucia-catamaran-cruise/received/index.html",
  "book/pitons-views-tour/received/index.html",
];

for (const rel of requiredHtml) {
  if (!existsSync(join(ROOT, rel))) fail(`missing ${rel}`);
  else ok(`present ${rel}`);
}

const htmlFiles = walk(ROOT);
for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const rel = file.slice(ROOT.length).replace(/^\//, "");
  if (!html.includes("<h1")) fail(`${rel} missing H1`);
  if (!html.includes('rel="canonical"')) fail(`${rel} missing canonical`);
  if (!html.includes("hello@stluciashoreexcursions.com") && !rel.endsWith("404.html")) {
    fail(`${rel} missing contact email`);
  }
  if (html.includes("data-content=") && !html.includes('data-static')) {
    // old shell pattern
    if (html.includes('id="page-content"></main>')) fail(`${rel} client-fetch shell`);
  }
  if (html.includes("cdn.tailwindcss.com")) fail(`${rel} tailwind CDN`);
  for (const re of banned) {
    if (re.test(html)) fail(`${rel} matched banned pattern ${re}`);
  }
  if (rel.endsWith(".html") && !rel.includes("/") && rel !== "index.html" && rel !== "404.html") {
    const expected = `https://stluciashoreexcursions.com/${rel}`;
    if (!html.includes(`rel="canonical" href="${expected}"`)) {
      fail(`${rel} canonical should be ${expected}`);
    }
  }
}

const sitemap = readFileSync(join(ROOT, "sitemap.xml"), "utf8");
for (const u of [
  "https://stluciashoreexcursions.com/",
  "https://stluciashoreexcursions.com/best-st-lucia-shore-excursions.html",
  "https://stluciashoreexcursions.com/pitons-volcano-tours.html",
  "https://stluciashoreexcursions.com/soufriere-shore-excursions.html",
  "https://stluciashoreexcursions.com/st-lucia-catamaran-cruises.html",
  "https://stluciashoreexcursions.com/private-st-lucia-tours.html",
  "https://stluciashoreexcursions.com/st-lucia-cruise-port-guide.html",
  "https://stluciashoreexcursions.com/about/",
  "https://stluciashoreexcursions.com/contact/",
  "https://stluciashoreexcursions.com/privacy/",
  "https://stluciashoreexcursions.com/terms/",
  "https://stluciashoreexcursions.com/methodology/",
  "https://stluciashoreexcursions.com/st-lucia-shore-excursions-faq/",
]) {
  if (!sitemap.includes(`<loc>${u}</loc>`)) fail(`sitemap missing ${u}`);
  else ok(`sitemap has ${u}`);
}

const robots = readFileSync(join(ROOT, "robots.txt"), "utf8");
if (!robots.includes("Sitemap: https://stluciashoreexcursions.com/sitemap.xml")) fail("robots sitemap");
else ok("robots sitemap");

if (!existsSync(join(ROOT, "worker.js"))) fail("missing worker.js");
else ok("worker.js");
if (!existsSync(join(ROOT, "js/nav.js"))) fail("missing js/nav.js");
else ok("js/nav.js");
if (!existsSync(join(ROOT, "images/ATTRIBUTION.md"))) fail("missing ATTRIBUTION");
else ok("ATTRIBUTION");

// Phase 12D commercial checks
const privateHtml = readFileSync(join(ROOT, "private-st-lucia-tours.html"), "utf8");
if (/Book now/i.test(privateHtml)) fail("private tours must remain editorial (no Book now)");
else ok("private tours editorial only");

for (const rel of [
  "soufriere-shore-excursions.html",
  "st-lucia-catamaran-cruises.html",
  "pitons-volcano-tours.html",
]) {
  const html = readFileSync(join(ROOT, rel), "utf8");
  const count = (html.match(/Book now/gi) || []).length;
  if (count < 4) fail(`${rel} expected >=4 Book now CTAs, found ${count}`);
  else ok(`${rel} Book now CTAs (${count})`);
  if (/\bSEG\b|CASLJUNSOUVAN|CASLSAIL|CASLPITON|Shore Excursions Group/i.test(html)) {
    fail(`${rel} leaked internal supply refs`);
  }
}

const terms = readFileSync(join(ROOT, "terms/index.html"), "utf8");
if (!/14 days/.test(terms)) fail("terms missing 14-day cancellation");
else ok("terms 14-day cancellation");

if (failed) {
  console.error(`\nQA failed with ${failed} issue(s)`);
  process.exit(1);
}
console.log("\nQA passed");
