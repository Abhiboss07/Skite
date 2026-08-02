/**
 * UI regression checks for the header, the navigation menu and pricing.
 *
 * Three claims, written so they can fail:
 *   1. the header never moves while scrolling, at any viewport,
 *   2. the menu is compact and stays inside the viewport,
 *   3. pricing reads in rupees, on both billing periods.
 *
 * Plus the surface those changes could have broken: CLS, console errors,
 * landmarks, keyboard operation and reduced motion.
 *
 * Playwright is not a dependency of this project — it is a few hundred MB to
 * carry for a check that runs by hand. Install it when you need it:
 *
 *   npm install --no-save playwright
 *   npx playwright install chromium
 *   npm run build && npm start -- -p 4311
 *   node scripts/qa-ui.mjs
 *
 * BASE, OUT and CHROMIUM are all overridable by environment variable.
 */

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:4311";
const OUT = process.env.OUT ?? "/tmp/qa";
mkdirSync(OUT, { recursive: true });
/** Set CHROMIUM to reuse an already-downloaded browser instead of Playwright's own. */
const EXEC = process.env.CHROMIUM;

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
  { name: "wide", width: 1920, height: 1080 },
];

const browser = await chromium.launch(EXEC ? { executablePath: EXEC } : {});
const failures = [];
const notes = [];

const fail = (msg) => {
  failures.push(msg);
  console.log(`  ✗ ${msg}`);
};
const pass = (msg) => console.log(`  ✓ ${msg}`);

