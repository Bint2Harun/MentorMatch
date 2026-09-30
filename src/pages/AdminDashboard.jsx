import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

const ROLE_LABELS = {
  Student: "Student",
  Mentor: "Mentor",
  Administrator: "Administrator",
};

const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
};

function AdminDashboard() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState("users");

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  const [pendingMentors, setPendingMentors] = useState([]);
  const [loadingMentors, setLoadingMentors] = useState(true);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Load all users
  const loadUsers = async () => {
    if (!user) return;

    setLoadingUsers(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .order("full_name", { ascending: true });

    if (error) {
      setErrorMessage("Failed to load users. Please try again.");
      setLoadingUsers(false);
      return;
    }

    setUsers(data || []);
    setLoadingUsers(false);
  };

  // Load all bookings
  const loadBookings = async () => {
    if (!user) return;

    setLoadingBookings(true);

    const { data, error } = await supabase
      .from("mentorship_bookings")
      .select(`
        id,
        scheduled_date,
        start_time,
        end_time,
        status,
        student:profiles (
          id,
          full_name,
          email
        ),
        mentor:mentor_profiles (
          id,
          profiles:profiles (
            id,
            full_name
          )
        )
      `)
      .order("scheduled_date", { ascending: false })
      .order("start_time", { ascending: false });

    if (error) {
      setErrorMessage("Failed to load bookings. Please try again.");
      setLoadingBookings(false);
      return;
    }

    const transformed = (data || []).map((booking) => {
      const studentData = Array.isArray(booking.student)
        ? booking.student[0]
        : booking.student;

      const mentorData = Array.isArray(booking.mentor)
        ? booking.mentor[0]
        : booking.mentor;

      const mentorProfile = Array.isArray(mentorData?.profiles)
        ? mentorData.profiles[0]
        : mentorData?.profiles;

      return {
        id: booking.id,
        scheduled_date: booking.scheduled_date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        status: booking.status,
        studentName: studentData?.full_name || "(no name)",
        studentEmail: studentData?.email || "",
        mentorName: mentorProfile?.full_name || "(no name)",
      };
    });

    setBookings(transformed);
    setLoadingBookings(false);
  };

  // Load mentor applications awaiting approval
  const loadPendingMentors = async () => {
    if (!user) return;

    setLoadingMentors(true);

    const { data, error } = await supabase
      .from("mentor_profiles")
      .select(`
        id,
        is_approved,
        profiles:profiles (
          id,
          full_name,
          email
        )
      `)
      .eq("is_approved", false);

    if (error) {
      setErrorMessage("Failed to load mentor applications. Please try again.");
      setLoadingMentors(false);
      return;
    }

    const transformed = (data || []).map((mentor) => {
      const profileData = Array.isArray(mentor.profiles)
        ? mentor.profiles[0]
        : mentor.profiles;

      return {
        id: mentor.id,
        is_approved: mentor.is_approved,
        name: profileData?.full_name || "(no name)",
        email: profileData?.email || "",
      };
    });

    setPendingMentors(transformed);
    setLoadingMentors(false);
  };

  useEffect(() => {
    if (profile?.role !== "Administrator") return;

    loadUsers();
    loadBookings();
    loadPendingMentors();
  }, [profile, user]);

  const handleLogout = async () => {
    const { error } = await signOut();

    if (error) {
      alert("Failed to log out. Please try again.");
      return;
    }

    navigate("/");
  };

  const handleApproveMentor = async (mentorId) => {
    if (!window.confirm("Approve this mentor application?")) return;

    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("mentor_profiles")
      .update({
        is_approved: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mentorId);

    if (error) {
      setErrorMessage("Failed to approve mentor. Please try again.");
      return;
    }

    setMessage("Mentor approved successfully.");

    loadPendingMentors();
    loadUsers();
  };

  const handleRejectMentor = async (mentorId) => {
    if (!window.confirm("Reject this mentor application?")) return;

    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("mentor_profiles")
      .update({
        is_approved: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mentorId);

    if (error) {
      setErrorMessage("Failed to reject mentor. Please try again.");
      return;
    }

    setMessage("Mentor application rejected.");
    loadPendingMentors();
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const isActiveTab = (tab) => activeTab === tab;

  const userInitial = (profile?.full_name || "Administrator")
    .charAt(0)
    .toUpperCase();

  const studentCount = users.filter((item) => item.role === "Student").length;
  const mentorCount = users.filter((item) => item.role === "Mentor").length;
  const bookingCount = bookings.length;
  const pendingMentorCount = pendingMentors.length;

  if (profile?.role !== "Administrator") {
    return (
      <main className="container">
        <h1>Access Denied</h1>
        <p>You do not have permission to access this page.</p>
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
          <button
            onClick={() => setActiveTab("users")}
            className={`dashboard-nav-button ${
              isActiveTab("users") ? "dashboard-nav-active" : ""
            }`}
          >
            <span className="dashboard-nav-icon">▦</span>
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`dashboard-nav-button ${
              isActiveTab("users") ? "dashboard-nav-active" : ""
            }`}
          >
            <span className="dashboard-nav-icon">♙</span>
            All Users
          </button>

          <button
            onClick={() => setActiveTab("bookings")}
            className={`dashboard-nav-button ${
              isActiveTab("bookings") ? "dashboard-nav-active" : ""
            }`}
          >
            <span className="dashboard-nav-icon">▣</span>
            All Bookings
          </button>

          <button
            onClick={() => setActiveTab("mentors")}
            className={`dashboard-nav-button ${
              isActiveTab("mentors") ? "dashboard-nav-active" : ""
            }`}
          >
            <span className="dashboard-nav-icon">✓</span>
            Mentor Applications
          </button>

          <Link
            to="/admin-categories"
            className={`dashboard-nav-link ${
              isActive("/admin-categories") ? "dashboard-nav-active" : ""
            }`}
          >
            <span className="dashboard-nav-icon">☷</span>
            Categories
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
                {profile?.full_name || "Administrator"}
              </div>
              <div className="dashboard-user-role">Administrator</div>
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
            <h1 className="dashboard-heading">Admin Dashboard</h1>
            <p className="dashboard-subheading">
              Manage users, mentor applications, bookings, and categories.
            </p>
          </div>

          <div className="dashboard-header-avatar">{userInitial}</div>
        </header>

        <div className="dashboard-content">
          {/* Summary Cards */}
          <section className="dashboard-stats-grid">
            <article className="dashboard-stat-card dashboard-stat-card-green">
              <div className="dashboard-stat-label">Total Users</div>

              <div className="dashboard-stat-value">
                {loadingUsers ? "—" : users.length}
              </div>

              <div className="dashboard-stat-description">
                {studentCount} students and {mentorCount} mentors
              </div>
            </article>

            <article className="dashboard-stat-card dashboard-stat-card-dark-green">
              <div className="dashboard-stat-label">Mentor Applications</div>

              <div className="dashboard-stat-value">
                {loadingMentors ? "—" : pendingMentorCount}
              </div>

              <div className="dashboard-stat-description">
                Applications awaiting review
              </div>
            </article>

            <article className="dashboard-stat-card dashboard-stat-card-orange">
              <div className="dashboard-stat-label">Total Bookings</div>

              <div className="dashboard-stat-value">
                {loadingBookings ? "—" : bookingCount}
              </div>

              <div className="dashboard-stat-description">
                Bookings across the platform
              </div>
            </article>

            <article className="dashboard-stat-card dashboard-stat-card-blue">
              <div className="dashboard-stat-label">Admin Role</div>

              <div className="dashboard-stat-value-text">
                {profile?.role || "Administrator"}
              </div>

              <div className="dashboard-stat-description">
                Full management access
              </div>
            </article>
          </section>

          {/* Messages */}
          {message && (
            <div className="dashboard-success-message">{message}</div>
          )}

          {errorMessage && (
            <div className="dashboard-error-message">{errorMessage}</div>
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <section className="dashboard-panel">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  <h2 className="dashboard-panel-title">All Users</h2>
                  <p className="dashboard-subheading">
                    View registered students, mentors, and administrators.
                  </p>
                </div>

                <button
                  onClick={loadUsers}
                  className="btn btn-secondary"
                >
                  Refresh
                </button>
              </div>

              {loadingUsers && (
                <p className="dashboard-muted-text">Loading users...</p>
              )}

              {!loadingUsers && users.length === 0 && (
                <p className="dashboard-muted-text">No users found.</p>
              )}

              {!loadingUsers && users.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(230px, 1fr))",
                    gap: "1rem",
                  }}
                >
                  {users.map((item) => (
                    <article
                      key={item.id}
                      className="dashboard-info-card"
                    >
                      <div
                        className="dashboard-avatar"
                        style={{
                          width: "38px",
                          height: "38px",
                          marginBottom: "0.75rem",
                        }}
                      >
                        {(item.full_name || "U").charAt(0).toUpperCase()}
                      </div>

                      <div
                        style={{
                          fontWeight: 700,
                          marginBottom: "0.35rem",
                          color: "var(--text-heading)",
                        }}
                      >
                        {item.full_name || "(no name)"}
                      </div>

                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--text-muted)",
                          overflowWrap: "anywhere",
                          marginBottom: "0.6rem",
                        }}
                      >
                        {item.email || "(no email)"}
                      </div>

                      <span className="dashboard-tag dashboard-tag-neutral">
                        {ROLE_LABELS[item.role] || item.role || "Unknown"}
                      </span>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Bookings Tab */}
          {activeTab === "bookings" && (
            <section className="dashboard-panel">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  <h2 className="dashboard-panel-title">All Bookings</h2>
                  <p className="dashboard-subheading">
                    Review all mentorship sessions across the platform.
                  </p>
                </div>

                <button
                  onClick={loadBookings}
                  className="btn btn-secondary"
                >
                  Refresh
                </button>
              </div>

              {loadingBookings && (
                <p className="dashboard-muted-text">Loading bookings...</p>
              )}

              {!loadingBookings && bookings.length === 0 && (
                <p className="dashboard-muted-text">No bookings found.</p>
              )}

              {!loadingBookings && bookings.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "1rem",
                  }}
                >
                  {bookings.map((booking) => (
                    <article
                      key={booking.id}
                      className="dashboard-info-card"
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          color: "var(--text-heading)",
                          marginBottom: "0.65rem",
                        }}
                      >
                        {booking.studentName} → {booking.mentorName}
                      </div>

                      <div
                        style={{
                          fontSize: "0.88rem",
                          color: "var(--text)",
                          marginBottom: "0.35rem",
                        }}
                      >
                        <strong>Date:</strong> {booking.scheduled_date}
                      </div>

                      <div
                        style={{
                          fontSize: "0.88rem",
                          color: "var(--text)",
                          marginBottom: "0.65rem",
                        }}
                      >
                        <strong>Time:</strong> {booking.start_time} –{" "}
                        {booking.end_time}
                      </div>

                      <span
                        className="dashboard-tag"
                        style={{
                          background:
                            booking.status === "completed"
                              ? "var(--brand-green-light)"
                              : booking.status === "cancelled"
                              ? "var(--danger-light)"
                              : booking.status === "confirmed"
                              ? "var(--info-light)"
                              : "var(--brand-orange-light)",
                          color:
                            booking.status === "completed"
                              ? "var(--brand-green-dark)"
                              : booking.status === "cancelled"
                              ? "var(--danger)"
                              : booking.status === "confirmed"
                              ? "var(--info)"
                              : "var(--brand-orange-dark)",
                        }}
                      >
                        {STATUS_LABELS[booking.status] || booking.status}
                      </span>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Mentor Applications Tab */}
          {activeTab === "mentors" && (
            <section className="dashboard-panel">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  <h2 className="dashboard-panel-title">
                    Pending Mentor Applications
                  </h2>
                  <p className="dashboard-subheading">
                    Approve applications so mentors can become visible to
                    students.
                  </p>
                </div>

                <button
                  onClick={loadPendingMentors}
                  className="btn btn-secondary"
                >
                  Refresh
                </button>
              </div>

              {loadingMentors && (
                <p className="dashboard-muted-text">Loading applications...</p>
              )}

              {!loadingMentors && pendingMentors.length === 0 && (
                <div className="dashboard-empty-state">
                  No pending mentor applications.
                </div>
              )}

              {!loadingMentors && pendingMentors.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "1rem",
                  }}
                >
                  {pendingMentors.map((mentor) => (
                    <article
                      key={mentor.id}
                      className="dashboard-info-card"
                    >
                      <div
                        className="dashboard-avatar"
                        style={{
                          width: "42px",
                          height: "42px",
                          marginBottom: "0.75rem",
                          background: "var(--brand-orange-light)",
                          color: "var(--brand-orange-dark)",
                        }}
                      >
                        {(mentor.name || "M").charAt(0).toUpperCase()}
                      </div>

                      <div
                        style={{
                          fontWeight: 700,
                          color: "var(--text-heading)",
                          marginBottom: "0.35rem",
                        }}
                      >
                        {mentor.name}
                      </div>

                      <div
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "0.85rem",
                          overflowWrap: "anywhere",
                          marginBottom: "1rem",
                        }}
                      >
                        {mentor.email || "(no email)"}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "0.5rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          onClick={() => handleApproveMentor(mentor.id)}
                          className="btn btn-primary"
                        >
                          Approve
                        </button>

                        <button
                          onClick={() => handleRejectMentor(mentor.id)}
                          className="btn btn-danger"
                        >
                          Reject
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;