/**
 * Shared booking helpers for the student-facing booking flows.
 *
 * The booking row shape comes from BOOKING_SELECT (mentor name nested under
 * mentor_profiles -> profiles), and mapBookingRow() flattens the PostgREST
 * embeddings so pages and modals can share one shape.
 */

export const BOOKING_SELECT = `
  id,
  scheduled_date,
  start_time,
  end_time,
  starts_at,
  ends_at,
  status,
  notes,
  cancelled_by,
  timezone,
  meeting_provider,
  meeting_link,
  meeting_created_at,
  created_at,
  mentor:mentor_profiles (
    id,
    profiles:profiles (
      full_name
    )
  )
`;

export function mapBookingRow(booking) {
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
    starts_at: booking.starts_at,
    ends_at: booking.ends_at,
    status: booking.status,
    notes: booking.notes,
    cancelled_by: booking.cancelled_by,
    timezone: booking.timezone || "UTC",
    meeting_provider: booking.meeting_provider,
    meeting_link: booking.meeting_link,
    meeting_created_at: booking.meeting_created_at,
    created_at: booking.created_at,
    mentorName: profileData?.full_name || "(no name)",
    mentorId: mentorData?.id,
  };
}

export const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Accepted",
  cancelled: "Cancelled",
  completed: "Completed",
};

/**
 * Student-facing label for a booking. "Declined" is a cancelled request that
 * the mentor turned down; a cancellation by the student or an admin override
 * is called out explicitly so the tab list reads honestly.
 */
export function studentStatusLabel(booking) {
  if (booking.status === "cancelled") {
    if (booking.cancelled_by === "mentor") return "Declined";
    if (booking.cancelled_by === "administrator") return "Closed by admin";
    return "Cancelled by you";
  }
  return STATUS_LABELS[booking.status] || booking.status;
}

export function statusPillClass(booking) {
  if (booking.status === "pending") return "status-pill status-pill-pending";
  if (booking.status === "confirmed") {
    return "status-pill status-pill-accepted";
  }
  if (booking.status === "cancelled") {
    if (booking.cancelled_by === "mentor") {
      return "status-pill status-pill-declined";
    }
    return "status-pill status-pill-cancelled";
  }
  return "status-pill status-pill-completed";
}