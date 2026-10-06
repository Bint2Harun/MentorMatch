import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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

function MentorAvailabilityPage() {
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Buffer (gap between consecutive sessions) + the mentor's timezone, both
  // stored on mentor_profiles.
  const [bufferMinutes, setBufferMinutes] = useState("15");
  const [mentorTimezone, setMentorTimezone] = useState("UTC");
  const [savingBuffer, setSavingBuffer] = useState(false);
  const [bufferError, setBufferError] = useState("");
  const [bufferSuccess, setBufferSuccess] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!user) return;

      setLoading(true);
      setError("");

      const [availabilityResult, profileResult] = await Promise.all([
        supabase
          .from("mentor_availability")
          .select("day_of_week, start_time, end_time, is_active")
          .eq("mentor_id", user.id)
          .eq("is_active", true)
          .order("day_of_week")
          .order("start_time"),
        supabase
          .from("mentor_profiles")
          .select("timezone, buffer_minutes")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

      if (availabilityResult.error) {
        console.error("Failed to load availability:", availabilityResult.error);
        setError("Unable to load availability.");
        setLoading(false);
        return;
      }

      setSlots(availabilityResult.data || []);

      if (profileResult.error) {
        console.error("Failed to load mentor settings:", profileResult.error);
      } else if (profileResult.data) {
        setMentorTimezone(profileResult.data.timezone || "UTC");
        setBufferMinutes(
          typeof profileResult.data.buffer_minutes === "number"
            ? String(profileResult.data.buffer_minutes)
            : "15"
        );
      }

      setLoading(false);
    };

    load();
  }, [user]);

  const handleSaveBuffer = async (e) => {
    e.preventDefault();
    setBufferError("");
    setBufferSuccess("");

    const numeric = Number(bufferMinutes);
    if (!Number.isFinite(numeric)) {
      setBufferError("Enter a number of minutes.");
      return;
    }

    const value = Math.min(120, Math.max(0, Math.round(numeric)));

    setSavingBuffer(true);
    const { error: saveError } = await supabase
      .from("mentor_profiles")
      .update({ buffer_minutes: value })
      .eq("id", user.id);
    setSavingBuffer(false);

    if (saveError) {
      console.error("Failed to save buffer:", saveError);
      setBufferError("Could not save your buffer setting. Please try again.");
      return;
    }

    setBufferMinutes(String(value));
    setBufferSuccess(
      value === 0
        ? "Buffer removed. Back-to-back bookings are now allowed."
        : `Buffer saved. New bookings will keep ${value} minutes free between sessions.`
    );
  };

  if (loading) {
    return <p className="dashboard-muted-text">Loading availability...</p>;
  }

  if (error) {
    return (
      <div>
        <p className="dashboard-error-message">{error}</p>
        <Link to="/mentor-availability" className="btn btn-secondary">
          Manage Availability
        </Link>
      </div>
    );
  }

  // Group by day
  const byDay = {};
  slots.forEach((s) => {
    const dayName = DAYS[s.day_of_week];
    if (!byDay[dayName]) byDay[dayName] = [];
    byDay[dayName].push(`${s.start_time}–${s.end_time}`);
  });

  return (
    <div>
      {/* Session buffer setting */}
      <section style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ marginBottom: "0.35rem" }}>Session Buffer</h3>

        <p className="dashboard-muted-text" style={{ marginBottom: "0.75rem" }}>
          Keep a gap between consecutive sessions. Students cannot book a time
          that touches this buffer. Availability hours are in{" "}
          <strong>{mentorTimezone}</strong>.
        </p>

        <form
          onSubmit={handleSaveBuffer}
          style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}
        >
          <div>
            <label htmlFor="bufferMinutes">Minutes between sessions</label>
            <input
              id="bufferMinutes"
              type="number"
              min="0"
              max="120"
              step="5"
              value={bufferMinutes}
              onChange={(e) => setBufferMinutes(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={savingBuffer}
          >
            {savingBuffer ? "Saving..." : "Save Buffer"}
          </button>
        </form>

        {bufferError && (
          <p className="dashboard-error-message" style={{ marginTop: "0.5rem" }}>
            {bufferError}
          </p>
        )}

        {bufferSuccess && (
          <p
            style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: "green" }}
          >
            {bufferSuccess}
          </p>
        )}
      </section>

      {/* Weekly hours */}
      <h3 style={{ marginBottom: "0.5rem" }}>Weekly Hours</h3>

      {slots.length === 0 ? (
        <div>
          <p className="dashboard-muted-text">
            You have not set any availability yet.
          </p>
          <Link to="/mentor-availability" className="btn btn-primary">
            Set Your Availability
          </Link>
        </div>
      ) : (
        <div>
          {Object.entries(byDay).map(([day, times]) => (
            <div key={day} style={{ marginBottom: "0.5rem" }}>
              <strong>{day}:</strong> {times.join(", ")}
            </div>
          ))}

          <Link
            to="/mentor-availability"
            className="btn btn-secondary"
            style={{ marginTop: "0.75rem" }}
          >
            Manage Availability
          </Link>
        </div>
      )}
    </div>
  );
}

export default MentorAvailabilityPage;
