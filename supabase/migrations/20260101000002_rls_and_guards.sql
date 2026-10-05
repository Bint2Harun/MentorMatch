-- ============================================================================
-- MentorMatch :: 0002_rls_and_guards
-- Row Level Security, role helpers, self-escalation guards, signup trigger.
--
-- The frontend talks to Postgres directly with the anon key, so RLS *is* the
-- RBAC layer. There is no application server to enforce anything.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Role helpers (SECURITY DEFINER so policies can read profiles without
-- recursing through the profiles policy)
-- ---------------------------------------------------------------------------

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'Administrator', false);
$$;

-- Does the caller share any booking with this user? Used by the profiles
-- policy so mentors can see their students and vice versa.
create or replace function public.shares_booking_with(p_other_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.mentorship_bookings b
    where (b.mentor_id  = auth.uid() and b.student_id = p_other_user)
       or (b.student_id = auth.uid() and b.mentor_id  = p_other_user)
  );
$$;

-- Is this user an approved, bookable mentor?
create or replace function public.is_approved_mentor(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.mentor_profiles mp
    where mp.id = p_user_id
      and mp.is_approved
      and exists (
        select 1 from public.profiles p
        where p.id = p_user_id and p.role = 'Mentor'
      )
  );
$$;

revoke all on function public.current_role()          from public;
revoke all on function public.is_admin()              from public;
revoke all on function public.shares_booking_with(uuid) from public;
revoke all on function public.is_approved_mentor(uuid)  from public;

-- ---------------------------------------------------------------------------
-- Self-escalation guards
--
-- RLS alone cannot stop a user from writing role='Administrator' or
-- is_approved=true on their own rows, because those columns are in the same
-- table they are allowed to update. These triggers close that hole.
-- ---------------------------------------------------------------------------

create or replace function public.profiles_guard_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'FORBIDDEN_ROLE_CHANGE'
      using errcode = '42501',
            detail = 'Role can only be changed by an Administrator.';
  end if;

  if new.email is distinct from old.email then
    raise exception 'FORBIDDEN_EMAIL_CHANGE'
      using errcode = '42501',
            detail = 'Email is owned by auth.users.';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_privileged_columns on public.profiles;
create trigger profiles_guard_privileged_columns
  before update on public.profiles
  for each row execute function public.profiles_guard_privileged_columns();

create or replace function public.mentor_profiles_guard_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.is_approved is distinct from old.is_approved then
    raise exception 'FORBIDDEN_SELF_APPROVAL'
      using errcode = '42501',
            detail = 'Mentor approval is restricted to Administrators.';
  end if;

  return new;
end;
$$;

drop trigger if exists mentor_profiles_guard_approval on public.mentor_profiles;
create trigger mentor_profiles_guard_approval
  before update on public.mentor_profiles
  for each row execute function public.mentor_profiles_guard_approval();

-- ---------------------------------------------------------------------------
-- Booking status state machine
--
-- pending   -> confirmed | cancelled
-- confirmed -> completed | cancelled
-- completed -> (terminal)
-- cancelled -> (terminal)
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
  elsif new.status = 'cancelled' then
    if auth.uid() <> new.mentor_id and auth.uid() <> new.student_id then
      raise exception 'FORBIDDEN_BOOKING_TRANSITION'
        using errcode = '42501',
              detail = 'Only a participant can cancel this booking.';
    end if;
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

drop trigger if exists mentorship_bookings_guard_transition
  on public.mentorship_bookings;
create trigger mentorship_bookings_guard_transition
  before update on public.mentorship_bookings
  for each row execute function public.mentorship_bookings_guard_transition();

-- ---------------------------------------------------------------------------
-- Signup -> profile provisioning
--
-- RegisterPage never sends a role, so this trigger is what creates the row.
-- Every self-registered user starts as 'Student'.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(new.email, '@', 1)
    ),
    new.email,
    'Student'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists mentor_profiles_touch on public.mentor_profiles;
create trigger mentor_profiles_touch before update on public.mentor_profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists expertise_categories_touch on public.expertise_categories;
create trigger expertise_categories_touch before update on public.expertise_categories
  for each row execute function public.touch_updated_at();

