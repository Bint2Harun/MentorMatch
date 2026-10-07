/**
 * Header suite: the marketing header at ten widths, from 320px up.
 *
 * Asserts the things that were broken before the mobile-header rework: no
 * horizontal overflow, no clipped header row, no scrolling nav container, a
 * drawer that carries the links plus the auth actions, and 44px targets.
 *
 *   npm run verify:header
 */
import {
  BASE_URL,
  assertServerUp,
  check,
  launch,
  report,
  sleep,
  stubSupabase,
} from "./verify-lib.mjs";

const widths = [320, 360, 390, 414, 640, 767, 768, 820, 1024, 1280];

await assertServerUp();
const browser = await launch();

for (const width of widths) {
  const page = await browser.newPage();
  await page.setViewport({
    width,
    height: 800,
    isMobile: width < 768,
    hasTouch: width < 768,
  });
  await stubSupabase(page);
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle2", timeout: 30000 });
  await sleep(250);

  const probe = await page.evaluate(() => {
    const visible = (el) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return (
        r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none"
      );
    };
    const doc = document.documentElement;
    const over = [];
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (getComputedStyle(el).position === "fixed") continue;
      if (r.right > window.innerWidth + 1 || r.left < -1) {
        over.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`);
      }
    }
    const input = document.querySelector('input[aria-label="Search mentors"]');
    const chip = document.querySelector('[aria-label="Popular searches"] button');
    const primaryNav = document.querySelector('nav[aria-label="Primary"]');
    const headerRow = document.querySelector("header > div");
    return {
      scrollWidth: doc.scrollWidth,
      innerWidth: window.innerWidth,
      overflow: over.slice(0, 4),
      hamburger: visible(document.querySelector('button[aria-label="Toggle navigation"]')),
      primaryNav: visible(primaryNav),
      primaryNavScrolls: primaryNav
        ? primaryNav.scrollWidth > primaryNav.clientWidth + 1
        : false,
      themeInBar: [...document.querySelectorAll("header button")].some(
        (b) =>
          /theme/i.test(b.getAttribute("aria-label") || "") && b.offsetParent !== null
      ),
      searchInView: input ? input.getBoundingClientRect().bottom <= window.innerHeight : false,
      searchTop: input ? Math.round(input.getBoundingClientRect().top) : null,
      chipH: chip ? Math.round(chip.getBoundingClientRect().height) : 0,
      headerClipped: headerRow ? headerRow.scrollWidth > headerRow.clientWidth + 1 : false,
      headerRowRect: headerRow
        ? {
            l: Math.round(headerRow.getBoundingClientRect().left),
            r: Math.round(headerRow.getBoundingClientRect().right),
          }
        : null,
    };
  });

  const tag = `w=${width}`;
  check(
    `${tag} no horizontal overflow`,
    probe.scrollWidth <= probe.innerWidth + 1,
    `scrollWidth=${probe.scrollWidth} inner=${probe.innerWidth} :: ${probe.overflow.join(" | ")}`
  );
  check(`${tag} header row not clipped`, !probe.headerClipped, JSON.stringify(probe.headerRowRect));
  check(`${tag} nav links do not scroll`, !probe.primaryNavScrolls);
  check(`${tag} search input inside first viewport`, probe.searchInView, `top=${probe.searchTop}`);
  check(`${tag} chip >= 44px tall`, probe.chipH >= 44, `h=${probe.chipH}`);

  if (width < 768) {
    check(`${tag} hamburger shown`, probe.hamburger);
    check(`${tag} primary nav hidden`, !probe.primaryNav);
    check(`${tag} theme toggle not in bar`, !probe.themeInBar);

    await page.click('button[aria-label="Toggle navigation"]');
    await sleep(200);
    const drawer = await page.evaluate(() => {
      const d = document.getElementById("mobile-nav");
      if (!d) return null;
      const r = d.getBoundingClientRect();
      const labels = [...d.querySelectorAll("a, button")].map((el) =>
        (el.textContent || "").trim().replace(/\s+/g, " ")
      );
      const heights = [...d.querySelectorAll("a, button")].map((el) =>
        Math.round(el.getBoundingClientRect().height)
      );
      return {
        rect: { l: Math.round(r.left), r: Math.round(r.right) },
        scrollWidth: d.scrollWidth,
        clientWidth: d.clientWidth,
        labels,
        labelsLc: labels.map((l) => l.toLowerCase()),
        minH: Math.min(...heights),
        expanded: document
          .querySelector('button[aria-label="Toggle navigation"]')
          ?.getAttribute("aria-expanded"),
      };
    });
    check(`${tag} drawer opens`, !!drawer);
    if (drawer) {
      check(
        `${tag} drawer within viewport`,
        drawer.rect.l >= -1 && drawer.rect.r <= width + 1,
        JSON.stringify(drawer.rect)
      );
      check(`${tag} drawer no inner scroll`, drawer.scrollWidth <= drawer.clientWidth + 1);
      check(
        `${tag} drawer has 4 nav links`,
        ["Browse Mentors", "How It Works", "About Us", "Pricing/FAQ"].every((l) =>
          drawer.labels.includes(l)
        ),
        drawer.labels.join(" / ")
      );
      check(
        `${tag} drawer has Sign In + Register`,
        drawer.labels.includes("Sign In") && drawer.labels.includes("Register")
      );
      check(
        `${tag} drawer has labelled theme toggle`,
        drawer.labelsLc.some((l) => /switch to (light|dark) theme/.test(l)),
        drawer.labelsLc.join(" / ")
      );
      check(`${tag} aria-expanded=true`, drawer.expanded === "true");
      check(`${tag} drawer targets >= 44px`, drawer.minH >= 44, `min=${drawer.minH}`);

      const openOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      check(`${tag} opening drawer adds no page overflow`, openOverflow <= 1, `excess=${openOverflow}`);

      await page.keyboard.press("Escape");
      await sleep(150);
      const closed = await page.evaluate(() => !document.getElementById("mobile-nav"));
      check(`${tag} Escape closes drawer`, closed);
    }
  } else {
    check(`${tag} hamburger hidden`, !probe.hamburger);
    check(`${tag} primary nav shown`, probe.primaryNav);
    check(`${tag} theme toggle in bar`, probe.themeInBar);
    const barCtas = await page.evaluate(() =>
      [...document.querySelectorAll("header a, header button")]
        .filter((el) => el.offsetParent !== null)
        .map((el) => (el.textContent || "").trim())
    );
    check(`${tag} Sign In visible in bar`, barCtas.includes("Sign In"), barCtas.join("/"));
    check(`${tag} Register visible in bar`, barCtas.includes("Register"), barCtas.join("/"));
  }

  await page.close();
}

await browser.close();
process.exit(report("verify-header"));
