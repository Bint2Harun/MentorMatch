-- ============================================================================
-- MentorMatch :: 0006_booking_buffers
--
-- Adds configurable buffer intervals between back-to-back sessions and
-- hardens the booking write path:
--
--   1. mentor_profiles.buffer_minutes      per-mentor gap, default 15 mins,
--                                          editable by the mentor via RLS.
--   2. mentorship_bookings.buffer_minutes  snapshot at insert time, exactly
--                                          like timezone already is, so a
--                                          later mentor edit never
--                                          retroactively re-litigates
--                                          existing bookings.
--   3. A second partial EXCLUDE constraint enforces the gap between live
--                                          sessions. Postgres predicate-locks
--                                          the conflicting range, so the
--                                          guarantee holds under concurrent
--                                          requests with no app-level lock.
--   4. request_booking() now takes a per-mentor row lock (serialising
--                                          concurrent RPC calls), pre-checks
--                                          plain overlap and buffer gaps
--                                          separately, and maps each failure
--                                          to a distinct error code the UI
--                                          can translate into a real sentence.
--
-- INSTALL SAFETY: existing booking rows snapshot buffer_minutes = 0, so the
-- new constraint is satisfied everywhere the 0003 overlap constraint already
-- is -- installing it cannot fail on live data. Gaps only bind bookings made
-- from now on, and a new booking expands on BOTH sides by the mentor's
-- current buffer, so it cannot be wedged against a legacy neighbour either.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Per-mentor buffer setting.
-- ---------------------------------------------------------------------------

alter table public.mentor_profiles
  add column if not exists buffer_minutes smallint not null default 15;

alter table public.mentor_profiles
  drop constraint if exists mentor_profiles_buffer_minutes_range;

alter table public.mentor_profiles
  add constraint mentor_profiles_buffer_minutes_range
  check (buffer_minutes between 0 and 120);

comment on column public.mentor_profiles.buffer_minutes is
  'Required clear-air gap in minutes between back-to-back sessions (0-120). Snapshotted onto each booking at insert time.';

-- ---------------------------------------------------------------------------
-- 2. Per-booking snapshot of the mentor buffer.
-- ---------------------------------------------------------------------------

alter table public.mentorship_bookings
  add column if not exists buffer_minutes smallint not null default 0;

alter table public.mentorship_bookings
  drop constraint if exists mentorship_bookings_buffer_minutes_range;

alter table public.mentorship_bookings
  add constraint mentorship_bookings_buffer_minutes_range
  check (buffer_minutes between 0 and 120);

comment on column public.mentorship_bookings.buffer_minutes is
  'mentor_profiles.buffer_minutes at insert time. Existing rows are 0 (pre-buffer history); new bookings carry the mentor gap then-current.';

-- ---------------------------------------------------------------------------
-- 3. Derive trigger now snapshots timezone AND buffer in one mentor lookup.
--    Same contract as before: runs on insert, and on updates that touch the
--    wall-clock triple, overwriting anything the client sent.
-- ---------------------------------------------------------------------------

create or replace function public.bookings_derive_instants()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tz     text;
  v_buffer smallint;
begin
  select coalesce(mp.timezone, 'UTC'),
         coalesce(mp.buffer_minutes, 15)
    into v_tz, v_buffer
  from public.mentor_profiles mp
  where mp.id = new.mentor_id;

  if v_tz is null then
    raise exception 'MENTOR_NOT_FOUND'
      using errcode = 'P0002',
            detail = 'No mentor_profiles row for the referenced mentor.';
  end if;

  new.timezone       := v_tz;
  new.buffer_minutes := v_buffer;
  new.starts_at      := (new.scheduled_date + new.start_time) at time zone v_tz;
  new.ends_at        := (new.scheduled_date + new.end_time)   at time zone v_tz;

  if new.ends_at <= new.starts_at then
    raise exception 'INVALID_TIME_RANGE'
      using errcode = '22007',
            detail = 'End time must be after start time.';
  end if;

  return new;
