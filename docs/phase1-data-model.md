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

4. **Skipped for an empty database.** Backfilling `mentor_profiles.timezone`
   only matters when mentors already exist; it defaults to `UTC`, which is
   correct-but-wrong for most. Until a mentor sets it, their slots are
   interpreted as UTC. With no pre-existing rows there is nothing to backfill.

5. Phase 2 has landed, so the app can be pointed at the new schema. `0002`
   tightens `profiles` visibility, so re-check `AdminDashboard`'s user list and
   `BrowseMentorsPage` after applying. `BrowseMentorsPage` now reads mentors
   through the `search_mentors` RPC, which requires `0004`.

## 9. Findings outside the data model

Originally recorded here as open items. Status as of Phase 2:

- **Fixed.** `App.jsx` registered `/mentor-availability` twice; the second used
  a `requiredRole=` prop that `ProtectedRoute` does not accept, so it carried no
  role check at all. The duplicate is gone. `ProtectedRoute` now treats a
  missing or empty `allowedRoles` as **deny** rather than allow, so a mistyped
  prop can no longer silently open a route; use `allowedRoles={null}` to opt
  out deliberately.
- **Fixed.** Role checks were duplicated between `ProtectedRoute` and seven
  inline "Access Denied" panels (`AdminCategoriesPage`, `AdminDashboard`,
  `MentorBookingsPage`, `MentorDashboard`, `MentorEditProfilePage`,
  `StudentBookingsPage`, `StudentDashboard`). They now share
  `src/hooks/useRole.js` and `src/components/AccessDenied.jsx`. The hook also
  fixes a visible bug: the old `profile?.role !== "Mentor"` guards were true
  while `profile` was still `null`, so every guarded page flashed
  "Access Denied" during profile load.
- **Fixed.** `index.html` referenced a missing `/favicon.svg`; the logo now
  supplies `favicon.ico` plus PNG, Apple touch and Android icons, and the
  unused Vite scaffold `public/favicon.svg` and `public/icons.svg` are removed.
- **Fixed.** `.env` was not in `.gitignore` (only `*.local` was), so a real
  `.env` would have been committed. `.gitignore` now excludes `.env` and
  `.env.*`, and `.env.example` documents the two variables. Never commit the
  `service_role` key: it bypasses RLS.
- **Partially done.** `BrowseMentorsPage` now calls the `search_mentors` RPC
  (faculty filtering and pagination in SQL) instead of fetching every approved
  mentor and filtering in the browser, which removes its nested PostgREST-join
  normalisation. The equivalent hand-written `.map()` normalisation in
  `StudentBookingsPage`, `MentorBookingsPage` and `AdminDashboard` is still
  there; Phase 3 replaces all four with typed adapters over `domain.ts`.
- **Still open.** The home page scrolls horizontally below ~480px because of a
  hero image wrapper with `minWidth: "260px"` (`src/pages/HomePage.jsx`). The
  page header wraps correctly, but the hero overflow is untouched.
