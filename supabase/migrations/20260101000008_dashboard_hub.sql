-- ============================================================================
-- MentorMatch :: 0008_dashboard_hub
--
-- Student-dashboard upgrade: profile enrichment, booking lifecycle metadata,
-- auto meeting links, in-app notifications, and rescheduling.
--
--   1. profiles       adds avatar_url / interests / learning_goals /
--                     preferred_topics. The existing profiles_update_self RLS
--                     policy (0002) already lets a student edit rows they own,
--                     and the guard trigger still blocks role/email changes,
--                     so no new profile policies are needed.
--   2. bookings       adds cancelled_by (student/mentor/administrator) so the
--                     UI can tell "Declined by mentor" from "Cancelled by you".
--                     The status guard also learns confirmed -> pending, the
--                     reschedule transition, which only the student may take.
--   3. meeting links  confirming a session auto-generates a Jitsi link
--                     (meeting_provider = 'jitsi', meet.jit.si/MentorMatch-<id>),
--                     so "Join Meeting" always works for accepted sessions.
--   4. notifications  new table + triggers + RLS. Entries are created on
--                     request, confirm, complete, cancel and reschedule, and
--                     reminders for the next 24h are materialised lazily by
--                     get_my_notifications() (no cron dependency).
--   5. reschedule     reschedule_booking() re-runs the full booking invariant
--                     set (request_booking's rules) inside one transaction and
--                     drops the session back to 'pending' for mentor re-approval.
--   6. avatars        Storage bucket + per-object policies for photo uploads.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Student profile enrichment.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists avatar_url      text,
  add column if not exists interests       text[]      not null default '{}',
  add column if not exists learning_goals  text        not null default '',
  add column if not exists preferred_topics text[]     not null default '{}';

comment on column public.profiles.avatar_url is
  'Public Storage URL for the profile photo. Students upload to the avatars bucket; initials render while this is null.';
comment on column public.profiles.interests is
  'Free-form tags describing what the student cares about (mentors see these).';
comment on column public.profiles.learning_goals is
  'Short paragraph describing what the student wants to achieve with mentoring.';
comment on column public.profiles.preferred_topics is
  'Tags describing the specific tech/topics the student wants to cover.';

-- ---------------------------------------------------------------------------
-- 2. Who cancelled a booking.
-- ---------------------------------------------------------------------------

alter table public.mentorship_bookings
  add column if not exists cancelled_by text
    check (cancelled_by in ('student', 'mentor', 'administrator'));

comment on column public.mentorship_bookings.cancelled_by is
  'Role of the actor who cancelled/declined the booking. Lets the student UI show "Declined by mentor" instead of a generic "Cancelled". Set by the status transition trigger.';

-- ---------------------------------------------------------------------------
-- 3. Status guard v2: track cancelled_by, allow student-driven reschedule.
-- ---------------------------------------------------------------------------

create or replace function public.mentorship_bookings_guard_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor text := public.current_role();
begin
  if new.status is not distinct from old.status then
    new.updated_at := now();
    return new;
  end if;

  -- Admin moderation bypasses the state machine (support overrides).
  if actor = 'Administrator' then
    new.updated_at := now();
    new.responded_at := now();
    if new.status = 'cancelled' then
      new.cancelled_by := 'administrator';
    end if;
    return new;
  end if;

  if old.status = 'pending' and new.status = 'confirmed' then
    if actor <> 'Mentor' or auth.uid() <> new.mentor_id then
      raise exception 'FORBIDDEN_BOOKING_TRANSITION'
        using errcode = '42501',
              detail = 'Only the booked mentor can confirm this request.';
    end if;
  elsif old.status = 'confirmed' and new.status = 'completed' then
    if actor <> 'Mentor' or auth.uid() <> new.mentor_id then
      raise exception 'FORBIDDEN_BOOKING_TRANSITION'
        using errcode = '42501',
              detail = 'Only the booked mentor can complete this session.';
    end if;
  elsif old.status = 'confirmed' and new.status = 'pending' then
    -- Reschedule: the student updates the date/time and the session returns
    -- to pending so the mentor re-approves the new time.
    if auth.uid() <> new.student_id then
      raise exception 'FORBIDDEN_BOOKING_TRANSITION'
        using errcode = '42501',
              detail = 'Only the student can reschedule a session back to pending.';
    end if;
  elsif new.status = 'cancelled' then
    if auth.uid() <> new.mentor_id and auth.uid() <> new.student_id then
      raise exception 'FORBIDDEN_BOOKING_TRANSITION'
        using errcode = '42501',
              detail = 'Only a participant can cancel this booking.';
    end if;
    new.cancelled_by := case when actor = 'Mentor' then 'mentor' else 'student' end;
  else
    raise exception 'INVALID_BOOKING_TRANSITION'
      using errcode = '22023',
            detail = format('Cannot move booking from %s to %s.', old.status, new.status);
  end if;

  new.updated_at := now();
  new.responded_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Auto meeting link (Jitsi) when a session is confirmed.
-- ---------------------------------------------------------------------------

create or replace function public.bookings_ship_meeting_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'confirmed'
     and new.meeting_link is null
     and new.meeting_provider is null then
    new.meeting_provider   := 'jitsi';
    new.meeting_link       := 'https://meet.jit.si/MentorMatch-' || replace(new.id::text, '-', '');
    new.meeting_created_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_ship_meeting_link on public.mentorship_bookings;
create trigger bookings_ship_meeting_link
  before insert or update of status on public.mentorship_bookings
  for each row execute function public.bookings_ship_meeting_link();

-- Backfill confirmed rows created before this migration.
update public.mentorship_bookings
   set status = status
 where status = 'confirmed'
   and meeting_link is null;

-- ---------------------------------------------------------------------------
-- 5. Notifications.
-- ---------------------------------------------------------------------------

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  type       text not null default 'system'
               check (type in ('booking_status', 'mentor_reply', 'session_reminder', 'system')),
  title      text not null,
  body       text not null default '',
  booking_id uuid references public.mentorship_bookings (id) on delete cascade,
  is_read    boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, is_read, created_at desc);

