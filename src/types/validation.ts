/**
 * Validation layer. One Zod schema per form, one per RPC argument.
 *
 * Rules of the house:
 *  - Every schema exports an inferred type via z.infer. Nothing declares a
 *    form's shape twice.
 *  - Cross-field rules that the DB also enforces (end > start, session length,
 *    availability containment) are validated here for fast feedback, but the
 *    database remains the authority. See request_booking() in migration 0003.
 *  - `message` is written for a human; `path` is what react-hook-form consumes.
 */

import { z } from 'zod';

import type { BookingStatus, DayOfWeek, UserRole } from './database';
import { MAX_SESSION_MINUTES, MIN_SESSION_MINUTES } from './domain';

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** Postgres `time` / `<input type="time">`. */
export const timeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Use a 24-hour time such as 14:30.');

/** Postgres `date` / `<input type="date">`. */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD.')
  .refine((value) => !Number.isNaN(Date.parse(`${value}T12:00:00`)), 'Not a real date.');

export const uuidSchema = z.string().uuid('Malformed identifier.');

export const userRoleSchema = z.enum(['Student', 'Mentor', 'Administrator']);

export const bookingStatusSchema = z.enum([
  'pending',
  'confirmed',
  'cancelled',
  'completed',
]);

export const dayOfWeekSchema = z.coerce
  .number()
  .int()
  .min(0)
  .max(6) as unknown as z.ZodType<DayOfWeek>;

/** IANA zone name, e.g. 'Europe/London'. Validated against the browser's list. */
export const timezoneSchema = z
  .string()
  .min(1)
  .refine(
    (value) => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: value });
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Unknown timezone. Use an IANA name such as Europe/London.' },
  );

function minutesOf(time: string): number {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Shared end-after-start rule, reused by the availability and booking forms. */
function endAfterStart<T extends { start_time: string; end_time: string }>(
  value: T,
  ctx: z.RefinementCtx,
): void {
  if (!timeStringSchema.safeParse(value.start_time).success) return;
  if (!timeStringSchema.safeParse(value.end_time).success) return;
  if (minutesOf(value.end_time) <= minutesOf(value.start_time)) {
    ctx.addIssue({
      code: 'custom',
      path: ['end_time'],
      message: 'End time must be after start time.',
    });
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, 'Enter your full name.')
      .max(80, 'That name is too long.'),
    email: z.string().trim().email('Enter a valid email address.'),
    password: z
      .string()
      .min(8, 'Use at least 8 characters.')
      .max(72, 'Passwords are capped at 72 characters.'),
    confirm_password: z.string(),
  })
  .strict()
  .refine((values) => values.password === values.confirm_password, {
    path: ['confirm_password'],
    message: 'Passwords do not match.',
  });
export type RegisterInput = z.infer<typeof registerSchema>;

// ---------------------------------------------------------------------------
// Mentor application / profile
// ---------------------------------------------------------------------------

export const mentorApplicationSchema = z
  .object({
    bio: z
      .string()
      .trim()
      .min(40, 'Write at least 40 characters so students know your background.')
      .max(2000, 'Keep the biography under 2000 characters.'),
    /**
     * Accepts the free-text form field as typed ("React, Python") and the
     * parsed array from a token input. Both shapes reach the same DB column.
     */
    skills: z.union([
      z.array(z.string().trim().min(1)).max(20, 'List at most 20 skills.'),
      z.string().transform((raw) =>
        raw
          .split(',')
          .map((skill) => skill.trim())
          .filter(Boolean),
      ),
    ]),
    category_ids: z.array(uuidSchema).max(10, 'Choose at most 10 areas.').default([]),
  })
  .refine(
    (values) =>
      (Array.isArray(values.skills) ? values.skills.length > 0 : false) ||
      values.category_ids.length > 0,
    {
      path: ['skills'],
      message: 'Add at least one skill or one expertise area.',
    },
  );
export type MentorApplicationInput = z.infer<typeof mentorApplicationSchema>;

export const mentorProfilePatchSchema = z
  .object({
    bio: z.string().trim().max(2000).optional(),
    skills: z.array(z.string().trim().min(1)).max(20).optional(),
    timezone: timezoneSchema.optional(),
    industry: z.string().trim().max(80).nullish(),
    years_experience: z.coerce.number().int().min(0).max(70).nullish(),
  })
  .refine((values) => Object.keys(values).length > 0, {
    message: 'Nothing to save.',
  });
export type MentorProfilePatch = z.infer<typeof mentorProfilePatchSchema>;

