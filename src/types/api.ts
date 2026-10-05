/**
 * API contract layer.
 *
 * There is no HTTP application server in this stack: the browser talks to
 * Postgres through PostgREST (via supabase-js) and to Supabase Edge Functions
 * over HTTPS. So the "API surface" has two shapes, and both are typed here:
 *
 *   1. RPC contracts  -- request_booking() and friends. Arguments and returns
 *                       are declared in database.ts#Functions; this file adds
 *                       the client-side error contract.
 *   2. Edge Function contracts -- the only endpoints that hold secrets (email
 *                       provider, Google Meet OAuth). Declared now so Phase 4
 *                       has a fixed target; implemented in Phase 4.
 *
 * Both share one response envelope and one error taxonomy, so a component
 * cannot tell which kind of call it made when it renders a failure.
 */

import type { BookingRequestResult, SearchMentorResult, BookingAvailabilityWindow } from './database';
import type { BookingStatus, MeetingProvider } from './domain';
import { MAX_SESSION_MINUTES, MIN_SESSION_MINUTES } from './domain';

// ---------------------------------------------------------------------------
// Response envelope (Edge Functions)
// ---------------------------------------------------------------------------

export interface ApiErrorBody {
  /** Stable, machine-readable. Never shown raw to a user. */
  code: AppErrorCode;
  /** Human-readable, safe to surface in a toast. */
  message: string;
  /** Field-level messages, when the failure was a validation problem. */
  field_errors?: Record<string, string> | undefined;
  /** True when retrying the identical request could plausibly succeed. */
  retryable: boolean;
}

export type ApiResponse<T> =
  | { ok: true; data: T; request_id: string }
  | { ok: false; error: ApiErrorBody; request_id: string };

// ---------------------------------------------------------------------------
// Error taxonomy
//
// Every failure the MVP can produce is one of these codes. The UI branches on
// `code`, never on a raw Postgres message.
// ---------------------------------------------------------------------------

export type AppErrorCode =
  // auth / authorization
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN_ROLE'
  | 'FORBIDDEN_ADMIN_ONLY'
  | 'FORBIDDEN_ROLE_CHANGE'
  | 'FORBIDDEN_EMAIL_CHANGE'
  | 'FORBIDDEN_SELF_APPROVAL'
  | 'FORBIDDEN_BOOKING_TRANSITION'
  | 'SELF_BOOKING'
  // validation
  | 'INVALID_TIME_RANGE'
  | 'SESSION_TOO_SHORT'
  | 'SESSION_TOO_LONG'
  | 'INVALID_BOOKING_TRANSITION'
  // booking domain
  | 'SLOT_CONFLICT'
  | 'SLOT_IN_PAST'
  | 'OUTSIDE_AVAILABILITY'
  | 'DUPLICATE_REQUEST'
  | 'MENTOR_NOT_BOOKABLE'
  | 'MENTOR_NOT_FOUND'
  | 'MENTOR_APPLICATION_NOT_FOUND'
  | 'BOOKING_NOT_FOUND'
  // transport / infrastructure
  | 'NETWORK_ERROR'
  | 'UNEXPECTED';

/**
 * Raised by the SQL functions as the exception message, paired with the
 * SQLSTATE in the second column. See supabase/migrations/*.sql.
 */
export const POSTGRES_ERROR_CODES: Record<string, string> = {
  UNAUTHENTICATED: '28000',
  FORBIDDEN_ROLE: '42501',
  FORBIDDEN_ADMIN_ONLY: '42501',
  FORBIDDEN_ROLE_CHANGE: '42501',
  FORBIDDEN_EMAIL_CHANGE: '42501',
  FORBIDDEN_SELF_APPROVAL: '42501',
  FORBIDDEN_BOOKING_TRANSITION: '42501',
  SELF_BOOKING: '22023',
  INVALID_TIME_RANGE: '22007',
  SESSION_TOO_SHORT: '22023',
  SESSION_TOO_LONG: '22023',
  INVALID_BOOKING_TRANSITION: '22023',
  SLOT_CONFLICT: 'P0001',
  SLOT_IN_PAST: '22023',
  OUTSIDE_AVAILABILITY: '22023',
  DUPLICATE_REQUEST: '22023',
  MENTOR_NOT_BOOKABLE: '22023',
  MENTOR_NOT_FOUND: 'P0002',
  MENTOR_APPLICATION_NOT_FOUND: 'P0002',
  BOOKING_NOT_FOUND: 'P0002',
};

