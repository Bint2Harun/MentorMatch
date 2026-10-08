import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";
import { btnOutline, btnPrimary } from "./marketing-ui";
import { ROLE_HOME } from "../types";

const NAV_LINKS = [
  { to: "/browse-mentors", label: "Browse Mentors" },
  { to: "/#how-it-works", label: "How It Works", isHash: true },
  { to: "/#about", label: "About Us", isHash: true },
  { to: "/faq", label: "Pricing/FAQ" },
];

function dashboardPathFor(role) {
  return ROLE_HOME[role] || "/";
}

/** Secondary destinations surfaced inside the avatar/profile menu. */
function menuLinksFor(role) {
  if (role === "Student") {
    return [
      { to: "/student-bookings", label: "My Bookings" },
      { to: "/browse-mentors", label: "Find Mentors" },
    ];
  }

  if (role === "Mentor") {
    return [
      { to: "/mentor-bookings", label: "Manage Bookings" },
      { to: "/mentor-availability", label: "Availability" },
    ];
  }

  if (role === "Administrator") {
    return [{ to: "/admin-categories", label: "Expertise Categories" }];
  }

  return [];
}

function initialsFor(profile, user) {
  const source = profile?.full_name || user?.email || "";
  return (
    source
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

/**
 * Marketing site header: brand, primary nav, auth CTAs and theme toggle.
 *
 * Kept separate from the dashboard chrome so the landing pages get a consistent
 * bar without inheriting the sidebar layout. The top-right group holds exactly
 * one primary CTA: "Sign In" for guests, "Dashboard" for signed-in users. An
 * avatar button opens the profile menu for signed-in users.
 *
 * Below `md` the inline nav and auth buttons collapse into a single hamburger;
 * the drawer that opens carries the same links plus the auth actions, so
 * nothing is clipped or pushed into horizontal scrolling on narrow viewports.
 */
/**
 * Resolve the initial theme: an explicit stored choice wins, otherwise follow
 * the OS setting. Returns false if storage is unavailable (private browsing).
 *
 * Called as a lazy `useState` initializer so the very first render already has
 * the right value. That keeps the effect below free of `setState`, which would
 * otherwise trigger a second render pass purely to sync state it already has.
 */
function initialTheme() {
  try {
    const stored = window.localStorage.getItem("mentormatch-theme");

    return (
      stored === "dark" ||
      (stored !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  } catch {
    return false;
  }
}

/** Shared link style for the inline and drawer navigation links. */
const navLinkClass =
  "flex min-h-11 items-center rounded-lg px-3 py-2 text-[0.95rem] font-semibold whitespace-nowrap no-underline transition-colors hover:bg-[var(--surface-muted)] hover:text-ink-900 dark:hover:text-ink-50";

function inboxLinkClass(isActive) {
  return `${navLinkClass} ${
    isActive
      ? "text-brand-600 dark:text-brand-400"
      : "text-ink-500 dark:text-ink-300"
  }`;
}

function themeIcon({ dark }) {
  return dark ? (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20.5 14.3A8.5 8.5 0 0 1 9.7 3.5a8.5 8.5 0 1 0 10.8 10.8Z" />
    </svg>
  );
}

function SiteHeader() {
  const { user, profile, signOut } = useAuth();
  const { pathname, hash } = useLocation();
  const [dark, setDark] = useState(initialTheme);
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const menuRef = useRef(null);
  const navRef = useRef(null);
  const navToggleRef = useRef(null);

  // Mirror the resolved theme onto <html>, which is where the CSS custom
  // variant reads it from. DOM sync only; no state to set here.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Route changes dismiss both overlays. Adjusted during render rather than in
  // an effect: the state is derived from the location, so a second render pass
  // would only exist to sync state React already has (react-hooks rule).
  const locationKey = `${pathname}${hash}`;
  const [prevLocationKey, setPrevLocationKey] = useState(locationKey);
  if (prevLocationKey !== locationKey) {
    setPrevLocationKey(locationKey);
    setMenuOpen(false);
    setNavOpen(false);
  }

  // Close the profile menu on outside clicks and on Escape, so keyboard users
  // are never trapped behind an open menu.
  useEffect(() => {
    if (!menuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  // Same for the mobile drawer: dismiss on outside pointer or Escape.
  useEffect(() => {
    if (!navOpen) return undefined;

    const handlePointerDown = (event) => {
      // The toggle button sits outside the drawer; ignoring it keeps the click
      // handler (which flips the state) from racing this close and reopening.
      if (
        navRef.current &&
        !navRef.current.contains(event.target) &&
        navToggleRef.current &&
        !navToggleRef.current.contains(event.target)
      ) {
        setNavOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setNavOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [navOpen]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    setNavOpen(false);
    await signOut();
  };

  /** Drawer links dismiss the sheet immediately; hash links can leave the
      location untouched (already on that hash), so route tracking alone is not
      enough to close it. */
  const closeNav = () => setNavOpen(false);

  const toggleTheme = () => {
    const next = !dark;

    document.documentElement.classList.toggle("dark", next);
    setDark(next);

    try {
      window.localStorage.setItem("mentormatch-theme", next ? "dark" : "light");
    } catch {
      // Private browsing: the toggle still works for this page view.
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--hairline)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-5">
        <Link
          to="/"
          aria-label="MentorMatch home"
          className="flex shrink-0 items-center gap-2.5 no-underline"
        >
          {/* Mark + live text rather than the horizontal lockup image: the
              wordmark in the artwork is only ~5px tall at header scale. The
              green is the darker text-safe step of the artwork hue because
              #0ac27f only reaches 2.32:1 on white. */}
          <Logo variant="mark" height={38} />
          <span className="text-[1.4rem] leading-none font-black tracking-[-0.035em] text-ink-900 dark:text-white sm:text-[1.55rem]">
            Mentor<span className="text-brand-600 dark:text-brand-400">Match</span>
          </span>
        </Link>

        {/* Inline primary nav. On md-lg it drops to its own full-width row
            (no horizontal scrolling: links wrap rather than clip), and from lg
            up it sits inline next to the logo and actions. */}
        <nav
          aria-label="Primary"
          className="order-last hidden w-full min-w-0 basis-full flex-wrap gap-1 px-0 md:flex lg:order-none lg:w-auto lg:basis-auto"
        >
          {NAV_LINKS.map((link) =>
            // Hash links are plain Links: NavLink derives its active state from
            // the pathname, so every "/#..." entry would light up as active on
            // the home page.
            link.isHash ? (
              <Link key={link.label} to={link.to} className={inboxLinkClass(false)}>
                {link.label}
              </Link>
            ) : (
              <NavLink
                key={link.label}
                to={link.to}
                className={({ isActive }) => inboxLinkClass(isActive)}
              >
                {link.label}
              </NavLink>
            )
          )}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-pressed={dark}
            aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
            title={dark ? "Switch to light theme" : "Switch to dark theme"}
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--hairline)] bg-[var(--surface)] text-ink-600 transition-colors hover:bg-[var(--surface-muted)] hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 md:inline-flex dark:text-ink-300 dark:hover:text-ink-50"
          >
            {themeIcon({ dark })}
          </button>

          <div className="hidden items-center gap-2 md:flex">
            {!user ? (
              /* Guests: one primary CTA (Sign In) plus a secondary Register. */
              <>
                <Link to="/login" className={btnPrimary}>
                  Sign In
                </Link>
                <Link to="/register" className={btnOutline}>
                  Register
                </Link>
              </>
            ) : (
              /* Signed in: avatar/profile menu plus the single Dashboard CTA.
                 "Browse Mentors" is intentionally not duplicated here — it lives
                 in the primary nav only. */
              <>
                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setMenuOpen((open) => !open)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    aria-controls="profile-menu"
                    aria-label="Open account menu"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--hairline)] bg-brand-700 text-[0.82rem] font-black text-white transition-colors hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                  >
                    {initialsFor(profile, user)}
                  </button>

                  {menuOpen && (
                    <div
                      id="profile-menu"
                      role="menu"
                      className="absolute right-0 top-full z-50 mt-2 w-60 rounded-xl border border-[var(--hairline)] bg-[var(--surface)] p-1.5 shadow-[0_14px_40px_rgba(11,28,50,0.18)]"
                    >
                      <div className="mb-1 border-b border-[var(--hairline)] px-3 pt-1.5 pb-2.5">
                        <p className="truncate text-[0.92rem] font-bold text-ink-900 dark:text-white">
                          {profile?.full_name || user.email || "Account"}
                        </p>
                        <p className="truncate text-[0.8rem] text-ink-500 dark:text-ink-400">
                          {[profile?.role, user.email]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>

                      {menuLinksFor(profile?.role).map((link) => (
                        <Link
                          key={link.to}
                          to={link.to}
                          role="menuitem"
                          onClick={() => setMenuOpen(false)}
                          className="block rounded-lg px-3 py-2 text-[0.9rem] font-semibold text-ink-700 no-underline transition-colors hover:bg-[var(--surface-muted)] hover:text-ink-900 dark:text-ink-200 dark:hover:text-white"
                        >
                          {link.label}
                        </Link>
                      ))}

                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleSignOut}
                        className="block w-full rounded-lg px-3 py-2 text-left text-[0.9rem] font-semibold text-ink-700 transition-colors hover:bg-[var(--surface-muted)] hover:text-ink-900 dark:text-ink-200 dark:hover:text-white"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>

                <Link to={dashboardPathFor(profile?.role)} className={btnPrimary}>
                  Dashboard
                </Link>
              </>
            )}
          </div>

          {/* Mobile: a single, labelled hamburger. Everything else lives in the
              drawer below so the bar never clips or scrolls. */}
          <button
            type="button"
            ref={navToggleRef}
            onClick={() => setNavOpen((open) => !open)}
            aria-label="Toggle navigation"
            aria-expanded={navOpen}
            aria-controls="mobile-nav"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--hairline)] bg-[var(--surface)] text-ink-700 transition-colors hover:bg-[var(--surface-muted)] hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 md:hidden dark:text-ink-200 dark:hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              width={20}
              height={20}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              aria-hidden="true"
              focusable="false"
            >
              {navOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer: links first, then a divider, then the auth
          actions (inverted hierarchy: Register is the solid primary, Sign In the
          outlined secondary). Reuses the surface so it reads as one sheet. */}
      {navOpen && (
        <div
          id="mobile-nav"
          ref={navRef}
          className="border-t border-[var(--hairline)] bg-[var(--surface)] shadow-[0_18px_40px_rgba(11,28,50,0.16)] md:hidden"
        >
          <nav
            aria-label="Mobile"
            className="mx-auto flex w-full max-w-[1180px] flex-col px-4 py-3 sm:px-5"
          >
            {NAV_LINKS.map((link) =>
              link.isHash ? (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={closeNav}
                  className={inboxLinkClass(false)}
                >
                  {link.label}
                </Link>
              ) : (
                <NavLink
                  key={link.label}
                  to={link.to}
                  onClick={closeNav}
                  className={({ isActive }) => inboxLinkClass(isActive)}
                >
                  {link.label}
                </NavLink>
              )
            )}

            <div className="mt-2 flex flex-col gap-2 border-t border-[var(--hairline)] pt-3">
              {!user ? (
                <>
                  <Link
                    to="/login"
                    onClick={closeNav}
                    className={`${btnOutline} w-full min-h-11 whitespace-nowrap`}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={closeNav}
                    className={`${btnPrimary} w-full min-h-11 whitespace-nowrap`}
                  >
                    Register
                  </Link>
                </>
              ) : (
                <>
                  {menuLinksFor(profile?.role).map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={closeNav}
                      className={`${btnOutline} w-full min-h-11 whitespace-nowrap`}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <Link
                    to={dashboardPathFor(profile?.role)}
                    onClick={closeNav}
                    className={`${btnPrimary} w-full min-h-11 whitespace-nowrap`}
                  >
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className={`${btnOutline} w-full min-h-11 whitespace-nowrap`}
                  >
                    Sign out
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--hairline)] bg-[var(--surface)] px-4 py-2 text-[0.95rem] font-semibold whitespace-nowrap text-ink-700 transition-colors hover:bg-[var(--surface-muted)] hover:text-ink-900 dark:text-ink-200 dark:hover:text-white"
              >
                {themeIcon({ dark })}
                {dark ? "Switch to light theme" : "Switch to dark theme"}
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

export default SiteHeader;