for (const vp of VIEWPORTS) {
  console.log(`\n── ${vp.name} (${vp.width}×${vp.height}) ──`);
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));

  // ── CLS, measured across a scripted scroll ────────────────────────
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });

  await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 45000 });
  await page.waitForTimeout(1400); // let the preloader and entrances settle

  // ── 1. the header must not move ───────────────────────────────────
  const header = page.locator("header").first();
  const positions = [];
  const styles = [];

  for (const y of [0, 150, 400, 700, 1200, 1800, 2400, 1600, 900, 300, 0]) {
    await page.evaluate((target) => window.scrollTo(0, target), y);
    // Two frames: one for the scroll, one for anything reacting to it.
    await page.waitForTimeout(140);
    const box = await header.boundingBox();
    positions.push({ y, top: box ? Math.round(box.y * 100) / 100 : null });
    styles.push(
      await header.evaluate((el) => {
        const cs = getComputedStyle(el);
        return { position: cs.position, transform: cs.transform };
      }),
    );
  }

  const tops = positions.map((p) => p.top);
  const drift = Math.max(...tops) - Math.min(...tops);
  if (drift > 0.5) {
    fail(`header moved ${drift.toFixed(2)}px while scrolling: ${JSON.stringify(positions)}`);
  } else {
    pass(`header fixed at top=${tops[0]} across 11 scroll positions (drift ${drift.toFixed(2)}px)`);
  }

  const transformed = styles.filter((s) => s.transform !== "none");
  if (transformed.length) {
    fail(`header carries a transform (${transformed[0].transform}) — invites jitter`);
  } else {
    pass("header has no transform at any scroll position");
  }

  if (styles.some((s) => s.position !== "fixed")) {
    fail("header is not position:fixed at every scroll position");
  }

  // Ancestors must not create a containing block for the fixed header.
  const badAncestor = await header.evaluate((el) => {
    for (let node = el.parentElement; node; node = node.parentElement) {
      const cs = getComputedStyle(node);
      if (
        cs.transform !== "none" ||
        cs.perspective !== "none" ||
        cs.filter !== "none" ||
        (cs.contain && /paint|layout|strict|content/.test(cs.contain)) ||
        (cs.willChange && /transform|perspective|filter/.test(cs.willChange))
      ) {
        return { tag: node.tagName, cls: node.className?.toString().slice(0, 60), transform: cs.transform, filter: cs.filter, contain: cs.contain, willChange: cs.willChange };
      }
    }
    return null;
  });
  if (badAncestor) fail(`ancestor creates a containing block: ${JSON.stringify(badAncestor)}`);
  else pass("no ancestor creates a containing block for the fixed header");

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);

  // ── 2. mega menu ──────────────────────────────────────────────────
  if (vp.width >= 1024) {
    const triggers = page.locator('nav[aria-label="Main"] button[aria-expanded]');
    const count = await triggers.count();
    let checked = 0;

    for (let i = 0; i < count; i++) {
      const trigger = triggers.nth(i);
      const label = (await trigger.textContent()).trim();
      await trigger.hover();
      await page.waitForTimeout(260);

      const panel = page.locator('nav[aria-label="Main"] ul').first();
      if (!(await panel.isVisible())) {
        fail(`menu "${label}" did not open`);
        continue;
      }

      const box = await panel.evaluate((el) => {
        const r = el.parentElement.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      });

      if (box.w < 380 || box.w > 560) fail(`menu "${label}" width ${Math.round(box.w)}px outside 380–560`);
      if (box.h > 260) fail(`menu "${label}" height ${Math.round(box.h)}px — too tall`);
      if (box.x < 0 || box.x + box.w > vp.width) {
        fail(`menu "${label}" overflows viewport: x=${Math.round(box.x)} w=${Math.round(box.w)}`);
      }

      // It must not swallow the hero: the h1 should stay clear of it.
      const heroTop = await page.locator("h1").first().evaluate((el) => el.getBoundingClientRect().top);
      if (box.y + box.h > heroTop) {
        notes.push(`${vp.name}: menu "${label}" bottom ${Math.round(box.y + box.h)} overlaps h1 top ${Math.round(heroTop)}`);
      }

      checked++;
      if (i === 0) {
        await page.screenshot({ path: `${OUT}/menu-${vp.name}.png` });
      }
      await page.mouse.move(vp.width / 2, vp.height - 40);
      await page.waitForTimeout(200);
    }
    if (checked) pass(`${checked} menu(s): compact, inside viewport`);
  }

  // ── 3. pricing in INR ─────────────────────────────────────────────
  await page.goto(`${BASE}/pricing`, { waitUntil: "load", timeout: 45000 });
  await page.waitForTimeout(900);

  const body = await page.locator("body").innerText();
  const rupees = body.match(/₹[\d,]+/g) ?? [];
  const dollars = body.match(/\$\s?\d/g) ?? [];

  if (!rupees.length) fail("no ₹ amounts found on /pricing");
  else pass(`pricing shows ${rupees.length} rupee amounts: ${[...new Set(rupees)].join(", ")}`);
  if (dollars.length) fail(`dollar amounts still present: ${dollars.join(", ")}`);

  // Toggle to monthly and re-read.
  const monthly = page.locator('button[aria-pressed]:has-text("monthly")');
  if (await monthly.count()) {
    await monthly.first().click();
    await page.waitForTimeout(600);
    const after = await page.locator("body").innerText();
    const r2 = after.match(/₹[\d,]+/g) ?? [];
    if ((after.match(/\$\s?\d/g) ?? []).length) fail("dollars appear after switching to monthly");
    else pass(`monthly billing also in rupees: ${[...new Set(r2)].join(", ")}`);
  }

  await page.screenshot({ path: `${OUT}/pricing-${vp.name}.png`, fullPage: false });

  // ── regressions ───────────────────────────────────────────────────
  const cls = await page.evaluate(() => window.__cls ?? 0);
  if (cls > 0.1) fail(`CLS ${cls.toFixed(4)} on /pricing`);
  else pass(`CLS ${cls.toFixed(4)}`);

  if (consoleErrors.length) fail(`console errors: ${consoleErrors.slice(0, 3).join(" | ")}`);
  else pass("no console errors");

  // Horizontal overflow.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  if (overflow > 1) fail(`horizontal overflow ${overflow}px on /pricing`);

  await context.close();
}

