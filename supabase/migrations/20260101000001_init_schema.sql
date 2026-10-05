-- ============================================================================
-- MentorMatch :: 0001_init_schema
-- Canonical schema. Idempotent so it can be applied to a fresh database or
-- reconciled against the existing Supabase project.
--
-- Column names deliberately match what the 20 existing pages already query,
-- so this migration is non-breaking for the current frontend.
-- ============================================================================

create extension if not exists "pgcrypto";
-- Required for the mentor-overlap exclusion constraint in 0003.
create extension if not exists "btree_gist";

-- ---------------------------------------------------------------------------
-- Shared lookup tables
-- ---------------------------------------------------------------------------

-- Platform roles. Stored as text + CHECK rather than a native enum so that the
-- existing rows (which hold 'Student'/'Mentor'/'Administrator') need no cast.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text        not null default '',
  email       text        not null,
  role        text        not null default 'Student'
                check (role in ('Student', 'Mentor', 'Administrator')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Public-facing identity for every auth.users row. role is the RBAC source of truth.';

create index if not exists profiles_role_idx on public.profiles (role);

create table if not exists public.expertise_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  description text        not null default '',
  faculty     text        not null default 'General',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint expertise_categories_name_faculty_key unique (name, faculty)
);

create index if not exists expertise_categories_faculty_idx
  on public.expertise_categories (faculty);

-- ---------------------------------------------------------------------------
-- Mentor profile (1:1 with profiles)
-- ---------------------------------------------------------------------------

create table if not exists public.mentor_profiles (
  id           uuid primary key references public.profiles (id) on delete cascade,
  bio          text        not null default '',
  skills       text[]      not null default '{}',
  is_approved  boolean     not null default false,
  -- NEW: IANA timezone. Required to convert the wall-clock scheduled_date /
  -- start_time / end_time triple into an absolute instant for conflict
  -- detection and meeting-link generation.
  timezone     text        not null default 'UTC',
  industry     text,
  years_experience integer check (years_experience is null or years_experience >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on column public.mentor_profiles.timezone is
  'IANA zone (e.g. America/New_York). Defaults to UTC until the mentor sets it.';

create index if not exists mentor_profiles_approved_idx
  on public.mentor_profiles (is_approved)
  where is_approved;

-- Many-to-many mentor <-> expertise category.
create table if not exists public.mentor_expertise (
  mentor_id   uuid not null references public.mentor_profiles (id) on delete cascade,
  category_id uuid not null references public.expertise_categories (id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint mentor_expertise_pkey primary key (mentor_id, category_id)
);

create index if not exists mentor_expertise_category_idx
  on public.mentor_expertise (category_id);

-- ---------------------------------------------------------------------------
-- Availability: recurring weekly template (NOT discrete slots)
--
-- A mentor declares "Mondays 09:00-12:00, Wednesdays 14:00-17:00". A booking
-- then names a concrete date inside one of those windows. This is intentionally
-- NOT a table of bookable slots; see docs/phase1-data-model.md for rationale.
-- ---------------------------------------------------------------------------

create table if not exists public.mentor_availability (
  id          uuid primary key default gen_random_uuid(),
  mentor_id   uuid    not null references public.mentor_profiles (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time  time    not null,
  end_time    time    not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint mentor_availability_time_order check (end_time > start_time),
  -- Prevents the same mentor declaring an identical window twice.
  constraint mentor_availability_unique_window
    unique (mentor_id, day_of_week, start_time, end_time)
);

comment on column public.mentor_availability.day_of_week is
  '0 = Sunday .. 6 = Saturday, matching JS Date#getDay().';

create index if not exists mentor_availability_lookup_idx
  on public.mentor_availability (mentor_id, day_of_week)
  where is_active;

-- ---------------------------------------------------------------------------
-- Bookings
--
-- Additive columns (starts_at, ends_at, timezone, meeting_*) are derived or
-- filled by triggers/RPCs. Existing client inserts that only pass the original
-- columns keep working: 0003 installs a BEFORE INSERT trigger that derives the
-- instants and a CHECK that validates the range.
-- ---------------------------------------------------------------------------

create table if not exists public.mentorship_bookings (
  id             uuid primary key default gen_random_uuid(),
  -- Both FKs land on profiles.id. mentor_profiles.id is 1:1 with profiles.id,
  -- which is why the existing pages can use user.id interchangeably here.
  mentor_id      uuid        not null references public.mentor_profiles (id) on delete cascade,
  student_id     uuid        not null references public.profiles (id) on delete cascade,
  scheduled_date date        not null,
  start_time     time        not null,
  end_time       time       not null,
  status         text        not null default 'pending'
                   check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  notes          text,
  -- NEW: absolute instants derived from the wall-clock triple + mentor timezone.
  -- These are what the exclusion constraint locks on and what meeting links use.
  starts_at      timestamptz not null default now(),
  ends_at        timestamptz not null default now(),
  -- NEW: snapshot of mentor_profiles.timezone at insert time, so a later
  -- timezone change does not retroactively shift historical sessions.
  timezone       text        not null default 'UTC',
  -- NEW: populated on confirmation (Phase 4).
  meeting_provider text     check (meeting_provider is null
                                  or meeting_provider in ('google_meet', 'jitsi')),
  meeting_link     text,
  meeting_created_at timestamptz,
  responded_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint mentorship_bookings_time_order check (end_time > start_time),
  constraint mentorship_bookings_participants_distinct check (student_id <> mentor_id),
  constraint mentorship_bookings_instant_order check (ends_at > starts_at)
);

comment on column public.mentorship_bookings.starts_at is
  'Derived, never client-supplied. See bookings_derive_instants() in 0003.';

create index if not exists mentorship_bookings_mentor_date_idx
  on public.mentorship_bookings (mentor_id, scheduled_date);

create index if not exists mentorship_bookings_student_date_idx
  on public.mentorship_bookings (student_id, scheduled_date);

create index if not exists mentorship_bookings_status_idx
  on public.mentorship_bookings (status);

-- ---------------------------------------------------------------------------
-- Composite return type for the booking RPC (keeps PostgREST output typed)
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'booking_request_result') then
    create type public.booking_request_result as (
      booking_id uuid,
      starts_at  timestamptz,
      ends_at    timestamptz,
      timezone   text,
      status     text
    );
  end if;
end
$$;
