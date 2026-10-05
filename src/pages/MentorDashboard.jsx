import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../hooks/useRole";
import AccessDenied from "../components/AccessDenied";
import { supabase } from "../lib/supabase";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function MentorDashboard() {
  const { user, profile, signOut } = useAuth();
  const { loading: authLoading, profilePending, isAllowed } = useRole("Mentor");
  const location = useLocation();

  const [mentorProfile, setMentorProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Booking stats
  const [pendingCount, setPendingCount] = useState(0);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);

  // Availability state
  const [availSlots, setAvailSlots] = useState([]);
  const [availLoading, setAvailLoading] = useState(true);
  const [availMessage, setAvailMessage] = useState("");
  const [availErrorMessage, setAvailErrorMessage] = useState("");

  // Form state for adding a slot
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadMentorProfile = async () => {
      if (!user) return;

      setLoading(true);
      setMessage("");
      setErrorMessage("");

      const { data: profileData, error: profileError } = await supabase
        .from("mentor_profiles")
        .select("id, bio, skills, is_approved, created_at, updated_at")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        setErrorMessage(profileError.message);
        setLoading(false);
        return;
      }

      if (!profileData) {
        setMentorProfile(null);
        setLoading(false);
        return;
      }

      const { data: expertiseData, error: expertiseError } = await supabase
        .from("mentor_expertise")
        .select(`
          category_id,
          category:expertise_categories (
            id,
            name,
            faculty
          )
        `)
        .eq("mentor_id", user.id);

      if (expertiseError) {
        console.error("Failed to load mentor expertise:", expertiseError);
      }

      const categories = (expertiseData || [])
        .map((expertise) => expertise.category)
        .filter(Boolean);

      setMentorProfile({
        ...profileData,
        categories,
      });

      setLoading(false);
    };

    if (profile?.role === "Mentor") {
      loadMentorProfile();
    }
  }, [user, profile]);

  // Load booking statistics
  useEffect(() => {
    const loadBookingStats = async () => {
      if (!user) return;

      setStatsLoading(true);

      const statuses = ["pending", "confirmed", "completed"];

      const results = await Promise.all(
        statuses.map(async (status) => {
          const { data, error, count } = await supabase
            .from("mentorship_bookings")
            .select("id", { count: "exact", head: true })
            .eq("mentor_id", user.id)
            .eq("status", status);

          if (error) {
            console.error(
              `[stats] Error loading ${status} bookings:`,
              error
            );
            return { status, count: 0 };
          }

          const rowCount = count ?? 0;
          return { status, count: rowCount };
        })
      );

      const counts = Object.fromEntries(
        results.map((r) => [r.status, r.count])
      );

      setPendingCount(counts.pending ?? 0);
      setConfirmedCount(counts.confirmed ?? 0);
      setCompletedCount(counts.completed ?? 0);
      setStatsLoading(false);
    };

    if (profile?.role === "Mentor") {
      loadBookingStats();
    }
  }, [profile, user]);

  // Load availability slots
  useEffect(() => {
    const loadAvailability = async () => {
      if (!user) return;

      setAvailLoading(true);
      const { data, error } = await supabase
        .from("mentor_availability")
        .select("id, day_of_week, start_time, end_time, is_active")
        .eq("mentor_id", user.id)
        .order("day_of_week")
        .order("start_time");

      if (error) {
        setAvailErrorMessage("Failed to load availability.");
        setAvailLoading(false);
        return;
      }

      setAvailSlots(data || []);
      setAvailLoading(false);
    };

    if (profile?.role === "Mentor") {
      loadAvailability();
    }
  }, [profile, user]);

  const handleAddSlot = async (e) => {
    e.preventDefault();
    if (!user) return;

    if (startTime >= endTime) {
      setAvailErrorMessage("End time must be later than start time.");
      return;
    }

    setSubmitting(true);
    setAvailErrorMessage("");
    setAvailMessage("");

    const { error } = await supabase.from("mentor_availability").insert({
      mentor_id: user.id,
      day_of_week: Number(dayOfWeek),
      start_time: startTime,
      end_time: endTime,
      is_active: isActive,
    });

    setSubmitting(false);

    if (error) {
      setAvailErrorMessage(
        error.message || "Failed to add availability slot."
      );
      return;
    }

    setAvailMessage("Availability slot added.");

    // Reload slots
    setAvailLoading(true);
    const { data, error: loadError } = await supabase
      .from("mentor_availability")
      .select("id, day_of_week, start_time, end_time, is_active")
      .eq("mentor_id", user.id)
      .order("day_of_week")
      .order("start_time");

    if (!loadError) {
      setAvailSlots(data || []);
    }
    setAvailLoading(false);
  };

  const handleDeleteSlot = async (id) => {
    if (!window.confirm("Delete this availability slot?")) return;

    const { error } = await supabase
      .from("mentor_availability")
      .delete()
      .eq("id", id);

    if (error) {
      setAvailErrorMessage("Failed to delete slot.");
      return;
    }

    setAvailSlots((prev) => prev.filter((s) => s.id !== id));
    setAvailMessage("Slot deleted.");
  };

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) alert(error.message);
  };

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  const userInitial = (profile?.full_name || "Mentor")
    .charAt(0)
    .toUpperCase();

  if (authLoading || profilePending) {
    return <p style={{ padding: "2rem" }}>Loading...</p>;
  }

  if (!isAllowed) {
    return <AccessDenied detail="You do not have permission to access the Mentor Dashboard." />;
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <p>Loading mentor profile...</p>
      </div>
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
            to="/mentor-dashboard"
            className={`dashboard-nav-link ${
              isActiveRoute("/mentor-dashboard") ? "dashboard-nav-active" : ""
            }`}
          >
            <span className="dashboard-nav-icon">▦</span>
            Dashboard
          </Link>

          <Link
            to="/mentor-bookings"
            className={`dashboard-nav-link ${
              isActiveRoute("/mentor-bookings") ? "dashboard-nav-active" : ""
            }`}
          >
            <span className="dashboard-nav-icon">▣</span>
            My Bookings
          </Link>
         
          <Link
            to="/mentor-edit-profile"
            className={`dashboard-nav-link ${
              isActiveRoute("/mentor-edit-profile") ? "dashboard-nav-active" : ""
            }`}
          >
            <span className="dashboard-nav-icon">✎</span>
            Edit Profile
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
                {profile?.full_name || "Mentor"}
              </div>
              <div className="dashboard-user-role">Mentor</div>
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
            <h1 className="dashboard-heading">Mentor Dashboard</h1>
            <p className="dashboard-subheading">
              Manage your profile, availability, and mentoring sessions.
            </p>
          </div>

          <div className="dashboard-header-avatar">{userInitial}</div>
        </header>

        <div className="dashboard-content">
          {/* Statistics */}
          <section className="dashboard-stats-grid">
            {/* Pending sessions */}
            <article className="dashboard-stat-card dashboard-stat-card-orange">
              <div className="dashboard-stat-label">Pending Sessions</div>

              <div className="dashboard-stat-value">
                {statsLoading ? "…" : pendingCount}
              </div>

              <div className="dashboard-stat-description">
                Awaiting your confirmation
              </div>
            </article>

            {/* Confirmed bookings */}
            <article className="dashboard-stat-card dashboard-stat-card-green">
              <div className="dashboard-stat-label">Confirmed Bookings</div>

              <div className="dashboard-stat-value">
                {statsLoading ? "…" : confirmedCount}
              </div>

              <div className="dashboard-stat-description">
                Upcoming confirmed sessions
              </div>
            </article>

            {/* Completed sessions */}
            <article className="dashboard-stat-card dashboard-stat-card-dark-green">
              <div className="dashboard-stat-label">Completed Sessions</div>

              <div className="dashboard-stat-value">
                {statsLoading ? "…" : completedCount}
              </div>

              <div className="dashboard-stat-description">
                Sessions you have completed
              </div>
            </article>

            {/* Profile status */}
            <article className="dashboard-stat-card dashboard-stat-card-blue">
              <div className="dashboard-stat-label">Profile Status</div>

              <div
                className={
                  mentorProfile?.is_approved
                    ? "dashboard-stat-value-text dashboard-status-approved"
                    : "dashboard-stat-value-text dashboard-status-pending"
                }
              >
                {mentorProfile?.is_approved ? "Approved" : "Pending"}
              </div>

              <div className="dashboard-stat-description">
                Mentor account verification
              </div>
            </article>
          </section>

          {/* Availability Manager (on same page) */}
          <section className="dashboard-panel">
            <h2 className="dashboard-panel-title">Manege Availability</h2>

            {availMessage && (
              <p className="dashboard-success-message">{availMessage}</p>
            )}
            {availErrorMessage && (
              <p className="dashboard-error-message">{availErrorMessage}</p>
            )}

            {/* Add slot form */}
            <form onSubmit={handleAddSlot} style={{ marginBottom: "1.5rem" }}>
              <div className="grid-3" style={{ marginBottom: "1rem" }}>
                <div>
                  <label>Day</label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(Number(e.target.value))}
                    required
                  >
                    {DAYS.map((day, idx) => (
                      <option key={day} value={idx}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label>End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />{" "}
                  Active
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting || availLoading}
                className="btn btn-primary"
              >
                {submitting ? "Adding..." : "Add Slot"}
              </button>
            </form>

            {/* Existing slots */}
            {availLoading && <p>Loading availability...</p>}

            {!availLoading && availSlots.length === 0 && (
              <p className="dashboard-muted-text">
                You have not added any availability slots yet.
              </p>
            )}

            {!availLoading && availSlots.length > 0 && (
              <div className="dashboard-stats-grid">
                {availSlots.map((slot) => (
                  <article
                    key={slot.id}
                    className="dashboard-stat-card dashboard-stat-card-green"
                  >
                    <div className="dashboard-stat-label">
                      {DAYS[slot.day_of_week]}
                    </div>

                    <div className="dashboard-stat-value-text">
                      {slot.start_time} – {slot.end_time}
                    </div>

                    <div className="dashboard-stat-description">
                      {slot.is_active ? "Active" : "Inactive"}
                    </div>

                    <div style={{ marginTop: "0.75rem" }}>
                      <button
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="btn btn-danger"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Mentor Profile */}
          <section className="dashboard-panel">
            <h2 className="dashboard-panel-title">Mentor Profile</h2>

            {!mentorProfile && (
              <div className="dashboard-empty-state">
                No mentor profile was found. Please contact an administrator or
                reapply to become a mentor.
              </div>
            )}

            {mentorProfile && (
              <div className="mentor-profile-content">
                {/* Approval Status */}
                <div className="dashboard-info-card">
                  <div className="dashboard-info-label">Approval Status</div>

                  <div
                    className={
                      mentorProfile.is_approved
                        ? "mentor-status mentor-status-approved"
                        : "mentor-status mentor-status-pending"
                    }
                  >
                    {mentorProfile.is_approved
                      ? "Approved Mentor"
                      : "Pending Approval"}
                  </div>
                </div>

                {/* Biography */}
                <div className="dashboard-info-card">
                  <div className="dashboard-info-label">Biography</div>

                  <div className="mentor-bio">
                    {mentorProfile.bio ||
                      "No biography has been added yet."}
                  </div>
                </div>

                {/* Skills */}
                <div className="dashboard-info-card">
                  <div className="dashboard-info-label">
                    Skills and Expertise
                  </div>

                  {Array.isArray(mentorProfile.skills) &&
                  mentorProfile.skills.length > 0 ? (
                    <div className="dashboard-tag-list">
                      {mentorProfile.skills.map((skill) => (
                        <span
                          key={skill}
                          className="dashboard-tag dashboard-tag-green"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="dashboard-muted-text">No skills listed.</p>
                  )}
                </div>

                {/* Categories */}
                <div className="dashboard-info-card">
                  <div className="dashboard-info-label">
                    Selected Categories
                  </div>

                  {mentorProfile.categories &&
                  mentorProfile.categories.length > 0 ? (
                    <div className="dashboard-tag-list">
                      {mentorProfile.categories.map((category) => (
                        <span
                          key={category.id}
                          className="dashboard-tag dashboard-tag-neutral"
                        >
                          {category.name}
                          {category.faculty
                            ? ` — ${category.faculty}`
                            : ""}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="dashboard-muted-text">
                      No categories selected.
                    </p>
                  )}
                </div>
              </div>
            )}

            {message && (
              <p className="dashboard-success-message">{message}</p>
            )}

            {errorMessage && (
              <p className="dashboard-error-message">{errorMessage}</p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default MentorDashboard;