-- 0007 hotfix: composite RETURN (the anonymous ROW() literal over a named
-- composite type with an untyped string constant trips PL/pgSQL's
-- record-to-composite check -> 42804 "returned record type does not match").
-- Cast the row constructor to the declared result type so the composite is
-- passed through verbatim. Reproduces the corrected bodies of 0003/0006 for
-- databases that already applied the pre-cast versions.

CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id uuid)
 RETURNS booking_request_result
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$

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

$function$;

CREATE OR REPLACE FUNCTION public.request_booking(p_mentor_id uuid, p_scheduled_date date, p_start_time time without time zone, p_end_time time without time zone, p_notes text DEFAULT NULL::text)
 RETURNS booking_request_result
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$

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

$function$;
