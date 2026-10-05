/**
 * Domain layer: unions, view models, and the lookup tables that are currently
 * duplicated across BrowseMentorsPage, MentorBookingsPage, StudentBookingsPage,
 * AdminDashboard and AdminCategoriesPage.
 *
 * Everything here is derived from src/types/database.ts. Nothing here talks to
 * the network or to React.
 */

import type {
  BookingStatus,
  DayOfWeek,
  ExpertiseCategoryRow,
  Json,
  MeetingProvider,
  UserRole,
} from './database';

// ---------------------------------------------------------------------------
// Unions re-exported so UI code imports from one place
// ---------------------------------------------------------------------------

export type { BookingStatus, DayOfWeek, Json, MeetingProvider, UserRole };

// ---------------------------------------------------------------------------
// Label / lookup tables (previously copy-pasted per page)
// ---------------------------------------------------------------------------

/** Index-aligned with DayOfWeek. Do not reorder. */
export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const satisfies Record<DayOfWeek, string>;

export const DAY_ABBREVIATIONS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const BOOKING_STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  completed: 'Completed',
} as const satisfies Record<BookingStatus, string>;

export const USER_ROLE_LABELS = {
  Student: 'Student',
  Mentor: 'Mentor',
  Administrator: 'Administrator',
} as const satisfies Record<UserRole, string>;

export const MEETING_PROVIDER_LABELS = {
  google_meet: 'Google Meet',
  jitsi: 'Jitsi Meet',
} as const satisfies Record<MeetingProvider, string>;

/**
 * Single source of truth for the faculty list. AdminCategoriesPage.jsx:22 and
 * ApplyMentorPage both fall back to 'General' when a category has no faculty.
 */
export const FACULTIES = [
  'Business',
  'Engineering & Technology',
  'Mathematics & Statistics',
  'Social Sciences & Humanities',
  'Health & Life Sciences',
  'Law & Professional Studies',
  'General',
] as const;

export type Faculty = (typeof FACULTIES)[number];

export const DEFAULT_FACULTY: Faculty = 'General';

/**
 * Route home for a signed-in user. Replaces the four near-identical
 * getBackLink() implementations in BrowseMentorsPage / detail pages.
 */
export const ROLE_HOME: Record<UserRole, string> = {
  Student: '/student-dashboard',
  Mentor: '/mentor-dashboard',
  Administrator: '/admin-dashboard',
};

/** Sessions are capped at 120 minutes by request_booking(). */
export const MIN_SESSION_MINUTES = 15;
export const MAX_SESSION_MINUTES = 120;

// ---------------------------------------------------------------------------
// Entity view models
//
// These mirror the shapes the pages build by hand after a PostgREST join. They
// exist so Phase 3 can delete ~200 lines of `.map()` transformation code and
// replace it with one typed adapter.
// ---------------------------------------------------------------------------

export interface Identity {
  id: string;
  full_name: string;
  email: string;
}

export interface ExpertiseSummary {
  id: string;
  name: string;
  faculty: string;
  description: string;
}

/** One row of BrowseMentorsPage. */
export interface MentorCard {
  id: string;
  bio: string;
  skills: string[];
  identity: Identity;
  categories: ExpertiseSummary[];
}

/** One row of MentorDetailPage. */
export interface MentorProfileDetail extends MentorCard {
  timezone: string;
  industry: string | null;
  yearsExperience: number | null;
  availability: AvailabilitySlot[];
}

/** One row of StudentBookingsPage, from the student's side. */
export interface StudentBookingSummary {
  id: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  notes: string | null;
  createdAt: string;
  mentorId: string;
  mentorName: string;
  meetingLink: string | null;
}

/** One row of MentorBookingsPage, from the mentor's side. */
export interface MentorBookingSummary {
  id: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  notes: string | null;
  createdAt: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  meetingLink: string | null;
}

/** A single declared availability window. */
export interface AvailabilitySlot {
  id: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

/** Availability windows for one concrete date, with occupancy resolved. */
export interface DateAvailability {
  date: string;
  dayOfWeek: DayOfWeek;
  windows: Array<{
    startTime: string;
    endTime: string;
    isBooked: boolean;
  }>;
}

// ---------------------------------------------------------------------------
// Dashboard aggregates
// ---------------------------------------------------------------------------

export interface StudentDashboardStats {
  totalBookings: number;
  upcomingSessions: number;
  completedSessions: number;
}

export interface MentorDashboardStats {
  pendingCount: number;
  confirmedCount: number;
  completedCount: number;
  isApproved: boolean;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * `Date#getDay()` for a 'YYYY-MM-DD' string.
 *
 * Parsed as local noon rather than midnight: `new Date('2026-01-01')` is UTC
 * midnight, which rolls back a day for anyone west of Greenwich. StudentBookingsPage.jsx:169
 * works around this by appending 'T00:00:00'; doing it once here removes the
 * need for every caller to remember.
 */
export function getDayOfWeek(date: string): DayOfWeek {
  const [year, month, day] = date.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    throw new TypeError(`getDayOfWeek: expected YYYY-MM-DD, received "${date}"`);
  }
  return new Date(year, month - 1, day, 12).getDay() as DayOfWeek;
}

/** 'HH:MM:SS' (Postgres `time`) -> 'HH:MM' (what <input type="time"> wants). */
export function toTimeInputValue(pgTime: string): string {
  return pgTime.slice(0, 5);
}

/** 'HH:MM' or 'HH:MM:SS' -> 'HH:MM:SS' (what Postgres `time` wants). */
export function toPostgresTime(time: string): string {
  return time.length === 5 ? `${time}:00` : time;
}

/** Minutes since midnight for one Postgres `time` value. */
export function timeToMinutes(pgTime: string): number {
  const [hours = 0, minutes = 0] = pgTime.split(':').map(Number);
  return hours * 60 + minutes;
}

export function dayName(day: DayOfWeek): string {
  return DAY_NAMES[day] ?? 'Unknown';
}

/** Today's date as 'YYYY-MM-DD' in the viewer's local timezone. */
export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** 'YYYY-MM-DD' -> 'Wed 4 Mar 2026'. Returns the raw input if unparseable. */
export function formatDateLong(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function initialsOf(fullName: string): string {
  return fullName
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** Sorted unique faculties present on a category list. */
export function collectFaculties(
  categories: ReadonlyArray<Pick<ExpertiseCategoryRow, 'faculty'>>,
): string[] {
  const seen = new Set<string>();
  for (const category of categories) {
    if (category.faculty) seen.add(category.faculty);
  }
  return [...seen].sort();
}
