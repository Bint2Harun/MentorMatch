/**
 * Role suite: Student, Mentor and Administrator through the auth surface.
 *
 * Seeds a Supabase session into localStorage under the key supabase-js derives
 * from the project ref, stubs every REST/auth call, then checks the route
 * matrix from src/App.jsx, the signed-in header, the mobile drawer per role and
 * the sign-out round trip.
 *
 *   npm run verify:roles
 */
import {
  BASE_URL,
  STORAGE_KEY,
  assertServerUp,
  check,
  launch,
  report,
  sleep,
  stubSupabase,
} from "./verify-lib.mjs";

const USERS = {
  Student: {
    id: "00000000-0000-4000-8000-000000000001",
    email: "student@mentormatch.test",
    full_name: "Test Student",
    initials: "TS",
    drawerLinks: ["My Bookings", "Find Mentors"],
    dashboard: "/student-dashboard",
    heading: "Student Dashboard",
  },
  Mentor: {
    id: "00000000-0000-4000-8000-000000000002",
    email: "mentor@mentormatch.test",
    full_name: "Test Mentor",
    initials: "TM",
    drawerLinks: ["Manage Bookings", "Availability"],
    dashboard: "/mentor-dashboard",
    heading: "Mentor Dashboard",
  },
  Administrator: {
    id: "00000000-0000-4000-8000-000000000003",
    email: "my1onlinestores@gmail.com",
    full_name: "Test Admin",
    initials: "TA",
    drawerLinks: ["Expertise Categories"],
    dashboard: "/admin-dashboard",
    heading: "Admin Dashboard",
  },
};

/** Route access matrix, transcribed from the allowedRoles in src/App.jsx. */
const MATRIX = [
  { route: "/admin-dashboard", marker: "Admin Dashboard", roles: ["Administrator"] },
  { route: "/mentor-dashboard", marker: "Mentor Dashboard", roles: ["Mentor"] },
  { route: "/student-dashboard", marker: "Student Dashboard", roles: ["Student"] },
  {
    route: "/browse-mentors",
    marker: "Browse Mentors",
    roles: ["Student", "Mentor", "Administrator"],
  },
  { route: "/mentor-availability", marker: "Weekly Hours", roles: ["Mentor"] },
  { route: "/mentor-bookings", marker: "Manage Bookings", roles: ["Mentor"] },
  { route: "/student-bookings", marker: "My Bookings", roles: ["Student"] },
  { route: "/mentor-edit-profile", marker: "Edit Profile", roles: ["Mentor"] },
  { route: "/apply-mentor", marker: "Apply to Become a Mentor", roles: ["Student"] },
  { route: "/admin-categories", marker: "Manage Expertise Categories", roles: ["Administrator"] },
];

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");

function makeJwt(user) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64({ alg: "HS256", typ: "JWT" });
  const payload = b64({
    sub: user.id,
    aud: "authenticated",
    role: "authenticated",
    email: user.email,
    exp: now + 60 * 60 * 12,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { full_name: user.full_name },
    iat: now,
    session_id: "stub-session",
  });
  return `${header}.${payload}.stub-signature`;
}

function userObject(role) {
  const u = USERS[role];
  const now = new Date().toISOString();
  return {
    id: u.id,
    aud: "authenticated",
    role: "authenticated",
    email: u.email,
    email_confirmed_at: now,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { full_name: u.full_name },
    created_at: now,
    updated_at: now,
  };
}

function sessionFor(role) {
  const user = userObject(role);
  return {
    access_token: makeJwt(user),
    refresh_token: `refresh-${role.toLowerCase()}`,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 12,
    expires_in: 43200,
    token_type: "bearer",
    user,
  };
}

function profileRow(role) {
  const u = USERS[role];
  return {
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    role,
    avatar_url: null,
    bio: null,
    headline: null,
    created_at: new Date().toISOString(),
  };
}

function mentorRow() {
  const u = USERS.Mentor;
  return {
    id: u.id,
    bio: "Stub mentor bio",
    skills: ["JavaScript", "SQL"],
    is_approved: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    timezone: "UTC",
    buffer_minutes: 15,
  };
}

async function seedSession(page, role) {
  await page.evaluateOnNewDocument((key, sessionJson) => {
    window.localStorage.setItem(key, sessionJson);
    window.localStorage.setItem(
      `${key}-user`,
      JSON.stringify({ user: JSON.parse(sessionJson).user })
    );
  }, STORAGE_KEY, JSON.stringify(sessionFor(role)));
}