/* ── keyboard + a11y on the header, desktop only ──────────────────── */
console.log("\n── keyboard & accessibility ──");
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 45000 });
  await page.waitForTimeout(1200);

  // The menu trigger must be reachable and toggle aria-expanded.
  const trigger = page.locator('nav[aria-label="Main"] button[aria-expanded]').first();
  await trigger.focus();
  const focused = await page.evaluate(() => document.activeElement?.textContent?.trim());
  if (!focused) fail("could not focus the first menu trigger");

  await trigger.click();
  await page.waitForTimeout(260);
  if ((await trigger.getAttribute("aria-expanded")) !== "true") fail("aria-expanded did not become true on click");
  else pass("aria-expanded toggles on click");

  await trigger.click();
  await page.waitForTimeout(260);
  if ((await trigger.getAttribute("aria-expanded")) !== "false") fail("aria-expanded did not return to false");
  else pass("second click closes the pinned menu");

  // Escape dismisses a pinned menu.
  await trigger.click();
  await page.waitForTimeout(220);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(260);
  if ((await trigger.getAttribute("aria-expanded")) !== "false") fail("Escape did not dismiss the pinned menu");
  else pass("Escape dismisses the pinned menu");

  // A click outside dismisses it too.
  await trigger.click();
  await page.waitForTimeout(220);
  await page.mouse.click(700, 700);
  await page.waitForTimeout(260);
  if ((await trigger.getAttribute("aria-expanded")) !== "false") fail("outside click did not dismiss the pinned menu");
  else pass("outside click dismisses the pinned menu");

  // Hover alone opens, and moving away closes.
  await trigger.hover();
  await page.waitForTimeout(240);
  if ((await trigger.getAttribute("aria-expanded")) !== "true") fail("hover did not open the menu");
  await page.mouse.move(700, 760);
  await page.waitForTimeout(300);
  if ((await trigger.getAttribute("aria-expanded")) !== "false") fail("menu did not close when the pointer left");
  else pass("hover opens, pointer-out closes");

  // Landmark sanity: exactly one banner, one main.
  const landmarks = await page.evaluate(() => ({
    header: document.querySelectorAll("header").length,
    main: document.querySelectorAll("main").length,
    nav: document.querySelectorAll("nav").length,
  }));
  if (landmarks.header !== 1) fail(`expected 1 <header>, found ${landmarks.header}`);
  else pass(`landmarks: ${JSON.stringify(landmarks)}`);

  // Reduced motion must not reintroduce movement.
  await context.close();
  const rm = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const rmPage = await rm.newPage();
  await rmPage.goto(`${BASE}/`, { waitUntil: "load", timeout: 45000 });
  await rmPage.waitForTimeout(1000);
  const rmTops = [];
  for (const y of [0, 600, 1400, 0]) {
    await rmPage.evaluate((t) => window.scrollTo(0, t), y);
    await rmPage.waitForTimeout(140);
    const box = await rmPage.locator("header").first().boundingBox();
    rmTops.push(Math.round(box.y * 100) / 100);
  }
  const rmDrift = Math.max(...rmTops) - Math.min(...rmTops);
  if (rmDrift > 0.5) fail(`header moved ${rmDrift}px under reduced motion`);
  else pass(`header fixed under reduced motion (drift ${rmDrift.toFixed(2)}px)`);
  await rm.close();
}

await browser.close();

console.log(`\n${"─".repeat(60)}`);
if (notes.length) {
  console.log("Notes:");
  for (const n of notes) console.log(`  · ${n}`);
}
if (failures.length) {
  console.log(`\nFAILURES (${failures.length}):`);
  for (const f of failures) console.log(`  ✗ ${f}`);
} else {
  console.log("All checks passed.");
}
writeFileSync(`${OUT}/qa-polish.json`, JSON.stringify({ failures, notes }, null, 2));
process.exit(failures.length ? 1 : 0);
