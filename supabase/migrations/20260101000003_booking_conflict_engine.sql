-- ============================================================================
-- MentorMatch :: 0003_booking_conflict_engine
--
-- Closes the double-booking hole. Today both MentorDetailPage.jsx:135 and
-- StudentBookingsPage.jsx:207 insert bookings straight from the browser after
-- at-most a client-side overlap check, so two simultaneous requests for the
-- same slot both succeed. Here the database refuses the second one.
--
-- Mechanism: a partial EXCLUDE constraint on (mentor_id, tstzrange(...)).
-- Postgres takes a predicate lock on the conflicting index range, so this is
-- safe under concurrency without an application-level lock.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Derive absolute instants from the wall-clock triple + mentor timezone.
--
-- Runs BEFORE INSERT so that the 20 existing pages -- which only send
-- scheduled_date / start_time / end_time -- keep working unchanged. It also
-- overwrites any client-supplied starts_at/ends_at, so those columns cannot be
-- spoofed.
-- ---------------------------------------------------------------------------

create or replace function public.bookings_derive_instants()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tz text;
begin
  select coalesce(mp.timezone, 'UTC')
    into v_tz
  from public.mentor_profiles mp
  where mp.id = new.mentor_id;

  if v_tz is null then
    raise exception 'MENTOR_NOT_FOUND'
      using errcode = 'P0002',
            detail = 'No mentor_profiles row for the referenced mentor.';
  end if;

  new.timezone  := v_tz;
  new.starts_at := (new.scheduled_date + new.start_time) at time zone v_tz;
  new.ends_at   := (new.scheduled_date + new.end_time)   at time zone v_tz;

  -- Re-derive the day-of-week check: the date must be consistent with the
  -- timezone used to interpret the local times.
  if new.ends_at <= new.starts_at then
    raise exception 'INVALID_TIME_RANGE'
      using errcode = '22007',
            detail = 'End time must be after start time.';
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_derive_instants on public.mentorship_bookings;
create trigger bookings_derive_instants
  before insert or update of scheduled_date, start_time, end_time
  on public.mentorship_bookings
  for each row execute function public.bookings_derive_instants();

-- ---------------------------------------------------------------------------
-- Backfill instants for rows that predate this migration.
-- ---------------------------------------------------------------------------

update public.mentorship_bookings b
   set timezone  = coalesce(
         (select mp.timezone from public.mentor_profiles mp where mp.id = b.mentor_id),
         'UTC'),
       starts_at = (b.scheduled_date + b.start_time)
                     at time zone coalesce(
                       (select mp.timezone from public.mentor_profiles mp where mp.id = b.mentor_id),
                       'UTC'),
       ends_at   = (b.scheduled_date + b.end_time)
                     at time zone coalesce(
                       (select mp.timezone from public.mentor_profiles mp where mp.id = b.mentor_id),
                       'UTC')
 where b.starts_at = b.ends_at;   -- untouched rows still hold the now() default

-- ---------------------------------------------------------------------------
-- PREFLIGHT: refuse to install the constraint if live data already conflicts.
-- Resolve the reported rows (cancel the later duplicate) and re-run.
-- ---------------------------------------------------------------------------

do $$
declare
  v_conflicts int;
begin
  select count(*) into v_conflicts
  from (
    select 1
    from public.mentorship_bookings
    where status in ('pending', 'confirmed')
    group by mentor_id, tstzrange(starts_at, ends_at, '[)')
    having count(*) > 1
  ) overlapping;

  if v_conflicts > 0 then
    raise exception
      'Cannot install bookings_no_mentor_overlap: % overlapping mentor slot group(s) already exist.',
      v_conflicts
      using errcode = 'check_violation',
            detail = 'Run the duplicate-detection query in docs/phase1-data-model.md, cancel the later duplicates, then re-apply this migration.';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- The guarantee: one mentor cannot hold two overlapping live sessions.
-- ---------------------------------------------------------------------------

alter table public.mentorship_bookings
  drop constraint if exists bookings_no_mentor_overlap;