end;
$$;

-- The trigger itself is unchanged (created in 0003); replacing the function
-- body is enough because the trigger stores the same OID.

-- ---------------------------------------------------------------------------
-- 4. Buffer-edge helpers.
--
-- A buffer is a pure minutes offset, so shifting a timestamptz by it is
-- genuinely timezone-independent arithmetic. Yet PostgreSQL marks the built-in
-- `timestamptz - interval` operator STABLE (day/month components vary by zone),
-- and STABLE functions are banned from index expressions (SQLSTATE 42P17).
-- These IMMUTABLE wrappers therefore encode the contract that only minute
-- offsets are ever passed. They are used uniformly by the preflight, the
-- exclusion constraint (which REQUIRES immutability) and the RPC pre-checks.
-- ---------------------------------------------------------------------------

create function public.buffer_edge_start(t timestamptz, mins integer)
returns timestamptz
language sql
immutable strict
set search_path = public
as $$
  select t - make_interval(mins => mins)
$$;

create function public.buffer_edge_end(t timestamptz, mins integer)
returns timestamptz
language sql
immutable strict
set search_path = public
as $$
  select t + make_interval(mins => mins)
$$;

comment on function public.buffer_edge_start(timestamptz, integer) is
  'IMMUTABLE wrapper over timestamptz - interval. Safe only because buffers are whole minutes, never months/days.';
comment on function public.buffer_edge_end(timestamptz, integer) is
  'IMMUTABLE wrapper over timestamptz + interval. Safe only because buffers are whole minutes, never months/days.';

-- PREFLIGHT: refuse to install the constraint if buffered overlaps already
-- exist (possible only if someone hand-inserted a non-zero buffer row).
-- Pairwise check -- the 0003 grouping-by-exact-range version could miss
-- partially overlapping windows.

do $$
declare
  v_conflicts int;
begin
  select count(*)
    into v_conflicts
  from public.mentorship_bookings a
  join public.mentorship_bookings b
    on a.mentor_id = b.mentor_id
   and a.id < b.id
   and a.status in ('pending', 'confirmed')
   and b.status in ('pending', 'confirmed')
   and tstzrange(
         public.buffer_edge_start(a.starts_at, a.buffer_minutes),
         public.buffer_edge_end(a.ends_at,   a.buffer_minutes),
         '[)'
       )
    && tstzrange(
         public.buffer_edge_start(b.starts_at, b.buffer_minutes),
         public.buffer_edge_end(b.ends_at,   b.buffer_minutes),
         '[)'
       );

  if v_conflicts > 0 then
    raise exception
      'Cannot install bookings_no_buffer_gap: % buffered overlap pair(s) already exist.',
      v_conflicts
      using errcode = 'check_violation',
            detail = 'Cancel the overlapping bookings, then re-apply this migration.';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 5. The buffer guarantee: one mentor cannot hold two live sessions closer
--    together than the snapshotted buffer. Scoped exactly like the plain
--    overlap constraint, so cancelled/completed history never collides.
-- ---------------------------------------------------------------------------

alter table public.mentorship_bookings
  drop constraint if exists bookings_no_buffer_gap;

alter table public.mentorship_bookings
  add constraint bookings_no_buffer_gap
  exclude using gist (
    mentor_id with =,
    tstzrange(
      public.buffer_edge_start(starts_at, buffer_minutes),
      public.buffer_edge_end(ends_at,   buffer_minutes),
      '[)'
    ) with &&
  )
  where (status in ('pending', 'confirmed'));

comment on constraint bookings_no_buffer_gap on public.mentorship_bookings is
  'Live sessions for one mentor must keep buffer_minutes of clear air on both sides. Pre-existing rows snapshot 0, so history is never retroactively invalidated.';