drop trigger if exists notifications_touch on public.notifications;
create trigger notifications_touch
  before update on public.notifications
  for each row execute function public.touch_updated_at();

alter table public.notifications enable row level security;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- New request -> notify the mentor. Fires for request_booking() and legacy
-- direct inserts alike; reschedule_booking() never inserts, so it cannot
-- double-notify here.
create or replace function public.ship_booking_request_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_name text;
begin
  select p.full_name into v_student_name
  from public.profiles p
  where p.id = new.student_id;

  insert into public.notifications (user_id, type, title, body, booking_id)
  values (
    new.mentor_id,
    'booking_status',
    'New booking request',
    format(
      '%s requested %s, %s–%s (mentor time, %s). Confirm or decline it from My Bookings.',
      coalesce(v_student_name, 'A student'),
      to_char(new.scheduled_date, 'YYYY-MM-DD'),
      to_char(new.start_time, 'HH24:MI'),
      to_char(new.end_time, 'HH24:MI'),
      new.timezone
    ),
    new.id
  );

  return new;
end;
$$;

drop trigger if exists bookings_notify_request on public.mentorship_bookings;
create trigger bookings_notify_request
  after insert on public.mentorship_bookings
  for each row execute function public.ship_booking_request_notification();

create or replace function public.ship_booking_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mentor_name  text;
  v_student_name text;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  select p.full_name into v_mentor_name  from public.profiles p where p.id = new.mentor_id;
  select p.full_name into v_student_name from public.profiles p where p.id = new.student_id;

  if old.status = 'pending' and new.status = 'confirmed' then
    insert into public.notifications (user_id, type, title, body, booking_id)
    values (
      new.student_id,
      'booking_status',
      'Session accepted',
      format(
        '%s accepted your %s, %s–%s session.',
        coalesce(v_mentor_name, 'Your mentor'),
        to_char(new.scheduled_date, 'YYYY-MM-DD'),
        to_char(new.start_time, 'HH24:MI'),
        to_char(new.end_time, 'HH24:MI')
      ),
      new.id
    );

  elsif old.status = 'confirmed' and new.status = 'completed' then
    insert into public.notifications (user_id, type, title, body, booking_id)
    values (
      new.student_id,
      'booking_status',
      'Session completed',
      format('Your %s session with %s has ended.', to_char(new.scheduled_date, 'YYYY-MM-DD'), coalesce(v_mentor_name, 'your mentor')),
      new.id
    );

  elsif new.status = 'cancelled' then
    if new.cancelled_by = 'mentor' then
      insert into public.notifications (user_id, type, title, body, booking_id)
      values (
        new.student_id,
        'booking_status',
        case when old.status = 'confirmed' then 'Session cancelled' else 'Session declined' end,
        format(
          '%s %s the %s session.',
          coalesce(v_mentor_name, 'The mentor'),
          case when old.status = 'confirmed' then 'cancelled' else 'declined' end,
          to_char(new.scheduled_date, 'YYYY-MM-DD')
        ),
        new.id
      );
    elsif new.cancelled_by = 'student' then
      insert into public.notifications (user_id, type, title, body, booking_id)
      values (
        new.mentor_id,
        'booking_status',
        'Request cancelled',
        format('%s cancelled the %s session.', coalesce(v_student_name, 'The student'), to_char(new.scheduled_date, 'YYYY-MM-DD')),
        new.id
      );
    elsif new.cancelled_by = 'administrator' then
      insert into public.notifications (user_id, type, title, body, booking_id)
      values (
        new.student_id,
        'system',
        'Booking closed by an administrator',
        format('Your %s session with %s was closed by a platform administrator.', to_char(new.scheduled_date, 'YYYY-MM-DD'), coalesce(v_mentor_name, 'your mentor')),
        new.id
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_notify_status on public.mentorship_bookings;
create trigger bookings_notify_status
  after update of status on public.mentorship_bookings
  for each row execute function public.ship_booking_notifications();

-- ---------------------------------------------------------------------------
-- 6. reschedule_booking: the sanctioned reschedule write path.
--
-- Mirrors request_booking()'s validation order so the codes the UI already
-- translates (SLOT_CONFLICT, BUFFER_CONFLICT, OUTSIDE_AVAILABILITY, ...) apply
-- verbatim. Conflict checks exclude the booking being moved, so rescheduling
-- frees the old slot as it claims the new one. SECURITY DEFINER bypasses RLS,
-- so every rule is re-checked explicitly, exactly as in request_booking().
-- ---------------------------------------------------------------------------

create or replace function public.reschedule_booking(
  p_booking_id      uuid,
  p_scheduled_date  date,
  p_start_time      time,
  p_end_time        time,
  p_notes           text default null
)
returns public.booking_request_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user          uuid := auth.uid();
  v_booking       public.mentorship_bookings;
  v_tz            text;
  v_buffer        smallint;
  v_dow           smallint;
  v_starts        timestamptz;
  v_ends          timestamptz;
  v_student_name  text;
begin
  -- --- identity & ownership --------------------------------------------
  if v_user is null then
    raise exception 'UNAUTHENTICATED'
      using errcode = '28000',
            detail = 'You must be signed in to reschedule a session.';
  end if;

  select * into v_booking
  from public.mentorship_bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'BOOKING_NOT_FOUND'
      using errcode = 'P0002',
            detail = 'No such booking.';
  end if;

  if v_booking.student_id <> v_user then
    raise exception 'FORBIDDEN_BOOKING_TRANSITION'
      using errcode = '42501',
            detail = 'Only the requesting student can reschedule this session.';
  end if;

  if v_booking.status not in ('pending', 'confirmed') then
    raise exception 'INVALID_BOOKING_TRANSITION'
      using errcode = '22023',
            detail = format(
              'Cannot reschedule a %s session. Create a new request instead.',
              v_booking.status
            );
  end if;

  -- Serialise against concurrent request_booking() calls for this mentor
  -- (same single-row lock, same deadlock-free shape as request_booking).
  select coalesce(mp.timezone, 'UTC'),
         coalesce(mp.buffer_minutes, 15)
    into v_tz, v_buffer
  from public.mentor_profiles mp
  where mp.id = v_booking.mentor_id
    for update;

  v_tz := coalesce(v_tz, 'UTC');
  v_buffer := coalesce(v_buffer, 15);

  -- --- shape / past / availability / conflicts: request_booking's rules ---
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

  v_dow := extract(dow from p_scheduled_date)::smallint;

  if not exists (
    select 1
    from public.mentor_availability a
    where a.mentor_id   = v_booking.mentor_id
      and a.day_of_week = v_dow
      and a.is_active
      and a.start_time  <= p_start_time
      and p_end_time    <= a.end_time
  ) then
    raise exception 'OUTSIDE_AVAILABILITY'
      using errcode = '22023',
            detail = 'That time is not fully inside the mentor''s published availability.';
  end if;

  -- The slot being vacated by THIS reschedule must not block the new time.
  if exists (
    select 1
    from public.mentorship_bookings b
    where b.mentor_id = v_booking.mentor_id
      and b.id <> p_booking_id
      and b.status in ('pending', 'confirmed')
      and tstzrange(b.starts_at, b.ends_at, '[)')
       && tstzrange(v_starts, v_ends, '[)')
  ) then
    raise exception 'SLOT_CONFLICT'
      using errcode = 'P0001',
            detail = 'That time was just taken. Pick another slot.';
  end if;

  if v_buffer > 0 and exists (
    select 1
    from public.mentorship_bookings b
    where b.mentor_id = v_booking.mentor_id
      and b.id <> p_booking_id
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

  if exists (
    select 1
    from public.mentorship_bookings b
    where b.student_id     = v_user
      and b.mentor_id      = v_booking.mentor_id
      and b.id <> p_booking_id
      and b.status        in ('pending', 'confirmed')
      and b.scheduled_date = p_scheduled_date
  ) then
    raise exception 'DUPLICATE_REQUEST'
      using errcode = '22023',
            detail = 'You already have an open request to this mentor on that date.';
  end if;

  -- --- apply: back to pending for mentor re-approval ---------------------
  -- The status trigger gates confirmed -> pending on the student being the
  -- requester (which we are); the derive trigger recomputes starts_at/ends_at
  -- for the exclusion index; any Jitsi link from the old confirmation is
  -- cleared until the mentor confirms again.
  update public.mentorship_bookings
     set scheduled_date     = p_scheduled_date,
         start_time         = p_start_time,
         end_time           = p_end_time,
         notes              = nullif(btrim(coalesce(p_notes, '')), ''),
         status             = 'pending',
         meeting_provider   = null,
         meeting_link       = null,
         meeting_created_at = null
   where id = p_booking_id;

  select p.full_name into v_student_name
  from public.profiles p
  where p.id = v_user;

  insert into public.notifications (user_id, type, title, body, booking_id)
  values (
    v_booking.mentor_id,
    'booking_status',
    'Session rescheduled',
    format(
      '%s rescheduled the session to %s, %s–%s. Please re-confirm the new time.',
      coalesce(v_student_name, 'The student'),
      to_char(p_scheduled_date, 'YYYY-MM-DD HH24:MI'),
      to_char(p_start_time, 'HH24:MI'),
      to_char(p_end_time, 'HH24:MI')
    ),
    p_booking_id
  );

  return (v_booking.id, v_starts, v_ends, v_tz, 'pending')::public.booking_request_result;
end;
$$;

revoke all on function public.reschedule_booking(uuid, date, time, time, text) from public;
grant execute on function public.reschedule_booking(uuid, date, time, time, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 7. get_my_notifications: unread entries + lazily materialised reminders.
--    The 24h lookahead turns "remind me before the session" into data without
--    installing pg_cron: the first poll after the 24h window fires once per
--    booking (idempotent), then reads the full read-only list.
-- ---------------------------------------------------------------------------

create or replace function public.get_my_notifications()
returns table (
  id         uuid,
  type       text,
  title      text,
  body       text,
  booking_id uuid,
  is_read    boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    return;
  end if;

  insert into public.notifications (user_id, type, title, body, booking_id)
  select
    b.student_id,
    'session_reminder',
    'Upcoming session',
    format(
      'Your session with %s starts within the next 24 hours, at %s, %s–%s. Join from My Bookings.',
      p.full_name,
      to_char(b.scheduled_date, 'YYYY-MM-DD'),
      to_char(b.start_time, 'HH24:MI'),
      to_char(b.end_time, 'HH24:MI')
    ),
    b.id
  from public.mentorship_bookings b
  join public.mentor_profiles mp on mp.id = b.mentor_id
  join public.profiles p          on p.id  = mp.id
  where b.student_id = v_user
    and b.status = 'confirmed'
    and b.starts_at > now()
    and b.starts_at <= now() + interval '24 hours'
    and not exists (
      select 1
      from public.notifications n
      where n.user_id = v_user
        and n.booking_id = b.id
        and n.type = 'session_reminder'
    );

  return query
  select n.id, n.type, n.title, n.body, n.booking_id, n.is_read, n.created_at
  from public.notifications n
  where n.user_id = v_user
  order by n.created_at desc
  limit 30;
end;
$$;

revoke all on function public.get_my_notifications() from public;
grant execute on function public.get_my_notifications() to authenticated;

-- ---------------------------------------------------------------------------
-- 8. avatars Storage bucket + per-object policies.
--    Public read so <img src> works everywhere; uploads/edits restricted to
--    the object owner (avatar paths are avatars/<user_id>/...).
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and owner = auth.uid());

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid())
  with check (bucket_id = 'avatars' and owner = auth.uid());