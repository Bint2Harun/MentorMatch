-- ---------------------------------------------------------------------------
-- 0005: public platform statistics for the landing page social proof banner.
--
-- Why a function instead of a client-side count:
--   * RLS on mentorship_bookings only lets a user see their own bookings, so
--     the browser cannot compute "sessions booked" at all. An aggregate count
--     is deliberately not readable directly.
--   * This function is SECURITY DEFINER and returns counts only -- no ids, no
--     names, no timestamps -- so it exposes no row-level data.
--
-- The landing page hides the banner while every metric is zero, so an empty
-- database does not render "0 mentors" on the marketing site.
--
-- NOTE: this is the first grant in the schema to include `anon`, because `/`
-- is a public route. It is intentionally aggregate-only; keep it that way.
-- ---------------------------------------------------------------------------

create or replace function public.public_platform_stats()
returns table (
  approved_mentors     bigint,
  total_mentors        bigint,
  sessions_booked      bigint,
  completed_sessions   bigint,
  registered_students  bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.mentor_profiles where is_approved) as approved_mentors,
    (select count(*) from public.mentor_profiles)                   as total_mentors,
    (select count(*) from public.mentorship_bookings
      where status in ('pending', 'confirmed', 'completed'))        as sessions_booked,
    (select count(*) from public.mentorship_bookings
      where status = 'completed')                                   as completed_sessions,
    (select count(*) from public.profiles where role = 'Student')   as registered_students;
$$;

comment on function public.public_platform_stats() is
  'Aggregate-only counts for the landing page trust banner. Contains no row-level data.';

revoke all on function public.public_platform_stats() from public;
grant execute on function public.public_platform_stats() to anon, authenticated;
