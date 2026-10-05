import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { ShieldCheckIcon, CalendarIcon, UsersIcon } from "./Icons";

const numberFormat = new Intl.NumberFormat("en-US");

/**
 * Trust banner built from real database counts.
 *
 * Reads `public_platform_stats()`, a SECURITY DEFINER aggregate in migration
 * 0005. RLS hides bookings from non-participants, so these totals cannot be
 * counted from the browser.
 *
 * The whole banner is withheld while nothing has been recorded: an empty
 * platform should not advertise "0 mentors", and inventing placeholder traction
 * would be a false claim. Add real numbers here only once they exist.
 *
 * A rating is deliberately absent - the schema has no reviews table.
 */
function TrustStats() {
  const [stats, setStats] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data, error } = await supabase.rpc("public_platform_stats");
        if (cancelled) return;

        if (error) {
          // Migration 0005 may not be applied yet; fail quietly rather than
          // showing an error banner on the marketing page.
          console.warn("public_platform_stats unavailable:", error.message);
        } else {
          const row = Array.isArray(data) ? data[0] : data;
          setStats(row ?? null);
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded || !stats) return null;

  const approvedMentors = Number(stats.approved_mentors ?? 0);
  const totalMentors = Number(stats.total_mentors ?? 0);
  const sessionsBooked = Number(stats.sessions_booked ?? 0);
  const completedSessions = Number(stats.completed_sessions ?? 0);
  const students = Number(stats.registered_students ?? 0);

  const metrics = [
    {
      icon: ShieldCheckIcon,
      value: approvedMentors,
      label: "Verified mentors",
      note: totalMentors > approvedMentors ? `${totalMentors} applied` : null,
    },
    {
      icon: CalendarIcon,
      value: sessionsBooked,
      label: "Sessions booked",
      note: completedSessions > 0 ? `${completedSessions} completed` : null,
    },
    {
      icon: UsersIcon,
      value: students,
      label: "Registered students",
      note: null,
    },
  ].filter((metric) => metric.value > 0);

  // Nothing real to show yet.
  if (metrics.length === 0) return null;

  return (
    <section className="trust-stats" aria-label="MentorMatch platform activity">
      <div className="trust-stats-inner">
        {metrics.map(({ icon: Icon, value, label, note }) => (
          <div className="trust-stat" key={label}>
            <span className="trust-stat-icon">
              <Icon width={22} height={22} />
            </span>
            <span className="trust-stat-body">
              <span className="trust-stat-value">
                {numberFormat.format(value)}
              </span>
              <span className="trust-stat-label">{label}</span>
              {note && <span className="trust-stat-note">{note}</span>}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default TrustStats;