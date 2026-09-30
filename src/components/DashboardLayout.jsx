import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function DashboardLayout({ children, title, subtitle, navigation = [] }) {
  const { profile } = useAuth();
  const location = useLocation();

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <span className="brand-light">Mentor</span>
          <span className="brand-green">Match</span>
        </div>

        <nav className="dashboard-navigation">
          {navigation.map((item) => {
            const isActive =
              location.pathname === item.path ||
              location.pathname.startsWith(`${item.path}/`);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`dashboard-nav-link ${
                  isActive ? "dashboard-nav-link-active" : ""
                }`}
              >
                <span className="dashboard-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="dashboard-sidebar-bottom">
          <div className="dashboard-user">
            <div className="dashboard-user-avatar">
              {(profile?.full_name || "User")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <div className="dashboard-user-name">
                {profile?.full_name || "User"}
              </div>
              <div className="dashboard-user-role">
                {profile?.role || "Member"}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <h1 className="dashboard-title">{title}</h1>
            {subtitle && <p className="dashboard-subtitle">{subtitle}</p>}
          </div>

          <div className="dashboard-topbar-actions">
            <button className="dashboard-icon-button" title="Notifications">
              🔔
            </button>
            <div className="dashboard-topbar-avatar">
              {(profile?.full_name || "U").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <section className="dashboard-content">{children}</section>
      </main>
    </div>
  );
}

export default DashboardLayout;