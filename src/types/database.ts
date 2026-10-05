/**
 * Postgres type mirror for MentorMatch.
 *
 * Hand-maintained to match supabase/migrations/*.sql. Once the migrations are
 * applied to a live project, regenerate with:
 *
 *   npx supabase gen types typescript \
 *     --project-id <ref> \
 *     --schema public > src/types/database.ts
 *
 * and diff. Never hand-edit the row shapes below without changing the SQL too.
 *
 * Usage:
 *   import { createClient } from '@supabase/supabase-js'
 *   import type { Database } from './types/database'
 *   const supabase = createClient<Database>(url, anonKey)
 */

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------
//
// Modelled as string-literal unions, not enums. Postgres holds these as
// text + CHECK (see 0001_init_schema.sql) so the existing rows need no cast,
// and a union gives the same exhaustiveness at the type level.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'Student' | 'Mentor' | 'Administrator';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export type MeetingProvider = 'google_meet' | 'jitsi';

/** 0 = Sunday .. 6 = Saturday. Matches JS `Date#getDay()`. */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// ---------------------------------------------------------------------------
// Row shapes (one entry per column, snake_case as stored)
// ---------------------------------------------------------------------------

export interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface ExpertiseCategoryRow {
  id: string;
  name: string;
  description: string;
  faculty: string;
  created_at: string;
  updated_at: string;
}

export interface MentorProfileRow {
  id: string;
  bio: string;
  skills: string[];
  is_approved: boolean;
  timezone: string;
  industry: string | null;
  years_experience: number | null;
  created_at: string;
  updated_at: string;
}

export interface MentorExpertiseRow {
  mentor_id: string;
  category_id: string;
  created_at: string;
}

export interface MentorAvailabilityRow {
  id: string;
  mentor_id: string;
  day_of_week: DayOfWeek;
  /** Postgres `time` arrives as 'HH:MM:SS'. */
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MentorshipBookingRow {
  id: string;
  mentor_id: string;
  student_id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  notes: string | null;
  starts_at: string;
  ends_at: string;
  timezone: string;
  meeting_provider: MeetingProvider | null;
  meeting_link: string | null;
  meeting_created_at: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Function return shapes
// ---------------------------------------------------------------------------

/** `public.booking_request_result` composite type. */
export interface BookingRequestResult {
  booking_id: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  status: BookingStatus;
}

export interface SearchMentorResult {
  id: string;
  full_name: string;
  email: string;
  bio: string;
  skills: string[];
  industry: string | null;
  years_experience: number | null;
  timezone: string;
  category_ids: string[];
  category_names: string[];
  category_faculties: string[];
}

export interface BookingAvailabilityWindow {
  window_start: string;
  window_end: string;
  is_booked: boolean;
}

// ---------------------------------------------------------------------------
// PostgREST relationship map
// ---------------------------------------------------------------------------

type TablesAndViews = {
  profiles: { Row: ProfileRow; Insert: never; Update: never };
  expertise_categories: { Row: ExpertiseCategoryRow; Insert: never; Update: never };
  mentor_profiles: { Row: MentorProfileRow; Insert: never; Update: never };
  mentor_expertise: { Row: MentorExpertiseRow; Insert: never; Update: never };
  mentor_availability: { Row: MentorAvailabilityRow; Insert: never; Update: never };
  mentorship_bookings: { Row: MentorshipBookingRow; Insert: never; Update: never };
};

/**
 * Write payloads. Supabase's generated types split Insert/Update; the rows
 * above only model reads, because every write in this app goes through a Zod
 * schema (src/types/validation.ts) or an RPC.
 */
export type Tables<T extends keyof TablesAndViews> = TablesAndViews[T]['Row'];

export type TablesInsert<T extends keyof TablesAndViews> =
  TablesAndViews[T]['Insert'];

export type TablesUpdate<T extends keyof TablesAndViews> =
  TablesAndViews[T]['Update'];

export type Enums = {
  UserRole: UserRole;
  BookingStatus: BookingStatus;
  MeetingProvider: MeetingProvider;
  DayOfWeek: DayOfWeek;
};

export type CompositeTypes = {
  booking_request_result: {
    booking_id: string;
    starts_at: string;
    ends_at: string;
    timezone: string;
    status: BookingStatus;
  };
};

/**
 * RPC surface. Argument order here must match the SQL signatures exactly --
 * PostgREST passes positionally.
 */
export type Functions = {
  request_booking: {
    Args: {
      p_mentor_id: string;
      p_scheduled_date: string;
      p_start_time: string;
      p_end_time: string;
      p_notes?: string | null;
    };
    Returns: CompositeTypes['booking_request_result'][];
  };
  cancel_booking: {
    Args: { p_booking_id: string };
    Returns: CompositeTypes['booking_request_result'][];
  };
  approve_mentor: {
    Args: { p_mentor_id: string };
    Returns: undefined;
  };
  reject_mentor: {
    Args: { p_mentor_id: string };
    Returns: undefined;
  };
  search_mentors: {
    Args: {
      p_faculty?: string | null;
      p_category_ids?: string[] | null;
      p_skill?: string | null;
      p_query?: string | null;
      p_limit?: number | null;
      p_offset?: number | null;
    };
    Returns: SearchMentorResult[];
  };
  get_booking_availability: {
    Args: { p_mentor_id: string; p_date: string };
    Returns: BookingAvailabilityWindow[];
  };
};

export type Database = {
  public: {
    Tables: TablesAndViews;
    Views: Record<never, never>;
    Functions: Functions;
    Enums: Enums;
    CompositeTypes: CompositeTypes;
  };
};