/**
 * The form variant: skills arrive as one comma-separated string, exactly as
 * MentorEditProfilePage.jsx:67 splits them today.
 */
export const mentorProfileFormSchema = mentorProfilePatchSchema.extend({
  skills_text: z.string().optional(),
});
export type MentorProfileForm = z.infer<typeof mentorProfileFormSchema>;

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

export const availabilitySlotSchema = z
  .object({
    day_of_week: dayOfWeekSchema,
    start_time: timeStringSchema,
    end_time: timeStringSchema,
    is_active: z.boolean().default(true),
  })
  .superRefine(endAfterStart);
export type AvailabilitySlotInput = z.infer<typeof availabilitySlotSchema>;

/** Full replacement set, used when the mentor saves the whole week at once. */
export const availabilityWeekSchema = z
  .object({ slots: z.array(availabilitySlotSchema).max(50) })
  .refine(
    (values) => {
      const keys = values.slots.map(
        (slot) => `${slot.day_of_week}|${slot.start_time}|${slot.end_time}`,
      );
      return new Set(keys).size === keys.length;
    },
    { path: ['slots'], message: 'That window is already on your schedule.' },
  );
export type AvailabilityWeekInput = z.infer<typeof availabilityWeekSchema>;

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export const bookingRequestSchema = z
  .object({
    mentor_id: uuidSchema,
    scheduled_date: isoDateSchema,
    start_time: timeStringSchema,
    end_time: timeStringSchema,
    /**
     * Normalises "   " to null. Without this the browser posts an empty
     * string and the DB stores '' instead of NULL -- which is why
     * MentorDetailPage.jsx:144 and StudentBookingsPage.jsx:216 both had to
     * write `notes.trim() || null` by hand.
     */
    notes: z
      .string()
      .trim()
      .max(1000, 'Keep notes under 1000 characters.')
      .nullish()
      .transform((value) => (value ? value : null)),
  })
  .superRefine(endAfterStart)
  .refine(
    (values) => {
      const length = minutesOf(values.end_time) - minutesOf(values.start_time);
      return length >= MIN_SESSION_MINUTES && length <= MAX_SESSION_MINUTES;
    },
    {
      path: ['end_time'],
      message: `Sessions run ${MIN_SESSION_MINUTES}-${MAX_SESSION_MINUTES} minutes.`,
    },
  )
  .refine((values) => !isPastDate(values.scheduled_date), {
    path: ['scheduled_date'],
    message: 'Choose today or a later date.',
  });
export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;

function isPastDate(date: string): boolean {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return date < `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Status transitions the UI may offer. The authoritative state machine lives in
 * mentorship_bookings_guard_transition() (migration 0002); this only stops the
 * UI from rendering buttons that are guaranteed to fail.
 */
export const BOOKING_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
} as const satisfies Record<BookingStatus, readonly BookingStatus[]>;

export type BookingTransition = (typeof BOOKING_TRANSITIONS)[BookingStatus][number];

export const bookingStatusChangeSchema = z.object({
  booking_id: uuidSchema,
  next_status: z.enum(['confirmed', 'cancelled', 'completed']),
});
export type BookingStatusChangeInput = z.infer<typeof bookingStatusChangeSchema>;

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export const mentorSearchSchema = z.object({
  faculty: z.string().trim().max(80).nullish(),
  category_ids: z.array(uuidSchema).max(10).nullish(),
  skill: z.string().trim().max(60).nullish(),
  query: z.string().trim().max(120).nullish(),
  limit: z.coerce.number().int().min(1).max(60).default(24),
  offset: z.coerce.number().int().min(0).default(0),
});
export type MentorSearchInput = z.infer<typeof mentorSearchSchema>;

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export const expertiseCategorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Enter a category name.')
      .max(80, 'Keep the name under 80 characters.'),
    description: z.string().trim().max(400, 'Keep the description short.').default(''),
    faculty: z.string().trim().min(2).max(80),
  })
  .strict();
export type ExpertiseCategoryInput = z.infer<typeof expertiseCategorySchema>;

export const userRoleChangeSchema = z.object({
  user_id: uuidSchema,
  role: userRoleSchema,
});
export type UserRoleChangeInput = z.infer<typeof userRoleChangeSchema>;

// ---------------------------------------------------------------------------
// Field-level error extraction for react-hook-form
// ---------------------------------------------------------------------------

/** Flatten a ZodError into `{ fieldName: firstMessage }`. */
export function toFieldErrors(
  error: z.ZodError,
): Record<string, string> {
  const flattened: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    flattened[key] ??= issue.message;
  }
  return flattened;
}
