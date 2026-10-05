import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

/**
 * Chrome shared by every public marketing page.
 *
 * Also handles in-page hash targets ("/#how-it-works"). React Router changes
 * the hash without scrolling, so without this the nav appears to do nothing
 * when you are already on the home page. The retry on the next frame covers
 * content that mounts after the navigation commits.
 */
function MarketingLayout() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) return;

    let frame = 0;
    let attempts = 0;

    const scrollToTarget = () => {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      // Target may not be painted yet (e.g. navigating in from another page).
      if (attempts < 10) {
        attempts += 1;
        frame = requestAnimationFrame(scrollToTarget);
      }
    };

    scrollToTarget();
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);

  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="site-main">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}

export default MarketingLayout;