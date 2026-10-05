-- ============================================================================
-- MentorMatch :: 0004_mentor_approval_and_search
--
-- Fixes the broken approval pipeline: AdminDashboard.jsx:191 sets
-- is_approved = true but never promotes profiles.role to 'Mentor', so an
-- approved mentor keeps role 'Student' and ProtectedRoute bounces them off
-- /mentor-dashboard. Both writes now happen in one admin-only transaction.
-- ============================================================================

create or replace function public.approve_mentor(p_mentor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN_ADMIN_ONLY'
      using errcode = '42501',
            detail = 'Only Administrators can approve mentors.';
  end if;

  if not exists (select 1 from public.mentor_profiles where id = p_mentor_id) then
    raise exception 'MENTOR_APPLICATION_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  update public.mentor_profiles
     set is_approved = true
   where id = p_mentor_id;

  update public.profiles
     set role = 'Mentor'
   where id = p_mentor_id and role = 'Student';
end;
$$;

create or replace function public.reject_mentor(p_mentor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN_ADMIN_ONLY'
      using errcode = '42501',
            detail = 'Only Administrators can reject mentors.';
  end if;

  -- Demote so a rejected mentor loses mentor-only routes immediately.
  update public.mentor_profiles
     set is_approved = false
   where id = p_mentor_id;

  update public.profiles
     set role = 'Student'
   where id = p_mentor_id and role = 'Mentor';

  -- Existing bookings survive, but the mentor stops appearing in search.
  delete from public.mentor_availability
   where mentor_id = p_mentor_id;
end;
$$;

revoke all on function public.approve_mentor(uuid) from public;
revoke all on function public.reject_mentor(uuid) from public;
grant execute on function public.approve_mentor(uuid) to authenticated;
grant execute on function public.reject_mentor(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- search_mentors: server-side filtering for the browse page.
--
-- Phase 2 moves BrowseMentorsPage off client-side `.filter()` onto this. Doing
-- it in SQL means the result set is paginated and countable, and approved-only
-- is enforced here rather than trusted from the query string.
--
-- p_faculty       exact match on expertise_categories.faculty
-- p_category_ids  any-of match on expertise category ids
-- p_skill         case-insensitive substring against mentor_profiles.skills
-- p_query         case-insensitive substring across name, bio and skills
-- ---------------------------------------------------------------------------

create or replace function public.search_mentors(
  p_faculty      text   default null,
  p_category_ids uuid[] default null,
  p_skill        text   default null,
  p_query        text   default null,
  p_limit        int    default 24,
  p_offset       int    default 0
)
returns table (
  id            uuid,
  full_name     text,
  email         text,
  bio           text,
  skills        text[],
  industry      text,
  years_experience integer,
  timezone      text,
  category_ids  uuid[],
  category_names text[],
  category_faculties text[]
)
language sql
stable
security definer
set search_path = public
as $$
  with filtered as (
    select
      mp.id,
      p.full_name,
      p.email,
      mp.bio,
      mp.skills,
      mp.industry,
      mp.years_experience,
      mp.timezone
    from public.mentor_profiles mp
    join public.profiles p on p.id = mp.id
    where mp.is_approved
      and p.role = 'Mentor'
      and (p_faculty is null or exists (
        select 1
        from public.mentor_expertise me
        join public.expertise_categories ec on ec.id = me.category_id
        where me.mentor_id = mp.id
          and ec.faculty = p_faculty
      ))
      and (p_category_ids is null or cardinality(p_category_ids) = 0 or exists (
        select 1
        from public.mentor_expertise me
        where me.mentor_id = mp.id
          and me.category_id = any (p_category_ids)
      ))
      and (p_skill is null or exists (
        select 1
        from unnest(mp.skills) s
        where s ilike '%' || p_skill || '%'
      ))
      and (p_query is null or
           p.full_name ilike '%' || p_query || '%'
        or mp.bio      ilike '%' || p_query || '%'
        or exists (
          select 1
          from unnest(mp.skills) s
          where s ilike '%' || p_query || '%'
        ))
  )
  select
    f.id,
    f.full_name,
    f.email,
    f.bio,
    f.skills,
    f.industry,
    f.years_experience,
    f.timezone,
    coalesce(c.ids, '{}')      as category_ids,
    coalesce(c.names, '{}')    as category_names,
    coalesce(c.faculties, '{}') as category_faculties
  from filtered f
  left join lateral (
    select
      array_agg(ec.id order by ec.faculty, ec.name)       as ids,
      array_agg(ec.name order by ec.faculty, ec.name)    as names,
      array_agg(ec.faculty order by ec.faculty, ec.name) as faculties
    from public.mentor_expertise me
    join public.expertise_categories ec on ec.id = me.category_id
    where me.mentor_id = f.id
  ) c on true
  order by f.full_name
  limit  greatest(coalesce(p_limit, 24), 1)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.search_mentors(text, uuid[], text, text, int, int) from public;
grant execute on function public.search_mentors(text, uuid[], text, text, int, int)
  to authenticated;

-- ---------------------------------------------------------------------------
-- get_booking_availability: given a mentor and a concrete date, return the
-- bookable sub-windows with what is already taken. Replaces the ad-hoc
-- "select mentor_availability then filter" logic in the booking form.
-- ---------------------------------------------------------------------------

create or replace function public.get_booking_availability(
  p_mentor_id uuid,
  p_date       date
)
returns table (
  window_start time,
  window_end   time,
  is_booked    boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.start_time,
    a.end_time,
    exists (
      select 1
      from public.mentorship_bookings b
      where b.mentor_id = p_mentor_id
        and b.scheduled_date = p_date
        and b.status in ('pending', 'confirmed')
    ) as is_booked
  from public.mentor_availability a
  where a.mentor_id = p_mentor_id
    and a.day_of_week = extract(dow from p_date)::smallint
    and a.is_active
  order by a.start_time;
$$;

revoke all on function public.get_booking_availability(uuid, date) from public;
grant execute on function public.get_booking_availability(uuid, date) to authenticated;
