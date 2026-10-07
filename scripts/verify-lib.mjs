/**
 * Shared plumbing for the browser verification suites in this folder.
 *
 * Every suite drives a real Chrome through puppeteer-core against a running
 * Vite server, and answers every *.supabase.co request locally so the runs are
 * hermetic: no project, no network, no seeded data.
 *
 *   npm run verify:header   header / drawer / touch targets at 10 widths
 *   npm run verify:routes   8 public routes x 6 widths x 2 themes
 *   npm run verify:roles    Student / Mentor / Administrator matrices
 *
 * Point VERIFY_BASE_URL at the server under test (default :5173).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Minimal .env reader: Vite gives `.env.local` precedence over `.env`. */
function readEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    out[line.slice(0, eq).trim()] = line
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return out;
}

const fileEnv = {
  ...readEnvFile(resolve(PROJECT_ROOT, ".env")),
  ...readEnvFile(resolve(PROJECT_ROOT, ".env.local")),
};

export const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL || "";
export const SUPABASE_HOST = SUPABASE_URL ? new URL(SUPABASE_URL).hostname : "";
/** supabase-js derives its localStorage key from the project ref. */
export const STORAGE_KEY = SUPABASE_HOST
  ? `sb-${SUPABASE_HOST.split(".")[0]}-auth-token`
  : "";
export const BASE_URL = process.env.VERIFY_BASE_URL || "http://localhost:5173";

const CHROME_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

export function findChrome() {
  const found = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!found) {
    throw new Error(
      "No Chrome/Edge found. Set PUPPETEER_EXECUTABLE_PATH to a browser binary."
    );
  }
  return found;
}

export async function launch() {
  return puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
}

/** Fails fast (instead of asserting on a blank page) when the server is down. */
export async function assertServerUp() {
  try {
    const res = await fetch(BASE_URL, { redirect: "manual" });
    if (res.status >= 500) throw new Error(`status ${res.status}`);
  } catch (err) {
    console.error(
      `Cannot reach ${BASE_URL} (${err.message}). Start the app first, e.g. "npm run dev" ` +
        `or VERIFY_BASE_URL=http://localhost:PORT npm run verify.`
    );
    process.exit(1);
  }
}

let passed = 0;
let failed = 0;

export const check = (name, ok, extra = "") => {
  if (ok) {
    passed += 1;
    return;
  }
  failed += 1;
  console.log(`FAIL  ${name}${extra ? ` ${extra}` : ""}`);
};

/** Prints the tally and returns a process exit code. */
export function report(label) {
  console.log(`\n[${label}] ${passed} passed, ${failed} failed`);
  return failed === 0 ? 0 : 1;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "access-control-allow-headers": "*",
  "access-control-expose-headers": "content-range, x-total-count",
};

/**
 * Answer every request to the Supabase project locally.
 *
 * CORS headers are load-bearing: the page runs on localhost while the stub
 * speaks for *.supabase.co, so the browser rejects replies without them (that
 * omission is what made the first role-suite run fail everywhere at once).
 *
 * `profile` is the row `/rest/v1/profiles` returns; pass null for guest runs.
 * `mentorProfiles` maps a profile id to its `mentor_profiles` row.
 */
export async function stubSupabase(page, { profile = null, mentorProfiles = {} } = {}) {
  if (!SUPABASE_HOST) {
    throw new Error("VITE_SUPABASE_URL is not set; cannot stub Supabase.");
  }

  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const url = req.url();
    if (!url.includes(SUPABASE_HOST)) return req.continue().catch(() => {});

    const accept = req.headers()["accept"] || "";
    const objectMode = String(accept).includes("vnd.pgrst.object+json");

    const respond = (body, status = 200) =>
      req
        .respond({
          status,
          contentType: status === 204 ? undefined : "application/json",
          headers: CORS_HEADERS,
          body: status === 204 ? "" : JSON.stringify(body),
        })
        .catch(() => {});

    try {
      const u = new URL(url);

      // Preflight for the POST/PUT calls (logout, rpc writes).
      if (req.method() === "OPTIONS") return respond("", 204);
      if (u.pathname.includes("/auth/v1/logout")) return respond("", 204);
      if (u.pathname.includes("/auth/v1/token"))
        return respond({ error: "invalid_grant", error_description: "stub" }, 400);
      if (u.pathname.includes("/auth/v1/user"))
        return respond(profile ?? { id: null, aud: "authenticated" });
      if (u.pathname.includes("/rest/v1/profiles"))
        return respond(objectMode ? profile : profile ? [profile] : []);
      if (u.pathname.includes("/rest/v1/mentor_profiles")) {
        const id = Object.keys(mentorProfiles).find((key) =>
          u.search.includes(`id=eq.${key}`)
        );
        const rows = id ? [mentorProfiles[id]] : [];
        return respond(objectMode ? rows[0] ?? null : rows);
      }
      return respond(objectMode ? {} : []);
    } catch {
      return respond(objectMode ? {} : []);
    }
  });
}