drop trigger if exists mentor_availability_touch on public.mentor_availability;
create trigger mentor_availability_touch before update on public.mentor_availability
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles            enable row level security;
alter table public.mentor_profiles     enable row level security;
alter table public.mentor_expertise    enable row level security;
alter table public.expertise_categories enable row level security;
alter table public.mentor_availability enable row level security;
alter table public.mentorship_bookings enable row level security;

-- profiles ---------------------------------------------------------------
-- Visible: yourself, any admin, any booking partner, and any *approved* mentor
-- (BrowseMentors renders mentor name + email).
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
    or public.shares_booking_with(id)
    or public.is_approved_mentor(id)
  );

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- mentor_profiles --------------------------------------------------------
drop policy if exists mentor_profiles_select on public.mentor_profiles;
create policy mentor_profiles_select on public.mentor_profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin() or is_approved);

drop policy if exists mentor_profiles_insert_self on public.mentor_profiles;
create policy mentor_profiles_insert_self on public.mentor_profiles
  for insert to authenticated
  with check (id = auth.uid() and is_approved = false);

drop policy if exists mentor_profiles_update_self on public.mentor_profiles;
create policy mentor_profiles_update_self on public.mentor_profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists mentor_profiles_admin_all on public.mentor_profiles;
create policy mentor_profiles_admin_all on public.mentor_profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- mentor_expertise -------------------------------------------------------
-- Visible when either side is visible: your own rows, rows of mentors you can
-- see, or expertise of approved mentors (browse/search filtering).
drop policy if exists mentor_expertise_select on public.mentor_expertise;
create policy mentor_expertise_select on public.mentor_expertise
  for select to authenticated
  using (
    mentor_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.mentor_profiles mp
      where mp.id = mentor_expertise.mentor_id and mp.is_approved
    )
  );

drop policy if exists mentor_expertise_write_self on public.mentor_expertise;
create policy mentor_expertise_write_self on public.mentor_expertise
  for all to authenticated
  using (mentor_id = auth.uid() or public.is_admin())
  with check (mentor_id = auth.uid() or public.is_admin());

-- expertise_categories ---------------------------------------------------
drop policy if exists expertise_categories_read on public.expertise_categories;
create policy expertise_categories_read on public.expertise_categories
  for select to authenticated using (true);

drop policy if exists expertise_categories_admin_write on public.expertise_categories;
create policy expertise_categories_admin_write on public.expertise_categories
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- mentor_availability ----------------------------------------------------
-- Always-true on purpose: MentorDetailPage lets any signed-in user read any
-- mentor's weekly hours so a student can judge fit before requesting a slot.
-- Tighten before launch if availability becomes sensitive.
drop policy if exists mentor_availability_select on public.mentor_availability;
create policy mentor_availability_select on public.mentor_availability
  for select to authenticated
  using (true);

drop policy if exists mentor_availability_write_self on public.mentor_availability;
create policy mentor_availability_write_self on public.mentor_availability
  for all to authenticated
  using (mentor_id = auth.uid())
  with check (mentor_id = auth.uid());

-- mentorship_bookings ----------------------------------------------------
drop policy if exists mentorship_bookings_select_participant
  on public.mentorship_bookings;
create policy mentorship_bookings_select_participant
  on public.mentorship_bookings
  for select to authenticated
  using (
    mentor_id = auth.uid()
    or student_id = auth.uid()
    or public.is_admin()
  );

-- Direct inserts are allowed so the existing pages keep working, but the
-- exclusion constraint in 0003 still blocks double-booking at the DB level.
-- New code should call request_booking() instead.
drop policy if exists mentorship_bookings_insert_self
  on public.mentorship_bookings;
create policy mentorship_bookings_insert_self
  on public.mentorship_bookings
  for insert to authenticated
  with check (student_id = auth.uid() and status = 'pending');

drop policy if exists mentorship_bookings_update_participant
  on public.mentorship_bookings;
create policy mentorship_bookings_update_participant
  on public.mentorship_bookings
  for update to authenticated
  using (mentor_id = auth.uid() or student_id = auth.uid() or public.is_admin())
  with check (mentor_id = auth.uid() or student_id = auth.uid() or public.is_admin());