async function prepare(page, role) {
  await seedSession(page, role);
  await stubSupabase(page, {
    profile: profileRow(role),
    mentorProfiles: { [USERS.Mentor.id]: mentorRow() },
  });
}

await assertServerUp();
const browser = await launch();

for (const role of Object.keys(USERS)) {
  const u = USERS[role];

  /* ---------------------------------------------------- access matrix */
  const access = await browser.newPage();
  await access.setViewport({ width: 1280, height: 900 });
  await prepare(access, role);

  await access.goto(`${BASE_URL}/login?redirectTo=%2Fstudent-dashboard`, {
    waitUntil: "networkidle2",
    timeout: 30000,
  });
  await access
    .waitForFunction(
      (path) => location.pathname === path,
      { timeout: 15000 },
      u.dashboard
    )
    .catch(() => {});
  check(
    `[${role}] student dashboard return URL respects role`,
    (await access.evaluate(() => location.pathname)) === u.dashboard,
    `path=${await access.evaluate(() => location.pathname)}`
  );

  for (const row of MATRIX) {
    const allowed = row.roles.includes(role);
    await access.goto(`${BASE_URL}${row.route}`, { waitUntil: "networkidle2", timeout: 30000 });
    await access
      .waitForFunction(
        (marker) => {
          const t = document.body.innerText || "";
          return location.pathname === "/" || t.includes(marker);
        },
        { timeout: 15000 },
        row.marker
      )
      .catch(() => {});
    await sleep(350);

    const state = await access.evaluate(() => ({
      path: location.pathname,
      text: (document.body.innerText || "").slice(0, 4000),
    }));

    if (allowed) {
      check(`[${role}] ${row.route} stays on route`, state.path === row.route, `path=${state.path}`);
      check(
        `[${role}] ${row.route} renders`,
        state.text.includes(row.marker),
        `missing "${row.marker}"`
      );
    } else {
      check(`[${role}] ${row.route} denied -> /`, state.path === "/", `path=${state.path}`);
    }
  }

  /* ------------------------------------- overflow + sidebar identity */
  for (const width of [360, 768, 1280]) {
    await access.setViewport({ width, height: 900, isMobile: width < 768 });
    await access.goto(`${BASE_URL}${u.dashboard}`, { waitUntil: "networkidle2", timeout: 30000 });
    await access
      .waitForFunction(
        (marker) => (document.body.innerText || "").includes(marker),
        { timeout: 15000 },
        u.heading
      )
      .catch(() => {});
    await sleep(350);

    const probe = await access.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      inner: window.innerWidth,
      name: document.querySelector(".dashboard-user-name")?.textContent?.trim(),
      who: document.querySelector(".dashboard-user-role")?.textContent?.trim(),
    }));
    check(
      `[${role}] dashboard w=${width} no overflow`,
      probe.scroll <= probe.inner + 1,
      `scroll=${probe.scroll} inner=${probe.inner}`
    );
    check(
      `[${role}] dashboard w=${width} sidebar shows profile`,
      probe.name === u.full_name && probe.who === role,
      `name=${probe.name} role=${probe.who}`
    );
  }
  await access.close();

  /* --------------------------------------- signed-in header + drawer */
  const chrome = await browser.newPage();
  await chrome.setViewport({ width: 1280, height: 900 });
  await prepare(chrome, role);
  await chrome.goto(`${BASE_URL}/`, { waitUntil: "networkidle2", timeout: 30000 });
  await chrome
    .waitForSelector('button[aria-label="Open account menu"]', { timeout: 15000 })
    .catch(() => {});
  await sleep(350);

  const bar = await chrome.evaluate(() => {
    const header = document.querySelector("header");
    const avatar = document.querySelector('button[aria-label="Open account menu"]');
    return {
      text: (header?.innerText || "").replace(/\s+/g, " "),
      avatar: !!avatar,
      avatarText: avatar?.textContent?.trim(),
      hamburger: (() => {
        const b = document.querySelector('button[aria-label="Toggle navigation"]');
        return !!b && b.offsetParent !== null;
      })(),
      hasDashboard: /Dashboard/.test(header?.innerText || ""),
    };
  });
  check(`[${role}] header shows avatar`, bar.avatar, JSON.stringify(bar));
  check(`[${role}] header avatar initials`, bar.avatarText === u.initials, `got=${bar.avatarText}`);
  check(`[${role}] header shows Dashboard CTA`, bar.hasDashboard);
  check(`[${role}] header hides Sign In`, !/\bSign In\b/.test(bar.text), bar.text);
  check(`[${role}] header hides Register`, !/\bRegister\b/.test(bar.text), bar.text);
  check(`[${role}] hamburger hidden on desktop`, !bar.hamburger);

  // Mobile drawer
  await chrome.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await chrome.reload({ waitUntil: "networkidle2" });
  await sleep(350);
  await chrome.click('button[aria-label="Toggle navigation"]');
  await sleep(250);

  const drawer = await chrome.evaluate(() => {
    const d = document.getElementById("mobile-nav");
    if (!d) return null;
    const labels = [...d.querySelectorAll("a, button")].map((el) =>
      (el.textContent || "").trim().replace(/\s+/g, " ")
    );
    const r = d.getBoundingClientRect();
    return {
      labels,
      rect: { l: Math.round(r.left), r: Math.round(r.right) },
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      expanded: document
        .querySelector('button[aria-label="Toggle navigation"]')
        ?.getAttribute("aria-expanded"),
    };
  });
  check(`[${role}] drawer opens`, !!drawer);
  if (drawer) {
    check(
      `[${role}] drawer role links`,
      u.drawerLinks.every((l) => drawer.labels.includes(l)),
      drawer.labels.join(" / ")
    );
    check(`[${role}] drawer Dashboard link`, drawer.labels.includes("Dashboard"));
    check(`[${role}] drawer Sign out`, drawer.labels.includes("Sign out"));
    check(
      `[${role}] drawer theme toggle`,
      drawer.labels.some((l) => /switch to (light|dark) theme/i.test(l)),
      drawer.labels.join(" / ")
    );
    check(
      `[${role}] drawer hides guest CTAs`,
      !drawer.labels.includes("Sign In") && !drawer.labels.includes("Register"),
      drawer.labels.join(" / ")
    );
    check(
      `[${role}] drawer within viewport`,
      drawer.rect.l >= -1 && drawer.rect.r <= 391,
      JSON.stringify(drawer.rect)
    );
    check(`[${role}] drawer adds no overflow`, drawer.overflow <= 1, `excess=${drawer.overflow}`);
    check(`[${role}] aria-expanded`, drawer.expanded === "true");

    // Sign out from the drawer must restore the guest header.
    const signOut = await chrome.evaluate(() => {
      const btn = [...document.querySelectorAll("#mobile-nav button")].find(
        (b) => (b.textContent || "").trim() === "Sign out"
      );
      if (!btn) return false;
      btn.click();
      return true;
    });
    check(`[${role}] Sign out control found`, signOut);
    await sleep(700);

    const closed = await chrome.evaluate((key) => ({
      drawerGone: !document.getElementById("mobile-nav"),
      avatar: !!document.querySelector('button[aria-label="Open account menu"]'),
      stored: window.localStorage.getItem(key),
    }), STORAGE_KEY);
    check(`[${role}] drawer closed after Sign out`, closed.drawerGone);
    check(`[${role}] avatar gone after Sign out`, !closed.avatar);
    check(`[${role}] session cleared after Sign out`, closed.stored === null,
      `stored=${closed.stored}`);

    // Guest state on mobile: the CTAs live in the drawer, so reopen it.
    await chrome.click('button[aria-label="Toggle navigation"]');
    await sleep(250);
    const guest = await chrome.evaluate(() => {
      const d = document.getElementById("mobile-nav");
      if (!d) return null;
      return [...d.querySelectorAll("a, button")].map((el) =>
        (el.textContent || "").trim().replace(/\s+/g, " ")
      );
    });
    check(
      `[${role}] guest drawer shows Sign In + Register`,
      !!guest && guest.includes("Sign In") && guest.includes("Register"),
      (guest || []).join(" / ")
    );
    check(
      `[${role}] guest drawer drops account links`,
      !!guest && !guest.includes("Dashboard") && !guest.includes("Sign out"),
      (guest || []).join(" / ")
    );
  }

  await chrome.close();
}

await browser.close();
process.exit(report("verify-roles"));
