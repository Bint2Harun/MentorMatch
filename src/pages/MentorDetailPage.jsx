import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

function MentorDetailPage() {
  const { mentorId } = useParams();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  const [mentor, setMentor] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Booking form
  const [scheduledDate, setScheduledDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bookingMessage, setBookingMessage] = useState("");
  const [bookingError, setBookingError] = useState("");

  useEffect(() => {
    const loadMentor = async () => {
      setLoading(true);
      setErrorMessage("");

      // Load mentor profile
      const { data: mpData, error: mpError } = await supabase
        .from("mentor_profiles")
        .select(`
          id,
          bio,
          skills,
          is_approved,
          mentor_expertise (
            expertise_categories (
              id,
              name,
              faculty
            )
          ),
          profiles:profiles!inner (
            full_name,
            email
          )
        `)
        .eq("id", mentorId)
        .eq("is_approved", true)
        .maybeSingle();

      if (mpError) {
        setErrorMessage(mpError.message);
        setLoading(false);
        return;
      }

      if (!mpData) {
        setErrorMessage("Mentor not found or not approved.");
        setLoading(false);
        return;
      }

      const profileData = Array.isArray(mpData.profiles)
        ? mpData.profiles[0]
        : mpData.profiles;

      const categories = (mpData.mentor_expertise || []).map(
        (me) => me.expertise_categories
      );

      setMentor({
        id: mpData.id,
        bio: mpData.bio,
        skills: mpData.skills,
        profiles: profileData,
        categories
      });

      // Load availability
      const { data: availData, error: availError } = await supabase
        .from("mentor_availability")
        .select("*")
        .eq("mentor_id", mentorId)
        .eq("is_active", true)
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true });

      if (!availError) {
        setAvailability(availData || []);
      }

      setLoading(false);
    };

    if (mentorId) {
      loadMentor();
    }
  }, [mentorId]);

  const handleRequestBooking = async (e) => {
    e.preventDefault();
    setBookingMessage("");
    setBookingError("");

    if (!user) {
      setBookingError("You must be logged in to request a booking.");
      return;
    }

    if (!scheduledDate || !startTime || !endTime) {
      setBookingError("Please fill in date and time fields.");
      return;
    }

    if (startTime >= endTime) {
      setBookingError("End time must be after start time.");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase
      .from("mentorship_bookings")
      .insert({
        mentor_id: mentorId,
        student_id: user.id,
        scheduled_date: scheduledDate,
        start_time: startTime,
        end_time: endTime,
        status: "pending",
        notes: notes.trim() || null
      });

    setSubmitting(false);

    if (error) {
      setBookingError(error.message);
      return;
    }

    setBookingMessage(
      "Booking request sent successfully. Please wait for mentor confirmation."
    );

    // Reset form
    setScheduledDate("");
    setStartTime("");
    setEndTime("");
    setNotes("");
  };

  if (authLoading || loading) {
    return <p style={{ padding: "2rem" }}>Loading mentor details...</p>;
  }

  if (errorMessage || !mentor) {
    return (
      <main style={{ padding: "2rem" }}>
        <h1>Mentor Not Found</h1>
        <p>{errorMessage || "This mentor does not exist or is not approved."}</p>
        <Link to="/browse-mentors">Back to Browse Mentors</Link>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #ccc",
          paddingBottom: "1rem"
        }}
      >
        <h1>Mentor Details</h1>
        <Link to="/browse-mentors">Back to Browse Mentors</Link>
      </header>

      {/* Mentor Info */}
      <section style={{ marginTop: "2rem" }}>
        <h2>{mentor.profiles?.full_name || "(no name)"}</h2>

        {mentor.profiles?.email && (
          <p style={{ fontSize: "0.95rem", color: "#555" }}>
            {mentor.profiles.email}
          </p>
        )}

        <p>
          <strong>About:</strong>
        </p>
        <p style={{ whiteSpace: "pre-wrap" }}>{mentor.bio}</p>

        {mentor.skills && mentor.skills.length > 0 && (
          <>
            <p>
              <strong>Skills:</strong>
            </p>
            <p>{mentor.skills.join(", ")}</p>
          </>
        )}

        {mentor.categories && mentor.categories.length > 0 && (
          <>
            <p>
              <strong>Expertise Areas:</strong>
            </p>
            <ul>
              {mentor.categories.map((cat) => (
                <li key={cat.id}>
                  {cat.name} {cat.faculty ? `(${cat.faculty})` : ""}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* Availability */}
      <section style={{ marginTop: "2rem" }}>
        <h2>Availability</h2>

        {availability.length === 0 ? (
          <p>No availability slots set by this mentor yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {availability.map((slot) => (
              <li
                key={slot.id}
                style={{
                  marginBottom: "0.5rem",
                  paddingBottom: "0.5rem",
                  borderBottom: "1px solid #eee"
                }}
              >
                <strong>{DAYS[slot.day_of_week]}</strong>: {slot.start_time} –{" "}
                {slot.end_time}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Booking Request Form */}
      <section style={{ marginTop: "2rem" }}>
        <h2>Request a Booking</h2>

        {!user ? (
          <p>
            Please <Link to="/login">log in</Link> to request a booking.
          </p>
        ) : (
          <form onSubmit={handleRequestBooking}>
            <div style={{ marginBottom: "1rem" }}>
              <label htmlFor="date">Date: </label>
              <input
                id="date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                style={{ padding: "0.5rem" }}
                required
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label htmlFor="start">Start Time: </label>
              <input
                id="start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{ padding: "0.5rem" }}
                required
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label htmlFor="end">End Time: </label>
              <input
                id="end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={{ padding: "0.5rem" }}
                required
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label htmlFor="notes">Notes (optional): </label>
              <textarea
                id="notes"
                rows="3"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Briefly describe what you want help with."
                style={{ display: "block", width: "100%", padding: "0.6rem" }}
              />
            </div>

            {bookingError && (
              <p style={{ color: "crimson" }}>{bookingError}</p>
            )}

            {bookingMessage && (
              <p style={{ color: "green" }}>{bookingMessage}</p>
            )}

            <button type="submit" disabled={submitting}>
              {submitting ? "Sending Request..." : "Request Booking"}
            </button>
          </form>
        )}
      </section>

      <p style={{ marginTop: "2rem" }}>
        <Link to="/browse-mentors">Back to Browse Mentors</Link>
      </p>
    </main>
  );
}

export default MentorDetailPage;