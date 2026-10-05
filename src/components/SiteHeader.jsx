import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";

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

/**
 * Marketing site header: brand, primary nav, and auth CTAs.
 *
 * Kept separate from the dashboard chrome so the landing pages get a consistent
 * bar without inheriting the sidebar layout. "Login" is the outline variant and
 * "Register" the solid one, so the account action reads as the primary CTA.
 */
function SiteHeader() {
  const { user, profile } = useAuth();

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link
          to="/"
          aria-label="MentorMatch home"
          className="site-brand"
        >
          {/* Mark + live text rather than the horizontal lockup image: the
              wordmark in the artwork is only ~5px tall at header scale. The
              green is the darker text-safe step of the artwork hue because
              #0ac27f only reaches 2.32:1 on white. */}
          <Logo variant="mark" height={38} />
          <span className="site-brand-word">
            Mentor<span className="site-brand-accent">Match</span>
          </span>
        </Link>

        <nav className="site-nav" aria-label="Primary">
          {NAV_LINKS.map((link) =>
            // Hash links are plain Links: NavLink derives its active state from
            // the pathname, so every "/#..." entry would light up as active on
            // the home page.
            link.isHash ? (
              <Link key={link.label} to={link.to} className="site-nav-link">
                {link.label}
              </Link>
            ) : (
              <NavLink
                key={link.label}
                to={link.to}
                className={({ isActive }) =>
                  isActive ? "site-nav-link is-active" : "site-nav-link"
                }
              >
                {link.label}
              </NavLink>
            )
          )}
        </nav>

        <div className="site-header-actions">
          {!user ? (
            <>
              <Link to="/login" className="btn btn-ghost-light">
                Login
              </Link>
              <Link to="/register" className="btn btn-primary">
                Register
              </Link>
            </>
          ) : (
            <>
              <Link to="/browse-mentors" className="btn btn-ghost-light">
                Browse Mentors
              </Link>
              <Link
                to={dashboardPathFor(profile?.role)}
                className="btn btn-primary"
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