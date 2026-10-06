import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../hooks/useRole";
import AccessDenied from "../components/AccessDenied";
import RescheduleModal from "../components/RescheduleModal";
import { supabase } from "../lib/supabase";
import { friendlyBookingError } from "../lib/bookingErrors";
import {
  BOOKING_SELECT,
  mapBookingRow,
  studentStatusLabel,
  statusPillClass,
} from "../lib/bookings";
import {
  isZonedWallTimeInPast,
  zonedWallTimeToUtc,
  formatInstantRangeLocal,
} from "../lib/timezones";

const BOOKING_TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "declined", label: "Declined" },
  { key: "completed", label: "Completed" },
];

function matchesTab(booking, tab) {
  const label = studentStatusLabel(booking);

  switch (tab) {
    case "pending":
      return booking.status === "pending";
    case "accepted":
      return booking.status === "confirmed";
    case "declined":
      return booking.status === "cancelled" && label !== "Cancelled by you";
    case "completed":
      return booking.status === "completed";
    default:
      return true;
  }
}

function StudentBookingsPage() {
  const { user, profile, signOut } = useAuth();
  const { loading: authLoading, profilePending, isAllowed } = useRole("Student");

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [successMessage, setSuccessMessage] = useState("");
  const [rescheduleBooking, setRescheduleBooking] = useState(null);

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
          timezone,
          buffer_minutes,
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
          timezone: mentor.timezone || "UTC",
          bufferMinutes:
            typeof mentor.buffer_minutes === "number"
              ? mentor.buffer_minutes
              : 15,
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
        .select(BOOKING_SELECT)
        .eq("student_id", user.id)
        .order("scheduled_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) {
        setErrorMessage("Failed to load your bookings. Please try again.");
        setLoading(false);
        return;
      }

      setBookings((data || []).map(mapBookingRow));
      setLoading(false);
    };

    if (profile?.role === "Student") {
      loadBookings();
    }
  }, [profile, user]);

  // Refresh the list after a write so the UI reflects the DB's decision.
  const reloadAfterWrite = async () => {
    const { data, error } = await supabase
      .from("mentorship_bookings")
      .select(BOOKING_SELECT)
      .eq("student_id", user.id)
      .order("scheduled_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      setErrorMessage("Failed to refresh bookings. Please try again.");
      return;
    }

    setBookings((data || []).map(mapBookingRow));
  };

  // Request a booking through request_booking(), the sanctioned write path:
  // it validates duration, availability, duplicates and buffer gaps inside
  // one transaction, with exclusion constraints underneath resolving
  // concurrent attempts to exactly one winner (no double bookings).
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

    const selectedMentor = mentors.find((m) => m.id === selectedMentorId);

    // The entered times are the mentor's wall clock, so the past check has to
    // be evaluated in the mentor's timezone, not the browser's.
    if (
      selectedMentor &&
      isZonedWallTimeInPast(date, startTime, selectedMentor.timezone)
    ) {
      setErrorMessage("Choose a future date and time.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    const { error } = await supabase.rpc("request_booking", {
      p_mentor_id: selectedMentorId,
      p_scheduled_date: date,
      p_start_time: startTime,
      p_end_time: endTime,
      p_notes: notes.trim() || null,
    });

    setSubmitting(false);

    if (error) {
      setErrorMessage(friendlyBookingError(error));
      return;
    }

    setNotes("");
    await reloadAfterWrite();
  };

  // Cancel booking (student) through cancel_booking(), which verifies the
  // caller is a participant and the transition is legal.
  const handleCancelBooking = async (bookingId) => {
    if (
      !window.confirm("Cancel this booking request? This cannot be undone.")
    )
      return;

    setErrorMessage("");
    setLoading(true);

    const { error } = await supabase.rpc("cancel_booking", {
      p_booking_id: bookingId,
    });

    if (error) {
      setLoading(false);
      setErrorMessage(friendlyBookingError(error));
      return;
    }

    await reloadAfterWrite();
    setLoading(false);
  };

  // Logout
  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      alert("Failed to log out. Please try again.");
    }
  };

  // Access control
  if (authLoading || profilePending) {
    return <p style={{ padding: "2rem" }}>Loading...</p>;
  }

  if (!isAllowed) {
    return <AccessDenied />;
  }

  const today = new Date().toISOString().split("T")[0];

  const selectedMentor = mentors.find((m) => m.id === selectedMentorId);

  // Live translation of the mentor-wall-clock inputs into the student's own
  // timezone, so nobody books "4 PM" meaning two different moments.
  const localPreview =
    selectedMentor && date && startTime && endTime
      ? formatInstantRangeLocal(
          zonedWallTimeToUtc(date, startTime, selectedMentor.timezone),
          zonedWallTimeToUtc(date, endTime, selectedMentor.timezone)
        )
      : "";

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

          {selectedMentor && (
            <p style={{ fontSize: "0.9rem", color: "#555", marginBottom: "0.5rem" }}>
              Date and times are in the mentor's timezone (
              {selectedMentor.timezone}).
            </p>
          )}

          {localPreview && (
            <p style={{ fontSize: "0.92rem", fontWeight: 600, marginBottom: "1rem" }}>
              In your local time: {localPreview}
            </p>
          )}

          {selectedMentor && selectedMentor.bufferMinutes > 0 && (
            <p style={{ fontSize: "0.88rem", color: "#555", marginBottom: "1rem" }}>
              This mentor keeps a {selectedMentor.bufferMinutes}-minute gap
              between sessions.
            </p>
          )}

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

        <div className="status-tabs" role="tablist">
          {BOOKING_TABS.map((tab) => {
            const count =
              tab.key === "all"
                ? bookings.length
                : bookings.filter((booking) => matchesTab(booking, tab.key))
                    .length;

            return (
              <button
                key={tab.key}
                type="button"
                className={`status-tab ${
                  activeTab === tab.key ? "status-tab-active" : ""
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label} <span className="status-tab-count">({count})</span>
              </button>
            );
          })}
        </div>

        {successMessage && (
          <p
            style={{
              color: "var(--brand-green)",
              marginTop: "1rem",
              fontSize: "0.95rem",
              fontWeight: 600,
            }}
          >
            {successMessage}
          </p>
        )}

        {loading && !errorMessage && (
          <p style={{ fontSize: "0.95rem" }}>Loading bookings...</p>
        )}

        {!loading && !errorMessage && bookings.length === 0 && (
          <p style={{ fontSize: "0.95rem" }}>
            You have not made any booking requests yet.
          </p>
        )}

        {!loading &&
          !errorMessage &&
          bookings.length > 0 &&
          (() => {
            const visible = bookings.filter((booking) =>
              matchesTab(booking, activeTab)
            );

            if (visible.length === 0) {
              return (
                <p style={{ fontSize: "0.95rem" }}>
                  No bookings in this tab.
                </p>
              );
            }

            return (
              <div className="dashboard-stats-grid">
                {visible.map((booking) => {
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

                      {/* Time — absolute instants rendered in the student's own
                          timezone; wall clock as a fallback for legacy rows. */}
                      <div
                        style={{
                          fontSize: "0.9rem",
                          marginBottom: "0.25rem",
                          color: "var(--text)",
                        }}
                      >
                        <strong>Time:</strong>{" "}
                        {booking.starts_at && booking.ends_at
                          ? formatInstantRangeLocal(
                              booking.starts_at,
                              booking.ends_at
                            )
                          : `${booking.start_time} – ${booking.end_time}`}
                      </div>

                      {/* Status */}
                      <div
                        style={{
                          fontSize: "0.9rem",
                          marginBottom: "0.25rem",
                          color: "var(--text)",
                        }}
                      >
                        <strong>Status:</strong>{" "}
                        <span className={statusPillClass(booking)}>
                          {studentStatusLabel(booking)}
                        </span>
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
                          <strong>Topics:</strong> {booking.notes}
                        </div>
                      )}

                      {/* Actions and status hints */}
                      <div style={{ marginTop: "0.75rem" }}>
                        {booking.status === "confirmed" && (
                          <>
                            {booking.meeting_link ? (
                              <a
                                className="btn btn-primary"
                                href={booking.meeting_link}
                                target="_blank"
                                rel="noreferrer"
                                style={{ marginRight: "0.5rem" }}
                              >
                                Join Meeting Link
                              </a>
                            ) : (
                              <span
                                className="text-muted"
                                style={{ display: "block", marginBottom: "0.5rem" }}
                              >
                                Meeting link pending confirmation.
                              </span>
                            )}

                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ marginRight: "0.5rem" }}
                              onClick={() => setRescheduleBooking(booking)}
                            >
                              Reschedule
                            </button>

                            <button
                              onClick={() => handleCancelBooking(booking.id)}
                              className="btn btn-danger"
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        {booking.status === "pending" && (
                          <button
                            onClick={() => handleCancelBooking(booking.id)}
                            className="btn btn-danger"
                          >
                            Cancel Booking
                          </button>
                        )}

                        {booking.status === "completed" && (
                          <div className="text-muted">(Session completed)</div>
                        )}

                        {booking.status === "cancelled" && (
                          <div className="text-muted">
                            ({studentStatusLabel(booking)})
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            );
          })()}
      </section>

      <p className="mt-2">
        <Link to="/student-dashboard">Back to Student Dashboard</Link>
      </p>

      {rescheduleBooking && (
        <RescheduleModal
          booking={rescheduleBooking}
          onClose={() => setRescheduleBooking(null)}
          onRescheduled={() => {
            setRescheduleBooking(null);
            setSuccessMessage(
              "Session rescheduled. Your mentor will re-confirm the new time."
            );
            reloadAfterWrite();
          }}
        />
      )}
    </div>
  );
}

export default StudentBookingsPage;