/** Codes where a plain retry of the same request is worth offering. */
const RETRYABLE_CODES = new Set<AppErrorCode>(['NETWORK_ERROR', 'UNEXPECTED']);

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number | null;
  readonly details: string | null;
  readonly fieldErrors: Record<string, string>;

  constructor(init: {
    code: AppErrorCode;
    message: string;
    status?: number | null | undefined;
    details?: string | null | undefined;
    fieldErrors?: Record<string, string> | undefined;
  }) {
    super(init.message);
    this.name = 'AppError';
    this.code = init.code;
    this.status = init.status ?? null;
    this.details = init.details ?? null;
    this.fieldErrors = init.fieldErrors ?? {};
  }

  get retryable(): boolean {
    return RETRYABLE_CODES.has(this.code);
  }

  toBody(requestId?: string): ApiResponse<never> {
    return {
      ok: false,
      error: {
        code: this.code,
        message: this.message,
        field_errors: Object.keys(this.fieldErrors).length
          ? this.fieldErrors
          : undefined,
        retryable: this.retryable,
      },
      request_id: requestId ?? 'client',
    };
  }
}

/** The subset of PostgrestError this module reads. */
export interface RawPostgrestError {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}

const FALLBACK_MESSAGES: Record<AppErrorCode, string> = {
  UNAUTHENTICATED: 'Please sign in and try again.',
  FORBIDDEN_ROLE: 'Your account cannot do that.',
  FORBIDDEN_ADMIN_ONLY: 'Only an administrator can do that.',
  FORBIDDEN_ROLE_CHANGE: 'You cannot change your own role.',
  FORBIDDEN_EMAIL_CHANGE: 'You cannot change your email here.',
  FORBIDDEN_SELF_APPROVAL: 'Mentor approval is handled by an administrator.',
  FORBIDDEN_BOOKING_TRANSITION: 'That change is not allowed for your role.',
  SELF_BOOKING: 'You cannot book a session with yourself.',
  INVALID_TIME_RANGE: 'End time must be after start time.',
  SESSION_TOO_SHORT: `Sessions run at least ${MIN_SESSION_MINUTES} minutes.`,
  SESSION_TOO_LONG: `Sessions cannot exceed ${MAX_SESSION_MINUTES} minutes.`,
  INVALID_BOOKING_TRANSITION: 'That booking has already moved on.',
  SLOT_CONFLICT: 'That slot was just taken. Pick another time.',
  SLOT_IN_PAST: 'Choose today or a later date.',
  OUTSIDE_AVAILABILITY: 'That time is outside the mentor’s published hours.',
  DUPLICATE_REQUEST: 'You already have an open request for that mentor that day.',
  MENTOR_NOT_BOOKABLE: 'That mentor is not taking bookings.',
  MENTOR_NOT_FOUND: 'We could not find that mentor.',
  MENTOR_APPLICATION_NOT_FOUND: 'No application found for that mentor.',
  BOOKING_NOT_FOUND: 'That booking no longer exists.',
  NETWORK_ERROR: 'Network problem. Check your connection and retry.',
  UNEXPECTED: 'Something went wrong. Please try again.',
};

function isAppErrorCode(value: string): value is AppErrorCode {
  return value in POSTGRES_ERROR_CODES || value in FALLBACK_MESSAGES;
}

/**
 * Translate a PostgREST error into an AppError.
 *
 * The SQL functions `raise exception '<CODE>'`, so Supabase surfaces the code in
 * `message` and the human sentence in `details`. Unknown messages degrade to
 * UNEXPECTED rather than leaking driver text to the UI.
 */
