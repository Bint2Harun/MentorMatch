# Phase 1 — Data Model & API Contracts

Status: **draft for review.** Nothing has been applied to any database yet.

## 1. Architecture decision

The brief assumed React + Node/Express + Prisma. The repository is a
**React 19 + Vite SPA with Supabase as the backend** (Postgres + Auth + PostgREST),
and 20 pages already read and write Supabase directly with the anon key.

Decision taken: **Supabase-native.** Consequences:

- There is no application server, so **RLS *is* the authorization layer**. Every
  rule in migration `0002` is load-bearing, not defence-in-depth.
- "Transactional locks" become a Postgres `EXCLUDE` constraint. That is a
  stronger guarantee than an application lock, not a weaker one.
- API contracts are **RPC signatures** (PostgREST `POST /rest/v1/rpc/*`) plus
  **Supabase Edge Functions** for the only work that needs secrets: email and
  meeting-link provisioning.
- No page needs rewriting to adopt this. The additive columns and the
  `BEFORE INSERT` trigger keep today's direct inserts working.

## 2. Entity relationships

```
                    auth.users
                         │ 1:1 (trigger-provisioned)
                         ▼
                   ┌───────────┐
                   │ profiles  │  role: Student | Mentor | Administrator
                   └───────────┘
                         │ 1:1                  │ 1:N                    ▲
                         ▼                      │                        │ N:1
              ┌──────────────────┐               │              ┌───────────────┐
              │ mentor_profiles  │               │              │  profiles     │
              │  is_approved     │               │              │ (participants)│
              │  timezone (NEW)  │               │              └───────────────┘
              │  industry (NEW)  │               │                      ▲
              └──────────────────┘               │                      │
                 │            ▲                  │                      │
       ┌─────────┴──────┐     │                  │                      │
       │ N:M            │     │                  │                      │
       ▼                │     │                  │                      │
┌─────────────────┐  ┌──┴───────────────┐  ┌────┴──────────────────────────────┐
│ mentor_expertise│  │ mentor_          │  │        mentorship_bookings       │
└────────┬────────┘  │ availability     │  │  mentor_id ──┐                     │
         │           │ (weekly template)│  │  student_id ─┤  EXCLUDE constraint  │
         ▼           └──────────────────┘  │  starts_at   │  on (mentor_id,     │
┌──────────────────────┐                  │  ends_at     │   tstzrange(...))   │
│ expertise_categories │                  └─────────────┴─────────────────────┘
│  faculty             │
└──────────────────────┘
```

`mentor_profiles.id` and `profiles.id` are the **same uuid**. That is why the
existing pages can write `.eq("mentor_id", user.id)` and get the right rows, and
why `ApplyMentorPage` can `upsert({ id: user.id })`. Preserved deliberately.

## 3. Tables

| Table | Purpose | Changed in Phase 1 |
|---|---|---|
| `profiles` | Identity + role. One row per `auth.users`. | — |
| `expertise_categories` | Admin-managed taxonomy, grouped by `faculty`. | — |
| `mentor_profiles` | Mentor-only fields + approval flag. | **+`timezone`**, `+industry`, `+years_experience` |
| `mentor_expertise` | N:M mentor ↔ category. | — |
| `mentor_availability` | **Recurring weekly template**, not discrete slots. | — |
| `mentorship_bookings` | The booking pipeline. | **+`starts_at`**, `+`ends_at`, `+`timezone`, `+`meeting_*`, `+`responded_at` |

### Why `timezone` is the keystone column

A booking is stored as a *wall-clock* triple (`scheduled_date` + `start_time` +
`end_time`). That is ambiguous on its own — 10:00 in London is a different
instant from 10:00 in Lagos. Conflict detection and meeting links both need an
absolute instant, so:

- `mentor_profiles.timezone` (IANA) says how to read the mentor's wall clock.
- `bookings_derive_instants()` (`0003`) converts the triple to
  `starts_at` / `ends_at` (`timestamptz`) on every insert, using the mentor's
  zone.
