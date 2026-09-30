import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

function StudentDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();

  const [stats, setStats] = useState({
    totalBookings: 0,
    upcomingSessions: 0,
    completedSessions: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadStudentStats = async () => {
      if (!user) return;

      setLoadingStats(true);
      setErrorMessage("");

      const today = new Date().toISOString().split("T")[0];

      const [
        { count: totalBookings, error: totalError },
        { count: upcomingSessions, error: upcomingError },
        { count: completedSessions, error: completedError },
      ] = await Promise.all([
        supabase
          .from("mentorship_bookings")
          .select("id", { count: "exact", head: true })
          .eq("student_id", user.id),

        supabase
          .from("mentorship_bookings")
          .select("id", { count: "exact", head: true })
          .eq("student_id", user.id)
          .eq("status", "confirmed")
          .gte("scheduled_date", today),

        supabase
          .from("mentorship_bookings")
          .select("id", { count: "exact", head: true })
          .eq("student_id", user.id)
          .eq("status", "completed"),
      ]);

      if (totalError || upcomingError || completedError) {
        console.error(
          "Failed to load student dashboard statistics:",
          totalError || upcomingError || completedError
        );

        setErrorMessage(
          "Unable to load your booking statistics. Please refresh the page."
        );
        setLoadingStats(false);
        return;
      }

      setStats({
        totalBookings: totalBookings || 0,
        upcomingSessions: upcomingSessions || 0,
        completedSessions: completedSessions || 0,
      });

      setLoadingStats(false);
    };

    if (profile?.role === "Student") {
      loadStudentStats();
    }
  }, [user, profile]);

  const handleLogout = async () => {
    const { error } = await signOut();

    if (error) {
      alert(error.message);
      return;
    }

    navigate("/");
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const userInitial = (profile?.full_name || "Student")
    .charAt(0)
    .toUpperCase();

  if (profile?.role !== "Student") {
    return (
      <main className="container">
        <h1>Access Denied</h1>
        <p>You do not have permission to access the Student Dashboard.</p>
        <Link to="/">Back to Home</Link>
      </main>
    );
  }

  return (
    <div className="dashboard-page">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <span className="dashboard-brand-light">Mentor</span>
          <span className="dashboard-brand-green">Match</span>
        </div>

        <nav className="dashboard-nav">
          <Link
            to="/student-dashboard"
            className={`dashboard-nav-link ${
              isActive("/student-dashboard") ? "dashboard-nav-active" : ""
            }`}
          >
            <span className="dashboard-nav-icon">▦</span>
            Dashboard
          </Link>

          <Link
            to="/browse-mentors"
            className={`dashboard-nav-link ${
              isActive("/browse-mentors") ? "dashboard-nav-active" : ""
            }`}
          >
            <span className="dashboard-nav-icon">⌕</span>
            Browse Mentors
          </Link>

          <Link
            to="/student-bookings"
            className={`dashboard-nav-link ${
              isActive("/student-bookings") ? "dashboard-nav-active" : ""
            }`}
          >
            <span className="dashboard-nav-icon">▣</span>
            My Bookings
          </Link>

          <Link
            to="/student-availability"
            className={`dashboard-nav-link ${
              isActive("/student-availability") ? "dashboard-nav-active" : ""
            }`}
          >
            <span className="dashboard-nav-icon">◷</span>
            Availability
          </Link>

          <Link
            to="/apply-mentor"
            className={`dashboard-nav-link ${
              isActive("/apply-mentor") ? "dashboard-nav-active" : ""
            }`}
          >
            <span className="dashboard-nav-icon">♙</span>
            Become a Mentor
          </Link>

          <Link to="/" className="dashboard-nav-link">
            <span className="dashboard-nav-icon">⌂</span>
            Home
          </Link>
        </nav>

        <div className="dashboard-sidebar-bottom">
          <div className="dashboard-user-summary">
            <div className="dashboard-avatar">{userInitial}</div>

            <div>
              <div className="dashboard-user-name">
                {profile?.full_name || "Student"}
              </div>
              <div className="dashboard-user-role">Student</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="dashboard-logout-button"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1 className="dashboard-heading">Student Dashboard</h1>
            <p className="dashboard-subheading">
              Welcome back, {profile?.full_name || "Student"}.
            </p>
          </div>

          <div className="dashboard-header-avatar">{userInitial}</div>
        </header>

        <div className="dashboard-content">
          {errorMessage && (
            <div className="dashboard-error-message">
              {errorMessage}
            </div>
          )}

          {/* Statistics */}
          <section className="dashboard-stats-grid">
            <article className="dashboard-stat-card dashboard-stat-card-green">
              <div className="dashboard-stat-label">My Bookings</div>

              <div className="dashboard-stat-value">
                {loadingStats ? "—" : stats.totalBookings}
              </div>

              <div className="dashboard-stat-description">
                All booking requests you created
              </div>
            </article>

            <article className="dashboard-stat-card dashboard-stat-card-dark-green">
              <div className="dashboard-stat-label">Upcoming Sessions</div>

              <div className="dashboard-stat-value">
                {loadingStats ? "—" : stats.upcomingSessions}
              </div>

              <div className="dashboard-stat-description">
                Confirmed sessions scheduled from today
              </div>
            </article>

            <article className="dashboard-stat-card dashboard-stat-card-orange">
              <div className="dashboard-stat-label">Completed Sessions</div>

              <div className="dashboard-stat-value">
                {loadingStats ? "—" : stats.completedSessions}
              </div>

              <div className="dashboard-stat-description">
                Mentorship sessions marked completed
              </div>
            </article>

            <article className="dashboard-stat-card dashboard-stat-card-blue">
              <div className="dashboard-stat-label">Account Role</div>

              <div className="dashboard-stat-value-text">
                {profile?.role || "Student"}
              </div>

              <div className="dashboard-stat-description">
                Your current account type
              </div>
            </article>
          </section>

          {/* Account Information */}
          <section className="dashboard-panel">
            <h2 className="dashboard-panel-title">Account Information</h2>

            <div className="dashboard-account-grid">
              <div className="dashboard-info-card">
                <div className="dashboard-info-label">Full Name</div>
                <div className="dashboard-info-value">
                  {profile?.full_name || "Not available"}
                </div>
              </div>

              <div className="dashboard-info-card">
                <div className="dashboard-info-label">Email Address</div>
                <div className="dashboard-info-value">
                  {user?.email || "Not available"}
                </div>
              </div>

              <div className="dashboard-info-card">
                <div className="dashboard-info-label">Account Role</div>
                <div className="dashboard-info-value">
                  {profile?.role || "Student"}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default StudentDashboard;