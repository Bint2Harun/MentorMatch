import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";
import { btnOutline, btnPrimary } from "./marketing-ui";

const NAV_LINKS = [
  { to: "/browse-mentors", label: "Browse Mentors" },
  { to: "/#how-it-works", label: "How It Works", isHash: true },
  { to: "/#about", label: "About Us", isHash: true },
  { to: "/faq", label: "Pricing/FAQ" },
];

function dashboardPathFor(role) {
  if (role === "Student") return "/student-dashboard";
  if (role === "Mentor") return "/mentor-dashboard";
  return "/admin-dashboard";
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
 * avatar button opens the profile menu for signed-in users. "Browse Mentors"
 * lives only in the primary nav, never duplicated in this group.
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

function SiteHeader() {
  const { user, profile, signOut } = useAuth();
  const [dark, setDark] = useState(initialTheme);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Mirror the resolved theme onto <html>, which is where the CSS custom
  // variant reads it from. DOM sync only; no state to set here.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

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

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
  };

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
      {/* flex-wrap is load-bearing: the nav is `basis-full` so it drops onto its
          own row below ~980px. Without wrapping, a full-basis child stays on the
          same line and pushes the page wider than the viewport. */}
      <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3.5">
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

        <nav
          aria-label="Primary"
          /* basis-full drops the nav onto its own line below `lg`; `min-w-0`
             lets the row shrink inside it so long labels scroll rather than
             widen the document. */
          className="order-last -mx-1 flex w-full min-w-0 basis-full gap-1 overflow-x-auto px-1 lg:order-none lg:mx-0 lg:w-auto lg:basis-auto lg:overflow-visible lg:px-0"
        >
          {NAV_LINKS.map((link) =>
            // Hash links are plain Links: NavLink derives its active state from
            // the pathname, so every "/#..." entry would light up as active on
            // the home page.
            link.isHash ? (
              <Link
                key={link.label}
                to={link.to}
                className="rounded-lg px-3 py-2 text-[0.95rem] font-semibold whitespace-nowrap text-ink-500 no-underline transition-colors hover:bg-[var(--surface-muted)] hover:text-ink-900 dark:text-ink-300 dark:hover:text-ink-50"
              >
                {link.label}
              </Link>
            ) : (
              <NavLink
                key={link.label}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-[0.95rem] font-semibold whitespace-nowrap no-underline transition-colors hover:bg-[var(--surface-muted)] hover:text-ink-900 dark:hover:text-ink-50 ${
                    isActive
                      ? "text-brand-600 dark:text-brand-400"
                      : "text-ink-500 dark:text-ink-300"
                  }`
                }
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
            aria-label={
              dark ? "Switch to light theme" : "Switch to dark theme"
            }
            title={dark ? "Switch to light theme" : "Switch to dark theme"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--hairline)] bg-[var(--surface)] text-ink-600 transition-colors hover:bg-[var(--surface-muted)] hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:text-ink-300 dark:hover:text-ink-50"
          >
            {dark ? (
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
            )}
          </button>

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

              <Link
                to={dashboardPathFor(profile?.role)}
                className={btnPrimary}
              >
                Dashboard
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default SiteHeader;