-- ---------------------------------------------------------------------------
-- 6. request_booking v2: serialised per mentor, distinct failure codes.
--
-- SECURITY DEFINER bypasses RLS, so every rule is re-checked explicitly.
-- The FOR UPDATE row lock serialises concurrent RPC calls for the same
-- mentor, which makes the friendly pre-checks race-free; the exclusion
-- constraints remain the atomic backstop for direct legacy inserts.
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
  v_buffer   smallint;
  v_dow      smallint;
  v_starts   timestamptz;
  v_ends     timestamptz;
  v_booking  uuid;
  v_diag     text;
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

  -- Serialise every concurrent booking attempt for this mentor. One lock per
  -- call, always the same single row, so request_booking cannot deadlock
  -- against itself. Committed rows become visible to the waiters, which turns
  -- the race into a clean pre-check failure below.
  select coalesce(mp.timezone, 'UTC'),
         coalesce(mp.buffer_minutes, 15)
    into v_tz, v_buffer
  from public.mentor_profiles mp
  where mp.id = p_mentor_id
    for update;

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

  -- --- plain overlap, then buffer gap. Checked in that order so an actual
  --     double-booking always reports SLOT_CONFLICT, never BUFFER_CONFLICT.
  if exists (
    select 1
    from public.mentorship_bookings b
    where b.mentor_id = p_mentor_id
      and b.status in ('pending', 'confirmed')
      and tstzrange(b.starts_at, b.ends_at, '[)')
       && tstzrange(v_starts, v_ends, '[)')
  ) then
    raise exception 'SLOT_CONFLICT'
      using errcode = 'P0001',
            detail = 'That slot was just taken. Pick another time.';
  end if;

  if v_buffer > 0 and exists (
    select 1
    from public.mentorship_bookings b
    where b.mentor_id = p_mentor_id
      and b.status in ('pending', 'confirmed')
      and tstzrange(
            public.buffer_edge_start(b.starts_at, b.buffer_minutes),
            public.buffer_edge_end(b.ends_at,   b.buffer_minutes),
            '[)'
          )
       && tstzrange(
            public.buffer_edge_start(v_starts, v_buffer),
            public.buffer_edge_end(v_ends,   v_buffer),
            '[)'
          )
  ) then
    raise exception 'BUFFER_CONFLICT'
      using errcode = '22023',
            detail = format(
              'This mentor keeps a %s-minute gap between sessions. Choose a time further from the neighbouring booking.',
              v_buffer
            );
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

  -- --- insert; the exclusion constraints are the real concurrency gate --
  begin
    insert into public.mentorship_bookings
      (mentor_id, student_id, scheduled_date, start_time, end_time, notes)
    values
      (p_mentor_id, v_user, p_scheduled_date, p_start_time, p_end_time,
       nullif(btrim(coalesce(p_notes, '')), ''))
    returning id into v_booking;
  exception
    when exclusion_violation then
      -- Whichever constraint fired, translate it into a stable code the UI
      -- can map to a sentence. The constraint name is embedded in the
      -- Postgres error message.
      get stacked diagnostics v_diag = MESSAGE_TEXT;

      if coalesce(v_diag, '') like '%bookings_no_buffer_gap%' then
        raise exception 'BUFFER_CONFLICT'
          using errcode = '22023',
                detail = format(
                  'This mentor keeps a %s-minute gap between sessions. Choose a time further from the neighbouring booking.',
                  v_buffer
                );
      end if;

      raise exception 'SLOT_CONFLICT'
        using errcode = 'P0001',
              detail = 'That slot was just taken. Pick another time.';
  end;

  return (v_booking, v_starts, v_ends, v_tz, 'pending')::public.booking_request_result;
end;
$$;

revoke all on function public.request_booking(uuid, date, time, time, text) from public;
grant execute on function public.request_booking(uuid, date, time, time, text)
  to authenticated;

-- cancel_booking (0003) is unchanged: participants-only, terminal states
-- rejected, and the status trigger enforces the state machine underneath it.
