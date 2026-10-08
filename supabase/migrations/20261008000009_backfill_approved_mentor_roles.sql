-- Keep profiles.role in sync for mentor applications approved before the
-- admin dashboard was wired to the atomic approval RPC.
alter table public.profiles
  disable trigger profiles_guard_privileged_columns;

update public.profiles p
set role = 'Mentor',
    updated_at = now()
from public.mentor_profiles mp
where mp.id = p.id
  and mp.is_approved
  and p.role = 'Student';

alter table public.profiles
  enable trigger profiles_guard_privileged_columns;
