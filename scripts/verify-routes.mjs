/**
 * Route suite: every public marketing route at six widths in both themes.
 *
 * Guards the two regressions that keep coming back — horizontal overflow on
 * narrow screens, and the hamburger/nav breakpoint drifting out of sync with
 * the header layout.
 *
 *   npm run verify:routes
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

const routes = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/faq",
  "/contact",
  "/privacy",
  "/terms",
];
const widths = [320, 360, 414, 768, 1024, 1440];
const themes = ["light", "dark"];

await assertServerUp();
const browser = await launch();

for (const theme of themes) {
  for (const route of routes) {
    for (const width of widths) {
      const page = await browser.newPage();
      await page.setViewport({ width, height: 800, isMobile: width < 768 });
      await page.evaluateOnNewDocument((key, value) => {
        window.localStorage.setItem(key, value);
      }, "mentormatch-theme", theme);
      await stubSupabase(page);
      await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle2", timeout: 30000 });
      await sleep(200);

      const probe = await page.evaluate(() => {
        const doc = document.documentElement;
        const over = [];
        for (const el of document.querySelectorAll("body *")) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (getComputedStyle(el).position === "fixed") continue;
          if (r.right > window.innerWidth + 1 || r.left < -1) {
            over.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 50)}`);
          }
        }
        const burger = document.querySelector('button[aria-label="Toggle navigation"]');
        return {
          scrollWidth: doc.scrollWidth,
          innerWidth: window.innerWidth,
          dark: doc.classList.contains("dark"),
          hasHeader: !!document.querySelector("header"),
          burgerVisible: !!burger && burger.offsetParent !== null,
          over: over.slice(0, 3),
        };
      });

      const tag = `[${theme}] ${route} w=${width}`;
      check(
        `${tag} no horizontal overflow`,
        probe.scrollWidth <= probe.innerWidth + 1,
        `scroll=${probe.scrollWidth} inner=${probe.innerWidth} :: ${probe.over.join(" | ")}`
      );
      check(`${tag} theme applied`, probe.dark === (theme === "dark"));
      check(`${tag} header present`, probe.hasHeader);
      check(`${tag} hamburger matches breakpoint`, probe.burgerVisible === (width < 768));

      if (width < 768) {
        await page.click('button[aria-label="Toggle navigation"]');
        await sleep(150);
        const opened = await page.evaluate(() => {
          const d = document.getElementById("mobile-nav");
          if (!d) return null;
          return {
            labels: [...d.querySelectorAll("a")].map((a) => (a.textContent || "").trim()),
            overflow: document.documentElement.scrollWidth - window.innerWidth,
          };
        });
        check(`${tag} drawer opens`, !!opened);
        if (opened) {
          check(
            `${tag} drawer has nav links`,
            opened.labels.includes("Browse Mentors") && opened.labels.includes("Pricing/FAQ"),
            opened.labels.join("/")
          );
          check(`${tag} drawer adds no overflow`, opened.overflow <= 1, `excess=${opened.overflow}`);
        }
      }

      await page.close();
    }
  }
}

await browser.close();
process.exit(report("verify-routes"));