- The exclusion constraint locks on `tstzrange(starts_at, ends_at)`, which is
  DST-correct across the spring/autumn transitions, unlike naive `time` maths.
- `bookings.timezone` snapshots the zone at booking time so a later profile
  change does not retroactively move historical sessions.

## 4. The double-booking fix

Today both `MentorDetailPage.jsx:135` and `StudentBookingsPage.jsx:207` insert
from the browser after at most a client-side overlap check, so two concurrent
requests for the same slot both succeed. The fix is a partial exclusion
constraint (`0003`):

```sql
exclude using gist (
  mentor_id with =,
  tstzrange(starts_at, ends_at, '[)') with &&
)
where (status in ('pending', 'confirmed'))
```

Postgres takes a predicate lock on the conflicting index range, so the second
concurrent insert is rejected by the database, not by a hopeful `SELECT`.

**Trade-off you should decide on.** Scoping the predicate to `pending` means an
unanswered request holds the slot. If a student requests Monday 10:00 and the
mentor never responds, nobody else can have Monday 10:00 until that request is
cancelled. Two ways out:

1. Ship as-is and rely on `cancel_booking()` (`0003`) to let students release
   their own holds.
2. Narrow the predicate to `status = 'confirmed'`, which permits a queue of
   competing requests but then needs a mentor-side check on confirm.

Recommendation: **ship as-is**, and add the `mentor-expire-stale` sweep (already
declared in `api.ts#EDGE_FUNCTIONS`) to auto-cancel requests older than ~7 days.

### Also fixed: the containment bug

`StudentBookingsPage.jsx:193` only requires the request to *overlap* an
availability window, so a student can currently request `08:00–11:00` against a
lone `09:00–10:00` window. `request_booking()` requires the session to sit
**entirely inside one** window (`0003`).

## 5. Also fixed: the approval pipeline

`AdminDashboard.jsx:191` sets `is_approved = true` and never touches
`profiles.role`. An approved mentor therefore keeps role `Student` and
`ProtectedRoute` bounces them off `/mentor-dashboard`. `approve_mentor()`
(`0004`) performs both writes in one admin-only transaction; `reject_mentor()`
demotes the role and clears availability.

## 6. Authorization model

Roles are `text + CHECK` rather than Postgres enums, so existing rows need no
cast. Self-escalation is blocked by triggers, because RLS cannot stop a user
writing `role = 'Administrator'` on a row they are already allowed to update:

| Attempt | Result | Enforced by |
|---|---|---|
| Change own `role` | `FORBIDDEN_ROLE_CHANGE` | `profiles_guard_privileged_columns` |
| Change own `email` | `FORBIDDEN_EMAIL_CHANGE` | same |
| Self-approve mentor profile | `FORBIDDEN_SELF_APPROVAL` | `mentor_profiles_guard_approval` |
| Mentor confirms someone else's booking | `FORBIDDEN_BOOKING_TRANSITION` | `mentorship_bookings_guard_transition` |
| Skip a state (`pending` → `completed`) | `INVALID_BOOKING_TRANSITION` | same |
| Book yourself | `SELF_BOOKING` | `request_booking` |
| Approve a mentor as non-admin | `FORBIDDEN_ADMIN_ONLY` | `approve_mentor` |

State machine: `pending → confirmed → completed`, with `cancelled` reachable
from `pending` and `confirmed`. `completed` and `cancelled` are terminal.
`BOOKING_TRANSITIONS` in `validation.ts` mirrors it so the UI stops rendering
buttons that are guaranteed to fail.

`profiles` visibility is scoped: yourself, any admin, any booking partner, and
any **approved** mentor (browse needs mentor name + email). Everything else is
invisible to other students.

**Known looseness:** `mentor_availability` is readable by any signed-in user.
That matches current behaviour (`MentorDetailPage` shows weekly hours to anyone)
and is deliberate for a booking marketplace. Tighten before launch if that
changes.

## 7. TypeScript contracts

