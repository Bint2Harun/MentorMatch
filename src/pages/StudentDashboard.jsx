import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../hooks/useRole";
import AccessDenied from "../components/AccessDenied";
import NotificationBell from "../components/NotificationBell";
import EditProfileModal from "../components/EditProfileModal";
import RescheduleModal from "../components/RescheduleModal";
import { supabase } from "../lib/supabase";
import { friendlyBookingError } from "../lib/bookingErrors";
import {
  BOOKING_SELECT,
  mapBookingRow,
  studentStatusLabel,
  statusPillClass,
} from "../lib/bookings";
import { formatInstantRangeLocal } from "../lib/timezones";

const UPCOMING_LIMIT = 5;
const RECOMMENDED_LIMIT = 8;

function Avatar({ name, url, updatedAt, className }) {
  const src = url
    ? `${url}${url.includes("?") ? "&" : "?"}v=${encodeURIComponent(
        updatedAt || ""
      )}`
    : null;

  return (
    <div className={className}>
      {src ? (
        <img src={src} alt="" />
      ) : (
        (name || "S").charAt(0).toUpperCase()
      )}
    </div>
  );
}

function StudentDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const { loading: authLoading, profilePending, isAllowed } = useRole("Student");

  const [stats, setStats] = useState({
    totalBookings: 0,
    upcomingSessions: 0,
    completedSessions: 0,
  });
  const [counts, setCounts] = useState({ pending: 0, accepted: 0, declined: 0 });
  const [upcoming, setUpcoming] = useState([]);
  const [recommended, setRecommended] = useState([]);

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const [loadingRecommended, setLoadingRecommended] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [rescheduleBooking, setRescheduleBooking] = useState(null);

  const loadStats = useCallback(async () => {
    if (!user) return;

    setLoadingStats(true);
    setErrorMessage("");

    const today = new Date().toISOString().split("T")[0];

    const [
      { count: totalBookings, error: totalError },
      { count: upcomingSessions, error: upcomingError },
      { count: completedSessions, error: completedError },
      { count: pending, error: pendingError },
      { count: accepted, error: acceptedError },
      { count: declined, error: declinedError },
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

      supabase
        .from("mentorship_bookings")
        .select("id", { count: "exact", head: true })
        .eq("student_id", user.id)
        .eq("status", "pending"),

      supabase
        .from("mentorship_bookings")
        .select("id", { count: "exact", head: true })
        .eq("student_id", user.id)
        .eq("status", "confirmed"),

      supabase
        .from("mentorship_bookings")
        .select("id", { count: "exact", head: true })
        .eq("student_id", user.id)
        .eq("status", "cancelled")
        .eq("cancelled_by", "mentor"),
    ]);

    if (
      totalError ||
      upcomingError ||
      completedError ||
      pendingError ||
      acceptedError ||
      declinedError
    ) {
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
    setCounts({
      pending: pending || 0,
      accepted: accepted || 0,
      declined: declined || 0,
    });

    setLoadingStats(false);
  }, [user]);

  const loadUpcoming = useCallback(async () => {
    if (!user) return;

    setLoadingUpcoming(true);

    const { data, error } = await supabase
      .from("mentorship_bookings")
      .select(BOOKING_SELECT)
      .eq("student_id", user.id)
      .eq("status", "confirmed")
      .gte("scheduled_date", new Date().toISOString().split("T")[0])
      .order("starts_at", { ascending: true })
      .limit(UPCOMING_LIMIT);

    if (error) {
      setErrorMessage("Unable to load your upcoming sessions.");
      setLoadingUpcoming(false);
      return;
    }

    setUpcoming((data || []).map(mapBookingRow));
    setLoadingUpcoming(false);
  }, [user]);

  const loadRecommended = useCallback(async () => {
    setLoadingRecommended(true);
    setErrorMessage("");

    const { data, error } = await supabase.rpc("search_mentors", {
      p_faculty: null,
      p_query: null,
      p_limit: RECOMMENDED_LIMIT,
      p_offset: 0,
    });

    if (error) {
      setErrorMessage("Unable to load recommended mentors.");
      setRecommended([]);
      setLoadingRecommended(false);
      return;
    }

    setRecommended(
      (data || []).map((row) => ({
        id: row.id,
        name: row.full_name || "Mentor",
        industry: row.industry,
        yearsExperience: row.years_experience,
        skills: Array.isArray(row.skills) ? row.skills : [],
      }))
    );

    setLoadingRecommended(false);
  }, []);

  useEffect(() => {
    if (profile?.role === "Student") {
      // Standard fetch-on-mount: the loaders flip their loading flags before
      // awaiting requests, which the new rule reads as a cascading render.
      /* eslint-disable react-hooks/set-state-in-effect */
      loadStats();
      loadUpcoming();
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [profile?.role, loadStats, loadUpcoming]);

  useEffect(() => {
    if (profile?.role === "Student") {
      /* eslint-disable react-hooks/set-state-in-effect */
      loadRecommended();
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [profile?.role, loadRecommended]);

  const reloadUpcoming = async () => {
    await Promise.all([loadUpcoming(), loadStats()]);
  };

  const handleCancelBooking = async (bookingId) => {
    if (
      !window.confirm(
        "Cancel this booking request? This cannot be undone."
      )
    )
      return;

    setErrorMessage("");

    const { error } = await supabase.rpc("cancel_booking", {
      p_booking_id: bookingId,
    });

    if (error) {
      setErrorMessage(friendlyBookingError(error));
      return;
    }

    setSuccessMessage("Session cancelled.");
    await reloadUpcoming();
  };

  const handleRescheduled = () => {
    setRescheduleBooking(null);
    setSuccessMessage(
      "Session rescheduled. Your mentor will re-confirm the new time."
    );
    reloadUpcoming();
  };

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      alert(error.message);
      return;
    }
    navigate("/");
  };

  const isActive = (path) => location.pathname === path;

  if (authLoading || profilePending) {
    return <p style={{ padding: "2rem" }}>Loading...</p>;
  }

  if (!isAllowed) {
    return (
      <AccessDenied detail="You do not have permission to access the Student Dashboard." />
    );
  }

  const avatarUrl = profile?.avatar_url || null;
  const displayName = profile?.full_name || "Student";

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
            <Avatar
              name={displayName}
              url={avatarUrl}
              updatedAt={profile?.updated_at}
              className="dashboard-avatar"
            />

            <div>
              <div className="dashboard-user-name">{displayName}</div>
              <div className="dashboard-user-role">Student</div>
            </div>
          </div>

          <button onClick={handleLogout} className="dashboard-logout-button">
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
              Welcome back, {displayName}.
            </p>
          </div>

          <div className="dashboard-header-actions">
            <NotificationBell />
            <Avatar
              name={displayName}
              url={avatarUrl}
              updatedAt={profile?.updated_at}
              className="dashboard-header-avatar"
            />
          </div>
        </header>

        <div className="dashboard-content">
          {successMessage && (
            <div className="dashboard-success-message">{successMessage}</div>
          )}

          {errorMessage && (
            <div className="dashboard-error-message">{errorMessage}</div>
          )}

          {/* Welcome + primary CTA */}
          <section className="dashboard-hero">
            <div>
              <h2 className="dashboard-hero-title">
                Ready to grow with a mentor?
              </h2>

              <p className="dashboard-hero-text">
                Explore approved mentors, request a session, and manage
                everything from one place.
              </p>
            </div>

            <div className="dashboard-hero-actions">
              <Link to="/browse-mentors" className="btn btn-primary">
                Find a Mentor
              </Link>

              <Link to="/student-bookings" className="btn btn-secondary">
                View My Bookings
              </Link>
            </div>
          </section>

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
              <div className="dashboard-stat-label">Pending Requests</div>
              <div className="dashboard-stat-value">
                {loadingStats ? "—" : counts.pending}
              </div>
              <div className="dashboard-stat-description">
                Awaiting mentor confirmation
              </div>
            </article>
          </section>

          {/* Status at a glance */}
          <section className="status-glance">
            <span className="status-glance-item">
              Accepted{" "}
              <strong className="status-glance-value">
                {loadingStats ? "—" : counts.accepted}
              </strong>
            </span>
            <span className="status-glance-item">
              Pending{" "}
              <strong className="status-glance-value">
                {loadingStats ? "—" : counts.pending}
              </strong>
            </span>
            <span className="status-glance-item">
              Declined{" "}
              <strong className="status-glance-value">
                {loadingStats ? "—" : counts.declined}
              </strong>
            </span>
          </section>

          {/* Recommended Mentors */}
          <section className="dashboard-panel">
            <div className="dashboard-panel-header">
              <div>
                <h2 className="dashboard-panel-title" style={{ marginBottom: "0.25rem" }}>
                  Recommended Mentors
                </h2>
                <p className="dashboard-muted-text" style={{ margin: 0 }}>
                  A quick look at approved mentors ready to guide you.
                </p>
              </div>

              <Link to="/browse-mentors" className="btn btn-secondary">
                View all
              </Link>
            </div>

            {loadingRecommended ? (
              <p className="dashboard-muted-text">Loading recommended mentors...</p>
            ) : recommended.length === 0 ? (
              <div className="dashboard-empty-state">
                <p>No approved mentors are available yet.</p>
                <p>Check back soon, or try browsing all mentors.</p>
              </div>
            ) : (
              <div className="recommended-scroll">
                {recommended.map((mentor) => {
                  const initials = mentor.name
                    .split(" ")
                    .map((part) => part.charAt(0))
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <article key={mentor.id} className="recommended-card">
                      <div className="recommended-card-top">
                        <div className="mentor-card-avatar">{initials}</div>

                        <div>
                          <h3 className="recommended-card-name">{mentor.name}</h3>

                          <p className="recommended-card-meta">
                            {mentor.industry || "Industry mentor"}
                            {typeof mentor.yearsExperience === "number"
                              ? ` · ${mentor.yearsExperience} yrs`
                              : ""}
                          </p>
                        </div>
                      </div>

                      <div className="recommended-card-skills">
                        {mentor.skills.slice(0, 3).map((skill) => (
                          <span
                            key={skill}
                            className="dashboard-tag dashboard-tag-green"
                          >
                            {skill}
                          </span>
                        ))}

                        {mentor.skills.length > 3 && (
                          <span className="dashboard-tag dashboard-tag-neutral">
                            +{mentor.skills.length - 3} more
                          </span>
                        )}
                      </div>

                      <Link
                        to={`/mentor/${mentor.id}`}
                        className="btn btn-primary recommended-card-action"
                      >
                        View Profile
                      </Link>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Upcoming Sessions */}
          <section className="dashboard-panel">
            <div className="dashboard-panel-header">
              <div>
                <h2 className="dashboard-panel-title" style={{ marginBottom: "0.25rem" }}>
                  Upcoming Sessions
                </h2>
                <p className="dashboard-muted-text" style={{ margin: 0 }}>
                  Your confirmed sessions, from today onwards.
                </p>
              </div>

              <Link to="/student-bookings" className="btn btn-secondary">
                Manage bookings
              </Link>
            </div>

            {loadingUpcoming ? (
              <p className="dashboard-muted-text">Loading upcoming sessions...</p>
            ) : upcoming.length === 0 ? (
              <div className="dashboard-empty-state">
                <p>You have no upcoming sessions.</p>

                <Link to="/browse-mentors" className="btn btn-primary">
                  Browse Mentors to get started
                </Link>
              </div>
            ) : (
              <ul className="upcoming-list">
                {upcoming.map((booking) => (
                  <li key={booking.id} className="upcoming-card">
                    <div className="upcoming-card-main">
                      <div className="upcoming-card-info">
                        <h3 className="upcoming-card-title">
                          {booking.mentorName}
                        </h3>

                        <p className="upcoming-card-time">
                          {booking.starts_at && booking.ends_at
                            ? formatInstantRangeLocal(
                                booking.starts_at,
                                booking.ends_at
                              )
                            : `${booking.scheduled_date} · ${booking.start_time} – ${booking.end_time}`}
                        </p>

                        <p className="upcoming-card-notes">
                          {booking.notes
                            ? `Topics: ${booking.notes}`
                            : "No topics added."}
                        </p>
                      </div>

                      <span className={statusPillClass(booking)}>
                        {studentStatusLabel(booking)}
                      </span>
                    </div>

                    <div className="upcoming-card-actions">
                      {booking.meeting_link ? (
                        <a
                          className="btn btn-primary"
                          href={booking.meeting_link}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Join Meeting Link
                        </a>
                      ) : (
                        <span className="btn btn-secondary" disabled>
                          Link pending
                        </span>
                      )}

                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setRescheduleBooking(booking)}
                      >
                        Reschedule
                      </button>

                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => handleCancelBooking(booking.id)}
                      >
                        Cancel
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Account Information */}
          <section className="dashboard-panel">
            <div className="dashboard-panel-header">
              <div>
                <h2 className="dashboard-panel-title" style={{ marginBottom: "0.25rem" }}>
                  Account Information
                </h2>
                <p className="dashboard-muted-text" style={{ margin: 0 }}>
                  Keep your profile useful to the mentors you work with.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowEditProfile(true)}
              >
                Edit Profile
              </button>
            </div>

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

            <div className="dashboard-account-grid dashboard-account-grid-enrichment">
              <div className="dashboard-info-card">
                <div className="dashboard-info-label">Interests</div>
                <div className="dashboard-info-value">
                  {profile?.interests?.length
                    ? profile.interests.join(", ")
                    : (profile?.learning_goals && "See learning goals") ||
                      "Not set yet"}
                </div>
              </div>

              <div className="dashboard-info-card">
                <div className="dashboard-info-label">Preferred Tech Stack/Topics</div>
                <div className="dashboard-info-value">
                  {profile?.preferred_topics?.length
                    ? profile.preferred_topics.join(", ")
                    : "Not set yet"}
                </div>
              </div>

              <div className="dashboard-info-card">
                <div className="dashboard-info-label">Learning Goals</div>
                <div className="dashboard-info-value">
                  {profile?.learning_goals || "Not set yet"}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <EditProfileModal
        open={showEditProfile}
        onClose={() => setShowEditProfile(false)}
      />

      {rescheduleBooking && (
        <RescheduleModal
          booking={rescheduleBooking}
          onClose={() => setRescheduleBooking(null)}
          onRescheduled={handleRescheduled}
        />
      )}
    </div>
  );
}

export default StudentDashboard;