alter table public.mentorship_bookings
  add constraint bookings_no_mentor_overlap
  exclude using gist (
    mentor_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (status in ('pending', 'confirmed'));

comment on constraint bookings_no_mentor_overlap on public.mentorship_bookings is
  'A mentor cannot be double-booked. Scoped to pending+confirmed so cancelled and completed history never collides.';

-- ---------------------------------------------------------------------------
-- OPTIONAL, not enabled by default: also stop one student from being in two
-- mentoring sessions at once. Left off because it is a product decision, not a
-- correctness one -- enable by uncommenting.
--
--   alter table public.mentorship_bookings
--     add constraint bookings_no_student_overlap
--     exclude using gist (
--       student_id with =,
--       tstzrange(starts_at, ends_at, '[)') with &&
--     )
--     where (status in ('pending', 'confirmed'));
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- request_booking: the only sanctioned write path for new bookings.
--
-- SECURITY DEFINER bypasses RLS, so every authorization rule is re-checked
-- explicitly below. This is intentional: it gives one place where the whole
-- booking invariant set lives.
-- ---------------------------------------------------------------------------

create or replace function public.request_booking(
  p_mentor_id      uuid,
  p_scheduled_date date,
  p_start_time     time,
  p_end_time       time,
  p_notes          text default null
)
returns public.booking_request_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user     uuid        := auth.uid();
  v_role     text;
  v_tz       text;
  v_dow      smallint;
  v_starts   timestamptz;
  v_ends     timestamptz;
  v_booking  uuid;
begin
  -- --- identity & role -------------------------------------------------
  if v_user is null then
    raise exception 'UNAUTHENTICATED'
      using errcode = '28000',
            detail = 'You must be signed in to request a booking.';
  end if;

  v_role := public.current_role();
  if v_role not in ('Student', 'Mentor') then
    raise exception 'FORBIDDEN_ROLE'
      using errcode = '42501',
            detail = 'Administrators moderate the platform and do not book sessions.';
  end if;

  if p_mentor_id = v_user then
    raise exception 'SELF_BOOKING'
      using errcode = '22023',
            detail = 'You cannot book a session with yourself.';
  end if;

  -- --- target mentor ---------------------------------------------------
  if not public.is_approved_mentor(p_mentor_id) then
    raise exception 'MENTOR_NOT_BOOKABLE'
      using errcode = '22023',
            detail = 'That mentor is not available for booking.';
  end if;

  select coalesce(mp.timezone, 'UTC') into v_tz
  from public.mentor_profiles mp
  where mp.id = p_mentor_id;

  -- --- shape of the requested session ---------------------------------
  if p_end_time <= p_start_time then
    raise exception 'INVALID_TIME_RANGE'
      using errcode = '22007',
            detail = 'End time must be after start time.';
  end if;

  if (p_end_time - p_start_time) < interval '15 minutes' then
    raise exception 'SESSION_TOO_SHORT'
      using errcode = '22023',
            detail = 'Sessions must be at least 15 minutes.';
  end if;

  if (p_end_time - p_start_time) > interval '120 minutes' then
    raise exception 'SESSION_TOO_LONG'
      using errcode = '22023',
            detail = 'Sessions cannot exceed 120 minutes.';
  end if;

  if p_scheduled_date < (now() at time zone v_tz)::date then
    raise exception 'SLOT_IN_PAST'
      using errcode = '22023',
            detail = 'Choose today or a future date.';
  end if;

  v_starts := (p_scheduled_date + p_start_time) at time zone v_tz;
  v_ends   := (p_scheduled_date + p_end_time)   at time zone v_tz;

  if v_starts < now() then
    raise exception 'SLOT_IN_PAST'
      using errcode = '22023',
      detail = 'Choose today or a future date.';
  end if;

  -- --- availability containment ---------------------------------------
  -- The requested session must fit entirely inside ONE active window.
  -- StudentBookingsPage.jsx:193 only requires *overlap*, so today a student
  -- can request 08:00-11:00 against a lone 09:00-10:00 window.
  v_dow := extract(dow from p_scheduled_date)::smallint;

  if not exists (
    select 1
    from public.mentor_availability a
    where a.mentor_id   = p_mentor_id
      and a.day_of_week = v_dow
      and a.is_active
      and a.start_time  <= p_start_time
      and p_end_time    <= a.end_time
  ) then
    raise exception 'OUTSIDE_AVAILABILITY'
      using errcode = '22023',
            detail = 'That time is not fully inside the mentor''s published availability.';
  end if;

  -- --- duplicate open request to the same mentor ----------------------
  if exists (
    select 1
    from public.mentorship_bookings b
    where b.student_id     = v_user
      and b.mentor_id      = p_mentor_id
      and b.status        in ('pending', 'confirmed')
      and b.scheduled_date = p_scheduled_date
  ) then
    raise exception 'DUPLICATE_REQUEST'
      using errcode = '22023',
            detail = 'You already have an open request to this mentor on that date.';
  end if;

  -- --- insert; the exclusion constraint is the real concurrency gate ----
  begin
    insert into public.mentorship_bookings
      (mentor_id, student_id, scheduled_date, start_time, end_time, notes)
    values
      (p_mentor_id, v_user, p_scheduled_date, p_start_time, p_end_time,
       nullif(btrim(coalesce(p_notes, '')), ''))
    returning id into v_booking;
  exception
    when exclusion_violation then
      raise exception 'SLOT_CONFLICT'
        using errcode = 'P0001',
              detail = 'That slot was just taken. Pick another time.';
  end;

  return (v_booking, v_starts, v_ends, v_tz, 'pending');
end;
$$;

revoke all on function public.request_booking(uuid, date, time, time, text) from public;
grant execute on function public.request_booking(uuid, date, time, time, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- cancel_booking: lets a student release a pending hold so the slot frees up
-- for someone else without waiting for mentor action.
-- ---------------------------------------------------------------------------

create or replace function public.cancel_booking(p_booking_id uuid)
returns public.booking_request_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.mentorship_bookings;
begin
  select * into v_booking
  from public.mentorship_bookings b
  where b.id = p_booking_id
    and (b.mentor_id = auth.uid() or b.student_id = auth.uid());

  if not found then
    raise exception 'BOOKING_NOT_FOUND'
      using errcode = 'P0002',
            detail = 'No such booking, or you are not a participant.';
  end if;

  if v_booking.status in ('completed', 'cancelled') then
    raise exception 'INVALID_BOOKING_TRANSITION'
      using errcode = '22023',
            detail = format('Booking is already %s.', v_booking.status);
  end if;

  update public.mentorship_bookings
     set status = 'cancelled'
   where id = p_booking_id;

  return (v_booking.id, v_booking.starts_at, v_booking.ends_at,
          v_booking.timezone, 'cancelled')::public.booking_request_result;
end;
$$;

revoke all on function public.cancel_booking(uuid) from public;
grant execute on function public.cancel_booking(uuid) to authenticated;