| File | Contents |
|---|---|
| `src/types/database.ts` | Row shapes, RPC signatures, composite type. Mirror of the SQL. |
| `src/types/domain.ts` | Unions, view models, label maps, pure date/time helpers. |
| `src/types/validation.ts` | One Zod schema per form and per RPC argument. |
| `src/types/api.ts` | Response envelope, `AppError` taxonomy, Edge Function contracts. |
| `src/types/index.ts` | Barrel. |

`tsconfig.json` sets `allowJs: true` with `checkJs: false`, so the 20 existing
`.jsx` pages keep building untouched while new `.ts` files are fully strict
(`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`). Pages move
to `.tsx` one at a time in Phase 3.

Verified: `npx tsc --noEmit` clean, and 26 runtime assertions against the Zod
schemas and error mapper pass.

### Error handling shape

Every failure is one `AppErrorCode`. Components branch on `code`, never on a raw
Postgres message. `parsePostgrestError()` reads the marker the SQL functions
`raise`, prefers the SQL `DETAIL` as the user-facing message, and degrades
anything unrecognised to `UNEXPECTED` so driver text never reaches the UI.

```
PostgREST { code: 'P0001', message: 'SLOT_CONFLICT', details: 'That slot was just taken.' }
  -> AppError { code: 'SLOT_CONFLICT', message: 'That slot was just taken.', retryable: false }
```

### Centralised lookups

`DAY_NAMES`, `BOOKING_STATUS_LABELS`, `USER_ROLE_LABELS`, `FACULTIES` and
`ROLE_HOME` were each duplicated across 3–5 pages. They now have one home in
`domain.ts`. `getDayOfWeek()` parses `YYYY-MM-DD` at **local noon** — plain
`new Date('2026-01-01')` is UTC midnight and silently rolls back a day for
users west of Greenwich, which is the bug
`StudentBookingsPage.jsx:169` was working around inline.

## 8. Runbook

1. **Preflight.** Find pre-existing double bookings before the constraint can
   be installed:

   ```sql
   select mentor_id, scheduled_date, start_time, end_time, count(*) as n,
          array_agg(id order by created_at) as booking_ids
   from mentorship_bookings
   where status in ('pending', 'confirmed')
   group by mentor_id, scheduled_date, start_time, end_time
   having count(*) > 1;
   ```

   Cancel the later duplicate in each group. Migration `0003` refuses to
   install itself if any overlapping group remains, and names the count.

2. Apply in order: `0001` → `0002` → `0003` → `0004`.

3. Regenerate types against the live project and diff:

   ```bash
   npx supabase gen types typescript --project-id <ref> --schema public > src/types/database.ts
   ```

4. Backfill `mentor_profiles.timezone` for existing mentors (it defaults to
   `UTC`, which is correct-but-wrong for most). Until a mentor sets it, their
   slots are interpreted as UTC.

5. **Do not** point the app at the new schema until Phase 2 lands. `0002`
   tightens `profiles` visibility; existing pages keep working, but verify
   `AdminDashboard` user list and `BrowseMentorsPage` still render.

## 9. Findings outside the data model

Recorded here because they affect Phase 2/3 planning, not because they are
fixed yet:

- `App.jsx:98-104` registers `/mentor-availability` twice; the second uses
  `requiredRole=`, a prop `ProtectedRoute.jsx:4` does not accept, so it renders
  children with no role check at all.
- Role checks are duplicated: `ProtectedRoute` guards some routes while
  `MentorBookingsPage.jsx:164`, `StudentBookingsPage.jsx:365` and
  `MentorDashboard.jsx:253` each re-implement an inline "Access Denied". One
  `useRole()` hook should replace all four.
- `index.html:5` references `/favicon.svg`; `public/` is empty in the working
  tree, so the favicon 404s.
- No `.env` is present and `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are
  read at `src/lib/supabase.js:3-4`. `.env` is also not in `.gitignore`, so it
  would be committed — add it before creating the file.
- Roughly 200 lines of hand-written `.map()` PostgREST-join normalisation
  (`BrowseMentorsPage:50`, `StudentBookingsPage:116`,
  `MentorBookingsPage:55`, `AdminDashboard:95`) duplicate the view models in
  `domain.ts`. Phase 3 replaces them with typed adapters.
