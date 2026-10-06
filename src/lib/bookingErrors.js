/**
 * Translate errors from the booking RPCs (request_booking / cancel_booking)
 * into sentences a user can act on.
 *
 * PostgREST surfaces a raised exception as:
 *   error.message  -> the stable SCREAMING_SNAKE code ("SLOT_CONFLICT")
 *   error.details  -> the human explanation the SQL attached as DETAIL
 *   error.code     -> the SQLSTATE ("P0001", "22023", ...)
 *
 * The codes are the contract; anything unrecognised falls through to the
 * server's detail, then to a generic message.
 */
const CODE_MESSAGES = {
  UNAUTHENTICATED: "You must be signed in to request a booking.",
  FORBIDDEN_ROLE:
    "Administrators moderate the platform and do not book sessions.",
  SELF_BOOKING: "You cannot book a session with yourself.",
  MENTOR_NOT_BOOKABLE: "That mentor is not available for booking.",
  MENTOR_NOT_FOUND: "That mentor could not be found.",
  INVALID_TIME_RANGE: "End time must be after start time.",
  SESSION_TOO_SHORT: "Sessions must be at least 15 minutes long.",
  SESSION_TOO_LONG: "Sessions cannot exceed 120 minutes.",
  SLOT_IN_PAST: "Choose today or a future date.",
  OUTSIDE_AVAILABILITY:
    "That time is not fully inside the mentor's published availability.",
  SLOT_CONFLICT: "That slot was just taken by someone else. Pick another time.",
  BUFFER_CONFLICT:
    "This mentor keeps a gap between sessions — pick a time further from the neighbouring booking.",
  DUPLICATE_REQUEST:
    "You already have an open request to this mentor on that date.",
  BOOKING_NOT_FOUND: "That booking no longer exists, or you are not a participant.",
  INVALID_BOOKING_TRANSITION: "That booking can no longer be changed.",
  FORBIDDEN_BOOKING_TRANSITION: "You are not allowed to change that booking.",
};

/** The DB-level exclusion constraints, recognised by name for legacy inserts. */
const CONSTRAINT_MESSAGES = {
  bookings_no_mentor_overlap:
    "That slot was just taken by someone else. Pick another time.",
  bookings_no_buffer_gap:
    "This mentor keeps a gap between sessions — pick a time further from the neighbouring booking.",
};

export function friendlyBookingError(error) {
  if (!error) return "Something went wrong. Please try again.";

  const message = typeof error.message === "string" ? error.message.trim() : "";
  const details =
    typeof error.details === "string" ? error.details.trim() : "";

  if (message && CODE_MESSAGES[message]) {
    // BUFFER_CONFLICT's detail carries the mentor's actual buffer size, so it
    // is more useful than the generic fallback.
    if (message === "BUFFER_CONFLICT" && details) return details;
    return CODE_MESSAGES[message];
  }

  for (const [constraint, text] of Object.entries(CONSTRAINT_MESSAGES)) {
    if (message.includes(constraint)) return text;
  }

  if (details && details !== message) return details;
  return message || "Something went wrong. Please try again.";
}
