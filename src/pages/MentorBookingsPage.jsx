import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
};

function MentorBookingsPage() {
  const { user, profile, signOut } = useAuth();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadBookings = async () => {
      if (!user) return;

      setLoading(true);
      setMessage("");
      setErrorMessage("");

      const { data, error } = await supabase
        .from("mentorship_bookings")
        .select(`
          id,
          scheduled_date,
          start_time,
          end_time,
          status,
          notes,
          created_at,
          student:profiles (
            id,
            full_name,
            email
          )
        `)
        .eq("mentor_id", user.id)
        .order("scheduled_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) {
        setErrorMessage("Failed to load your bookings. Please try again.");
        setLoading(false);
        return;
      }

      const transformed = (data || []).map((b) => {
        const studentData = Array.isArray(b.student) ? b.student[0] : b.student;

        return {
          id: b.id,
          scheduled_date: b.scheduled_date,
          start_time: b.start_time,
          end_time: b.end_time,
          status: b.status,
          notes: b.notes,
          created_at: b.created_at,
          studentName: studentData?.full_name || "(no name)",
          studentEmail: studentData?.email || "",
        };
      });

      setBookings(transformed);
      setLoading(false);
    };

    if (profile?.role === "Mentor") {
      loadBookings();
    }
  }, [profile, user]);

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      alert("Failed to log out. Please try again.");
    }
  };

  const updateStatus = async (bookingId, newStatus) => {
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("mentorship_bookings")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (error) {
      setErrorMessage("Failed to update booking. Please try again.");
      return;
    }

    setMessage(`Booking marked as ${STATUS_LABELS[newStatus] || newStatus}.`);

    // Reload bookings
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from("mentorship_bookings")
      .select(`
        id,
        scheduled_date,
        start_time,
        end_time,
        status,
        notes,
        created_at,
        student:profiles (
          id,
          full_name,
          email
        )
      `)
      .eq("mentor_id", user.id)
      .order("scheduled_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (!loadError) {
      const transformed = (data || []).map((b) => {
        const studentData = Array.isArray(b.student) ? b.student[0] : b.student;
        return {
          id: b.id,
          scheduled_date: b.scheduled_date,
          start_time: b.start_time,
          end_time: b.end_time,
          status: b.status,
          notes: b.notes,
          created_at: b.created_at,
          studentName: studentData?.full_name || "(no name)",
          studentEmail: studentData?.email || "",
        };
      });
      setBookings(transformed);
    }

    setLoading(false);
  };

  const handleConfirm = (bookingId) => {
    if (!window.confirm("Confirm this booking request?")) return;
    updateStatus(bookingId, "confirmed");
  };

  const handleCancel = (bookingId) => {
    if (!window.confirm("Cancel this booking? This cannot be undone.")) return;
    updateStatus(bookingId, "cancelled");
  };

  const handleComplete = (bookingId) => {
    if (!window.confirm("Mark this booking as completed?")) return;
    updateStatus(bookingId, "completed");
  };

  if (profile?.role !== "Mentor") {
    return (
      <main className="container">
        <h1>Access Denied</h1>
        <p>You do not have permission to access this page.</p>
        <Link to="/">Back to Home</Link>
      </main>
    );
  }

  return (
    <div className="container">
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.8rem" }}>Manage Bookings</h1>
          <p
            style={{
              marginTop: "0.5rem",
              marginBottom: 0,
              fontSize: "0.95rem",
            }}
          >
            Welcome, <strong>{profile?.full_name || "Mentor"}</strong>
          </p>
        </div>

        <button onClick={handleLogout} className="btn btn-primary">
          Logout
        </button>
      </header>

      <section className="mt-2">
        {message && (
          <p style={{ color: "green", fontSize: "0.95rem" }}>{message}</p>
        )}

        {errorMessage && (
          <p style={{ color: "crimson", fontSize: "0.95rem" }}>
            {errorMessage}
          </p>
        )}

        {loading && <p style={{ fontSize: "0.95rem" }}>Loading bookings...</p>}

        {!loading && !errorMessage && bookings.length === 0 && (
          <p style={{ fontSize: "0.95rem" }}>No bookings found for you.</p>
        )}

        {!loading && !errorMessage && bookings.length > 0 && (
          <div className="dashboard-stats-grid">
            {bookings.map((b, index) => {
              const accentClass =
                b.status === "confirmed"
                  ? "dashboard-stat-card-green"
                  : b.status === "pending"
                  ? "dashboard-stat-card-orange"
                  : b.status === "cancelled"
                  ? "dashboard-stat-card-blue"
                  : "dashboard-stat-card-dark-green";

              return (
                <article
                  key={b.id}
                  className={`dashboard-stat-card ${accentClass}`}
                >
                  {/* Student name */}
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: "1.05rem",
                      marginBottom: "0.5rem",
                      color: "var(--text-heading)",
                    }}
                  >
                    Student: {b.studentName}
                  </div>

                  {/* Student email */}
                  {b.studentEmail && (
                    <div
                      style={{
                        fontSize: "0.9rem",
                        marginBottom: "0.25rem",
                        color: "var(--text)",
                      }}
                    >
                      {b.studentEmail}
                    </div>
                  )}

                  {/* Date */}
                  <div
                    style={{
                      fontSize: "0.9rem",
                      marginBottom: "0.25rem",
                      color: "var(--text)",
                    }}
                  >
                    <strong>Date:</strong> {b.scheduled_date}
                  </div>

                  {/* Time */}
                  <div
                    style={{
                      fontSize: "0.9rem",
                      marginBottom: "0.25rem",
                      color: "var(--text)",
                    }}
                  >
                    <strong>Time:</strong> {b.start_time} – {b.end_time}
                  </div>

                  {/* Status */}
                  <div
                    style={{
                      fontSize: "0.9rem",
                      color: "var(--text)",
                    }}
                  >
                    <strong>Status:</strong>{" "}
                    {STATUS_LABELS[b.status] || b.status}
                  </div>

                  {/* Notes */}
                  {b.notes && (
                    <div
                      style={{
                        marginTop: "0.5rem",
                        fontSize: "0.9rem",
                        color: "var(--text)",
                      }}
                    >
                      <strong>Notes:</strong> {b.notes}
                    </div>
                  )}

                  {/* Actions */}
                  <div
                    style={{
                      marginTop: "0.75rem",
                      display: "flex",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                    }}
                  >
                    {b.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleConfirm(b.id)}
                          className="btn btn-primary"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => handleCancel(b.id)}
                          className="btn btn-danger"
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    {b.status === "confirmed" && (
                      <>
                        <button
                          onClick={() => handleComplete(b.id)}
                          className="btn btn-primary"
                        >
                          Mark as Completed
                        </button>
                        <button
                          onClick={() => handleCancel(b.id)}
                          className="btn btn-danger"
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    {b.status === "completed" && (
                      <span className="text-muted">(Session completed)</span>
                    )}

                    {b.status === "cancelled" && (
                      <span className="text-muted">(Booking cancelled)</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <p className="mt-2">
        <Link to="/mentor-dashboard">Back to Mentor Dashboard</Link>
      </p>
    </div>
  );
}

export default MentorBookingsPage;