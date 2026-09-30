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

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function StudentBookingsPage() {
  const { user, profile, signOut } = useAuth();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Form state
  const [mentors, setMentors] = useState([]);
  const [selectedMentorId, setSelectedMentorId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load approved mentors
  useEffect(() => {
    const loadMentors = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("mentor_profiles")
        .select(`
          id,
          profiles:profiles (
            full_name
          )
        `)
        .eq("is_approved", true);

      if (error) {
        console.error("Error loading mentors:", error);
        setErrorMessage("Failed to load mentors. Please try again.");
        return;
      }

      const options = (data || []).map((mentor) => {
        const profileData = Array.isArray(mentor.profiles)
          ? mentor.profiles[0]
          : mentor.profiles;

        return {
          id: mentor.id,
          name: profileData?.full_name || "(no name)",
        };
      });

      setMentors(options);

      if (options.length > 0 && !selectedMentorId) {
        setSelectedMentorId(options[0].id);
      }
    };

    loadMentors();
  }, [user, selectedMentorId]);

  // Load bookings
  useEffect(() => {
    const loadBookings = async () => {
      if (!user) return;

      setLoading(true);
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
          mentor:mentor_profiles (
            id,
            profiles:profiles (
              full_name
            )
          )
        `)
        .eq("student_id", user.id)
        .order("scheduled_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) {
        setErrorMessage("Failed to load your bookings. Please try again.");
        setLoading(false);
        return;
      }

      const transformed = (data || []).map((booking) => {
        const mentorData = Array.isArray(booking.mentor)
          ? booking.mentor[0]
          : booking.mentor;

        const profileData = Array.isArray(mentorData?.profiles)
          ? mentorData.profiles[0]
          : mentorData?.profiles;

        return {
          id: booking.id,
          scheduled_date: booking.scheduled_date,
          start_time: booking.start_time,
          end_time: booking.end_time,
          status: booking.status,
          notes: booking.notes,
          created_at: booking.created_at,
          mentorName: profileData?.full_name || "(no name)",
        };
      });

      setBookings(transformed);
      setLoading(false);
    };

    if (profile?.role === "Student") {
      loadBookings();
    }
  }, [profile, user]);

  // Check availability and create booking
  const handleCreateBooking = async (e) => {
    e.preventDefault();

    if (!user || !selectedMentorId || !date) {
      setErrorMessage("Please select a mentor and date.");
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    if (date < today) {
      setErrorMessage("Booking date cannot be in the past.");
      return;
    }

    if (startTime >= endTime) {
      setErrorMessage("End time must be later than start time.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    const dateObj = new Date(date + "T00:00:00");
    const dayOfWeek = dateObj.getDay();

    const { data: availSlots, error: availError } = await supabase
      .from("mentor_availability")
      .select("start_time, end_time")
      .eq("mentor_id", selectedMentorId)
      .eq("day_of_week", dayOfWeek)
      .eq("is_active", true);

    if (availError) {
      setSubmitting(false);
      setErrorMessage("Failed to check mentor availability. Please try again.");
      return;
    }

    if (!availSlots || availSlots.length === 0) {
      setSubmitting(false);
      setErrorMessage(
        `The mentor is not available on ${DAYS[dayOfWeek]}s. Please choose another day or mentor.`
      );
      return;
    }

    const overlaps = availSlots.some((slot) => {
      const availStart = slot.start_time;
      const availEnd = slot.end_time;
      return startTime < availEnd && endTime > availStart;
    });

    if (!overlaps) {
      setSubmitting(false);
      setErrorMessage(
        `The mentor is not available at ${startTime}–${endTime} on ${DAYS[dayOfWeek]}s. Please choose a different time.`
      );
      return;
    }

    const { error } = await supabase
      .from("mentorship_bookings")
      .insert({
        student_id: user.id,
        mentor_id: selectedMentorId,
        scheduled_date: date,
        start_time: startTime,
        end_time: endTime,
        status: "pending",
        notes: notes.trim() || null,
      });

    setSubmitting(false);

    if (error) {
      setErrorMessage(
        error.message || "Failed to create booking. Please try again."
      );
      return;
    }

    setNotes("");

    // Reload bookings
    const { data, error: reloadError } = await supabase
      .from("mentorship_bookings")
      .select(`
        id,
        scheduled_date,
        start_time,
        end_time,
        status,
        notes,
        created_at,
        mentor:mentor_profiles (
          id,
          profiles:profiles (
            full_name
          )
        )
      `)
      .eq("student_id", user.id)
      .order("scheduled_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (reloadError) {
      setErrorMessage("Failed to refresh bookings. Please try again.");
      return;
    }

    const transformed = (data || []).map((booking) => {
      const mentorData = Array.isArray(booking.mentor)
        ? booking.mentor[0]
        : booking.mentor;

      const profileData = Array.isArray(mentorData?.profiles)
        ? mentorData.profiles[0]
        : mentorData?.profiles;

      return {
        id: booking.id,
        scheduled_date: booking.scheduled_date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        status: booking.status,
        notes: booking.notes,
        created_at: booking.created_at,
        mentorName: profileData?.full_name || "(no name)",
      };
    });

    setBookings(transformed);
  };

  // Cancel booking (student)
  const handleCancelBooking = async (bookingId) => {
    if (
      !window.confirm("Cancel this booking request? This cannot be undone.")
    )
      return;

    setErrorMessage("");

    const { error } = await supabase
      .from("mentorship_bookings")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (error) {
      setErrorMessage("Failed to cancel booking. Please try again.");
      return;
    }

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
        mentor:mentor_profiles (
          id,
          profiles:profiles (
            full_name
          )
        )
      `)
      .eq("student_id", user.id)
      .order("scheduled_date", { ascending: true })
      .order("start_time", { ascending: true });

    setLoading(false);

    if (loadError) {
      setErrorMessage("Failed to refresh bookings. Please try again.");
      return;
    }

    const transformed = (data || []).map((booking) => {
      const mentorData = Array.isArray(booking.mentor)
        ? booking.mentor[0]
        : booking.mentor;

      const profileData = Array.isArray(mentorData?.profiles)
        ? mentorData.profiles[0]
        : mentorData?.profiles;

      return {
        id: booking.id,
        scheduled_date: booking.scheduled_date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        status: booking.status,
        notes: booking.notes,
        created_at: booking.created_at,
        mentorName: profileData?.full_name || "(no name)",
      };
    });

    setBookings(transformed);
  };

  // Logout
  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      alert("Failed to log out. Please try again.");
    }
  };

  // Access control
  if (profile?.role !== "Student") {
    return (
      <main className="container">
        <h1>Access Denied</h1>
        <p>You do not have permission to access this page.</p>
        <Link to="/">Back to Home</Link>
      </main>
    );
  }

  const today = new Date().toISOString().split("T")[0];

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
          <h1 style={{ margin: 0, fontSize: "1.8rem" }}>My Bookings</h1>
          <p
            style={{
              marginTop: "0.5rem",
              marginBottom: 0,
              fontSize: "0.95rem",
            }}
          >
            Welcome, <strong>{profile?.full_name || "Student"}</strong>
          </p>
        </div>

        <button onClick={handleLogout} className="btn btn-primary">
          Logout
        </button>
      </header>

      <section className="mt-2">
        <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>
          Request a New Booking
        </h2>

        <form onSubmit={handleCreateBooking}>
          <div style={{ marginBottom: "1rem" }}>
            <label>Mentor</label>
            <select
              value={selectedMentorId}
              onChange={(e) => setSelectedMentorId(e.target.value)}
              required
            >
              <option value="">Select a mentor</option>
              {mentors.map((mentor) => (
                <option key={mentor.id} value={mentor.id}>
                  {mentor.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid-3" style={{ marginBottom: "1rem" }}>
            <div>
              <label>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                min={today}
              />
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
            <label>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="What do you want help with?"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: "100%" }}
          >
            {submitting ? "Creating..." : "Request Booking"}
          </button>
        </form>

        {errorMessage && (
          <p
            style={{
              color: "crimson",
              marginTop: "1rem",
              fontSize: "0.9rem",
            }}
          >
            {errorMessage}
          </p>
        )}
      </section>

      <section className="mt-2">
        <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>
          Your Booking Requests
        </h2>

        {loading && !errorMessage && (
          <p style={{ fontSize: "0.95rem" }}>Loading bookings...</p>
        )}

        {!loading && !errorMessage && bookings.length === 0 && (
          <p style={{ fontSize: "0.95rem" }}>
            You have not made any booking requests yet.
          </p>
        )}

        {!loading && !errorMessage && bookings.length > 0 && (
          <div className="dashboard-stats-grid">
            {bookings.map((booking, index) => {
              const accentClass =
                booking.status === "confirmed"
                  ? "dashboard-stat-card-green"
                  : booking.status === "pending"
                  ? "dashboard-stat-card-orange"
                  : booking.status === "cancelled"
                  ? "dashboard-stat-card-blue"
                  : "dashboard-stat-card-dark-green";

              return (
                <article
                  key={booking.id}
                  className={`dashboard-stat-card ${accentClass}`}
                >
                  {/* Mentor name */}
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: "1.05rem",
                      marginBottom: "0.5rem",
                      color: "var(--text-heading)",
                    }}
                  >
                    Mentor: {booking.mentorName}
                  </div>

                  {/* Date */}
                  <div
                    style={{
                      fontSize: "0.9rem",
                      marginBottom: "0.25rem",
                      color: "var(--text)",
                    }}
                  >
                    <strong>Date:</strong> {booking.scheduled_date}
                  </div>

                  {/* Time */}
                  <div
                    style={{
                      fontSize: "0.9rem",
                      marginBottom: "0.25rem",
                      color: "var(--text)",
                    }}
                  >
                    <strong>Time:</strong> {booking.start_time} –{" "}
                    {booking.end_time}
                  </div>

                  {/* Status */}
                  <div
                    style={{
                      fontSize: "0.9rem",
                      color: "var(--text)",
                    }}
                  >
                    <strong>Status:</strong>{" "}
                    {STATUS_LABELS[booking.status] || booking.status}
                  </div>

                  {/* Notes */}
                  {booking.notes && (
                    <div
                      style={{
                        marginTop: "0.5rem",
                        fontSize: "0.9rem",
                        color: "var(--text)",
                      }}
                    >
                      <strong>Notes:</strong> {booking.notes}
                    </div>
                  )}

                  {/* Actions and status hints */}
                  {booking.status === "pending" && (
                    <div style={{ marginTop: "0.75rem" }}>
                      <button
                        onClick={() => handleCancelBooking(booking.id)}
                        className="btn btn-danger"
                      >
                        Cancel Booking
                      </button>
                    </div>
                  )}

                  {booking.status === "confirmed" && (
                    <div className="text-muted" style={{ marginTop: "0.75rem" }}>
                      (Booking confirmed by mentor)
                    </div>
                  )}

                  {booking.status === "completed" && (
                    <div className="text-muted" style={{ marginTop: "0.75rem" }}>
                      (Session completed)
                    </div>
                  )}

                  {booking.status === "cancelled" && (
                    <div className="text-muted" style={{ marginTop: "0.75rem" }}>
                      (Booking cancelled)
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <p className="mt-2">
        <Link to="/student-dashboard">Back to Student Dashboard</Link>
      </p>
    </div>
  );
}

export default StudentBookingsPage;