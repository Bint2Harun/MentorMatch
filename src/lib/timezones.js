/**
 * Timezone helpers for the scheduling UI.
 *
 * Storage model (see migration 0003): bookings keep the mentor's wall-clock
 * triple AND absolute UTC instants (`starts_at` / `ends_at`). The instants are
 * the source of truth for display — always rendered in the visitor's own
 * browser timezone here, so a student in London and a mentor in Lagos both
 * read the same moment correctly, including across DST.
 */

/** The browser's IANA timezone, e.g. "Europe/London". Falls back to UTC. */
export function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Offset (ms) of `timeZone` from UTC at the instant `date`. */
function zoneOffsetMs(date, timeZone) {
  const parts = {};
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  for (const { type, value } of formatter.formatToParts(date)) {
    parts[type] = value;
  }

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );

  return asUtc - date.getTime();
}

/**
 * Interpret a wall-clock date + time as occurring in `timeZone` and return the
 * corresponding UTC instant. Needed because `new Date("2026-10-08T16:00")`
 * would silently assume UTC/Local depending on the engine, and the mentor's
 * wall clock lives in the mentor's zone, not the browser's.
 *
 * Two passes so the answer converges when the target date sits on a DST
 * boundary (the offset at the naive instant and at the corrected instant can
 * differ by an hour).
 */
export function zonedWallTimeToUtc(dateStr, timeStr, timeZone) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return null;
  }

  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let ts = wallAsUtc - zoneOffsetMs(new Date(wallAsUtc), timeZone);
  ts = wallAsUtc - zoneOffsetMs(new Date(ts), timeZone);

  return new Date(ts);
}

/** True when the wall-clock time in `timeZone` is already in the past. */
export function isZonedWallTimeInPast(dateStr, timeStr, timeZone) {
  const instant = zonedWallTimeToUtc(dateStr, timeStr, timeZone);
  return instant !== null && instant.getTime() < Date.now();
}

/** Format an ISO instant in the visitor's locale + local timezone. */
export function formatInstantLocal(isoValue, opts) {
  if (!isoValue) return "";
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    ...opts,
  }).format(date);
}

/** "October 8, 2026, 4:00 PM – 4:45 PM" in the visitor's local timezone. */
export function formatInstantRangeLocal(startIso, endIso) {
  const start = formatInstantLocal(startIso);
  const end = formatInstantLocal(endIso, { dateStyle: undefined });
  if (!start) return "";
  return end ? `${start} – ${end}` : start;
}