export function parsePostgrestError(error: RawPostgrestError | null): AppError {
  if (!error) {
    return new AppError({ code: 'UNEXPECTED', message: FALLBACK_MESSAGES.UNEXPECTED });
  }

  const rawMessage = (error.message ?? '').trim();
  const candidate = rawMessage.split(':')[0]?.trim() ?? '';

  if (isAppErrorCode(candidate)) {
    const fallback = FALLBACK_MESSAGES[candidate];
    return new AppError({
      code: candidate,
      message: (error.details ?? '').trim() || fallback,
      details: error.details ?? null,
    });
  }

  // Auth failures surface as codes, not our markers.
  if (error.code === '42501') {
    return new AppError({
      code: 'FORBIDDEN_ROLE',
      message: FALLBACK_MESSAGES.FORBIDDEN_ROLE,
      details: error.message,
    });
  }

  return new AppError({
    code: 'UNEXPECTED',
    message: FALLBACK_MESSAGES.UNEXPECTED,
    details: error.message,
  });
}

// ---------------------------------------------------------------------------
// RPC contracts
// ---------------------------------------------------------------------------

/** POST /rest/v1/rpc/request_booking */
export interface RequestBookingCommand {
  mentorId: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  notes?: string | null;
}
export type RequestBookingResponse = BookingRequestResult;

/** POST /rest/v1/rpc/cancel_booking */
export interface CancelBookingCommand {
  bookingId: string;
}
export type CancelBookingResponse = BookingRequestResult;

/** POST /rest/v1/rpc/approve_mentor | reject_mentor */
export interface MentorDecisionCommand {
  mentorId: string;
}

/** POST /rest/v1/rpc/search_mentors */
export interface SearchMentorsQuery {
  faculty?: string | null;
  categoryIds?: string[] | null;
  skill?: string | null;
  query?: string | null;
  limit?: number;
  offset?: number;
}
export type SearchMentorsResponse = SearchMentorResult[];

/** POST /rest/v1/rpc/get_booking_availability */
export interface BookingAvailabilityQuery {
  mentorId: string;
  date: string;
}
export type BookingAvailabilityResponse = BookingAvailabilityWindow[];

// ---------------------------------------------------------------------------
// Edge Function contracts (Phase 4 -- declared now, implemented later)
// ---------------------------------------------------------------------------

export const EDGE_FUNCTIONS = {
  /** Called by a Postgres trigger on mentorship_bookings status change. */
  sendBookingEmail: 'mentor-booking-email',
  /** Creates the meeting room on confirmation. Requires service-role key. */
  provisionMeeting: 'mentor-provision-meeting',
  /** Nightly sweep that expires stale pending requests. */
  expireStaleRequests: 'mentor-expire-stale',
} as const;

export type EdgeFunctionName =
  (typeof EDGE_FUNCTIONS)[keyof typeof EDGE_FUNCTIONS];

/**
 * Every email trigger fires on the same booking transition, so the payload is
 * shared. `template` lets one function serve four emails.
 */
export type BookingEmailTemplate =
  | 'booking_requested'   // -> mentor
  | 'booking_confirmed'   // -> student, carries the meeting link
  | 'booking_declined'    // -> student
  | 'booking_cancelled'   // -> the other participant
  | 'booking_reminder'    // -> both, 24h before
  | 'booking_completed';  // -> both, asks for feedback

export interface BookingEmailPayload {
  booking_id: string;
  template: BookingEmailTemplate;
  mentor_name: string;
  student_name: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  timezone: string;
  meeting_link: string | null;
  notes: string | null;
}

export interface ProvisionMeetingPayload {
  booking_id: string;
  provider: MeetingProvider;
  /** Minutes from session start; the reminder edge is scheduled from this. */
  reminder_offset_minutes: number;
}

export interface ProvisionMeetingResponse {
  booking_id: string;
  provider: MeetingProvider;
  meeting_link: string;
  starts_at: string;
  created_at: string;
}

/** Status values that may legally carry a meeting link. */
export const MEETING_ELIGIBLE_STATUSES = ['confirmed'] as const satisfies
  readonly BookingStatus[];
