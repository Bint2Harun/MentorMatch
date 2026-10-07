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
        if (cancelled) setLoaded(true);
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
    <section
      className="border-y border-[var(--hairline)] bg-[var(--surface-muted)]"
      aria-label="MentorMatch platform activity"
    >
      {/* p-0 used to sit after px-5/py-7 here: whichever order the utility
          sheet emits, the shorthand can cancel the horizontal padding and push
          the stats to the screen edge. Preflight already zeroes list padding. */}
      <ul className="mx-auto flex w-full max-w-[1180px] flex-wrap list-none items-center justify-center gap-x-10 gap-y-5 px-5 py-7 sm:justify-between">
        {metrics.map(({ icon: Icon, value, label, note }) => (
          <li key={label} className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900/60 dark:text-brand-300">
              <Icon width={22} height={22} />
            </span>
            <span className="flex flex-col">
              <span className="text-[1.35rem] leading-tight font-black tracking-[-0.02em] text-ink-900 dark:text-white">
                {numberFormat.format(value)}
              </span>
              <span className="text-[0.88rem] text-ink-500 dark:text-ink-300">
                {label}
              </span>
              {note && (
                <span className="text-[0.78rem] text-ink-500 dark:text-ink-400">
                  {note}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default TrustStats;
