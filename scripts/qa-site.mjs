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
    if (name === "node_modules" || name === ".git" || name === "quarantine" || name === "content" || name === "partials" || name === "scripts") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (name.endsWith(".html")) acc.push(p);
  }
  return acc;
}

const banned = [
  /shoreexcursionsgroup/i,
  /\bSEG\b/,
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
];

for (const rel of requiredHtml) {
  if (!existsSync(join(ROOT, rel))) fail(`missing ${rel}`);
  else ok(`present ${rel}`);
}

const htmlFiles = walk(ROOT);
for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const rel = file.replace(ROOT, "").replace(/^\//, "");
  if (!html.includes("<h1")) fail(`${rel} missing H1`);
  if (!html.includes('rel="canonical"')) fail(`${rel} missing canonical`);
  if (!html.includes("hello@stluciashoreexcursions.com") && !rel.endsWith("404.html")) {
    // 404 may omit email; others should have footer email
    if (!rel.includes("404")) fail(`${rel} missing contact email`);
  }
  if (html.includes('id="page-content"></main>') || html.includes('id="page-content">\n</main>')) {
    fail(`${rel} empty page-content (not assembled?)`);
  }
  if (html.includes("data-content=") && html.includes('id="page-content"></main>')) {
    fail(`${rel} still using client-side content fetch shell`);
  }
  for (const re of banned) {
    if (re.test(html)) fail(`${rel} matched banned pattern ${re}`);
  }
  // equity pages must self-canonical to .html
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
  "https://stluciashoreexcursions.com/st-lucia-shore-excursions-faq/",
]) {
  if (!sitemap.includes(`<loc>${u}</loc>`)) fail(`sitemap missing ${u}`);
  else ok(`sitemap has ${u}`);
}

const robots = readFileSync(join(ROOT, "robots.txt"), "utf8");
if (!robots.includes("Sitemap: https://stluciashoreexcursions.com/sitemap.xml")) fail("robots sitemap");
else ok("robots sitemap");

const css = readFileSync(join(ROOT, "css/site.css"), "utf8");
if (css.includes("cdn.tailwindcss")) fail("css references tailwind cdn");
else ok("no tailwind cdn in css");

const images = [
  "images/hero-home.jpg",
  "images/pitons-volcano-tours.jpg",
  "images/soufriere-volcano.jpg",
  "images/castries-cruise-port.jpg",
  "images/catamaran-coast.jpg",
  "images/private-st-lucia-tours.jpg",
  "images/sulphur-springs.jpg",
  "images/excursions-hub.jpg",
  "images/ATTRIBUTION.md",
];
for (const img of images) {
  if (!existsSync(join(ROOT, img))) fail(`missing ${img}`);
  else ok(`image ${img}`);
}

if (failed) {
  console.error(`\nQA failed with ${failed} issue(s)`);
  process.exit(1);
}
console.log("\nQA passed");
