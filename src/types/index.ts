/**
 * Phase 1 contract barrel.
 *
 * Import contracts from here, not from the individual modules:
 *
 *   import type { BookingRequestInput, AppError } from '../types'
 *
 * The split exists so UI code can depend on domain types without pulling in the
 * Zod runtime.
 */

export type {
  BookingStatus,
  BookingRequestResult,
  BookingAvailabilityWindow,
  Database,
  DayOfWeek,
  Enums,
  ExpertiseCategoryRow,
  Functions,
  Json,
  MeetingProvider,
  MentorAvailabilityRow,
  MentorExpertiseRow,
  MentorProfileRow,
  ProfileRow,
  SearchMentorResult,
  Tables,
  TablesInsert,
  TablesUpdate,
  UserRole,
} from './database';

export {
  BOOKING_STATUS_LABELS,
  DAY_ABBREVIATIONS,
  DAY_NAMES,
  DEFAULT_FACULTY,
  FACULTIES,
  MAX_SESSION_MINUTES,
  MEETING_PROVIDER_LABELS,
  MIN_SESSION_MINUTES,
  ROLE_HOME,
  USER_ROLE_LABELS,
  collectFaculties,
  dayName,
  formatDateLong,
  getDayOfWeek,
  initialsOf,
  timeToMinutes,
  toPostgresTime,
  toTimeInputValue,
  todayIso,
} from './domain';

export type {
  AvailabilitySlot,
  DateAvailability,
  ExpertiseSummary,
  Faculty,
  Identity,
  MentorBookingSummary,
  MentorCard,
  MentorDashboardStats,
  MentorProfileDetail,
  StudentBookingSummary,
  StudentDashboardStats,
} from './domain';

export * from './validation';
export * from './api';
