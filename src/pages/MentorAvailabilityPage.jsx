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

  useEffect(() => {
    const load = async () => {
      if (!user) return;

      setLoading(true);
      setError("");

      const { data, error: fetchError } = await supabase
        .from("mentor_availability")
        .select("day_of_week, start_time, end_time, is_active")
        .eq("mentor_id", user.id)
        .eq("is_active", true)
        .order("day_of_week")
        .order("start_time");

      if (fetchError) {
        console.error("Failed to load availability:", fetchError);
        setError("Unable to load availability.");
        setLoading(false);
        return;
      }

      setSlots(data || []);
      setLoading(false);
    };

    load();
  }, [user]);

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

  if (slots.length === 0) {
    return (
      <div>
        <p className="dashboard-muted-text">
          You have not set any availability yet.
        </p>
        <Link to="/mentor-availability" className="btn btn-primary">
          Set Your Availability
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
  );
}

export default MentorAvailabilityPage;