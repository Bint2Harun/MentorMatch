# Phase 4: public marketing site and auth pages

Status: implemented and verified locally. Migrations `0001`-`0005` have never
been applied to a live Supabase project, so the auth flows below are exercised
against stubbed responses rather than a real backend.

## What was built

A shared `MarketingLayout` (`src/components/MarketingLayout.jsx`) renders the
site header, the page outlet and the footer for every public route. Its
bottom-anchored flex column (`min-height: 100vh` with `flex: 1` on the main
element) is what keeps the footer at the end of the document.

Public routes:

| Route | Notes |
| --- | --- |
| `/` | Hero, trust banner, How It Works, About |
| `/login` | Email/password + Google |
| `/register` | Student self-registration |
| `/forgot-password` | Sends the reset email |
| `/reset-password` | Sets the new password after the emailed link |
| `/faq` | Pricing + FAQ, `#help` anchor |
| `/contact` | Support email |
| `/privacy`, `/terms` | Draft legal pages |

## Layout bug worth understanding

`LoginPage` and `RegisterPage` each rendered their own `<main>` *inside*
`MarketingLayout`'s `<main>`. That produced nested main landmarks (invalid HTML,
duplicate landmark for screen readers) and an inner `min-height: 100vh` that
overrode the layout's flex column, which is what pushed the footer out of view
and made the white card appear to overlap the promo column.

Both pages now render a plain `<div className="auth-page">` and let the layout
own the page height. They also no longer render their own brand header, since
`SiteHeader` already provides one.

On viewports at or below 900px the form is ordered *above* the promo
(`order: 1`), so the fields are reachable without scrolling past the headline.

## Colour and accessibility decisions

- The Log In / Create account buttons use `.btn-primary`, which inside
  `.site-shell` resolves to `#0b6b3f`. This deliberately matches the navbar
  Register button rather than duplicating a hex value.
- The navbar Register button itself needed darkening: the global
  `--brand-green` (`#1dbf73`) only reaches 2.4:1 against white text. Marketing
  buttons use `#0b6b3f` (6.58:1). Dashboard buttons keep the original token.
- Input and OAuth button borders are `#7d8b99` (3.49:1 on white) to satisfy
  WCAG 1.4.11 for the field boundary. The lighter `--border` token measured
  1.27:1 and made inputs hard to tell from the card behind them.
- All auth-page text/background pairs were measured and pass WCAG AA.

## Social proof must stay honest

`public_platform_stats()` (migration `0005`) returns counts only. `TrustStats`
renders the banner **only** when at least one metric is greater than zero, and
swallows RPC errors so a missing migration does not surface an error on the
marketing page. There is no reviews table, so no rating is shown. Do not add
placeholder numbers or a hardcoded "4.9/5" to make the page look complete.

## Prerequisites before these flows work in production

Both features are wired but depend on console configuration.

### Google sign-in

1. Supabase -> Authentication -> Providers -> enable **Google** with the
   client id and secret from a Google Cloud OAuth client.
2. Supabase -> Authentication -> URL Configuration -> Redirect URLs must
   include `https://<your-domain>/login` (the app returns users to `/login` and
   lets the existing role router send them to the right dashboard).
3. **Migration `0002` must be applied.** The `on_auth_user_created` trigger
   (`handle_new_user`) creates the `profiles` row. Google supplies `full_name`
   in user metadata, and the trigger falls back to the email local part, so an
   OAuth user gets a valid profile with role `Student`. Without the trigger the
   sign-in succeeds, `profile` stays `null`, and the user is redirected back to
   the home page with no account.

### Password reset

1. Configure **custom SMTP** in Supabase. The built-in SMTP only delivers to
   project team members and is heavily rate limited, so real users will not
   receive reset mail until this is done.
2. Supabase -> Authentication -> URL Configuration -> Redirect URLs must
   include `https://<your-domain>/reset-password`.

`/reset-password` detects a missing recovery session and shows an "expired
link" state rather than a form that silently fails, and it defers that check
until `loading` settles so a valid link is not briefly shown as expired.

## Tailwind v4 migration and the cascade layer trap

The public pages were later restyled onto Tailwind v4 (`@tailwindcss/vite`),
with the dashboards deliberately left on `index.css`. Dark mode is class-based:
a `.dark` class on `<html>`, toggled from the header and persisted under
`mentormatch-theme`.

That split only works because of one line in `src/styles.css`:

```css
@layer theme, base, legacy, components, utilities;

@import "./index.css" layer(legacy);
@import "./marketing-tw.css";
```

`index.css` styles dashboards through bare element selectors that were written
expecting to be *unlayered*, and unlayered rules beat every layered rule
regardless of specificity. Both naive placements fail, in opposite directions:

| `legacy` layer position | Result |
| --- | --- |
| left unlayered | `index.css` beats Tailwind utilities, so `dark:` variants are silently ignored and dark mode is half-applied |
| below `base` | Tailwind preflight also lives in `@layer base`, so preflight beats `index.css` and strips `.btn`'s border, radius and variant colours |

Between `base` and `components` is the only ordering that satisfies both:
preflight loses to `index.css` (dashboards keep their styling) and `index.css`
loses to `utilities` (public pages get correct light and dark colours). Do not
reorder these layers without re-running `verify-dashboards.mjs`.

Two real bugs surfaced while closing out the migration, both of which the
compiler and the build both missed:

- `LoginPage.jsx` used `className={authError}` without importing `authError`.
  An unimported identifier in JSX is a *runtime* `ReferenceError`, so it only
  fired when a login actually failed. `verify-auth-errors.mjs` now drives real
  rejections and asserts the styled banner renders.
- `SiteHeader` read the theme in an effect and immediately called `setState`,
  costing a second render pass for a value it already had. Moved to a lazy
  `useState` initializer; the effect now only syncs the class onto `<html>`.

`src/marketing.css` and `src/App.css` were unreferenced once the Tailwind
classes landed and have been deleted.

The migration also silently dropped a responsive rule from the old stylesheet.
`.auth-layout` had an `@media (max-width: 900px)` block that set
`.auth-card { order: 1 }` and `.auth-promo { order: 2 }`, with a comment
explaining that stacked content had pushed the login form below the fold on
phones. The Tailwind version had no equivalent, so source order won: at 360px
the promo sat at y=194 and the form at y=905, roughly 700px of headline before
the first input. Restored as `order-1`/`order-2` on the shared `authCard` and
`authPromo` constants, with `lg:` variants restoring promo-left/card-right. This
is the kind of rule that a class-by-class port can miss entirely, so
`verify-auth.mjs` now asserts stacking order at eight widths.

## Verification performed

Run against a local Vite server with a placeholder Supabase URL, so the RPC
fails as it would without a project.

- `npx tsc --noEmit` clean; `npx vite build` passes.
- ESLint improved from 13 errors / 1 warning at `HEAD` to 9 errors / 1 warning.
  Every remaining problem is pre-existing in a dashboard or context file; every
  file touched by this work is lint-clean.
- Browser suites (Puppeteer + system Chrome), all passing:
  - `verify-marketing.mjs` 92 assertions: routes, hash anchors, link
    resolution, overflow at 320-1440px, hero/nav/pill/footer content, legal
    draft notices.
  - `verify-truststats.mjs` 14 assertions: banner withheld on all-zero and on
    RPC failure, shown with formatted numbers, notes only when meaningful, no
    invented rating.
  - `verify-auth.mjs` 96 assertions: single `<main>`, no duplicate brand,
    promo/card never intersect, the form stacks above the promo below 1024px and
    trails it above, Log In matches Register colour, uniform pills, card
    shadow/border, password toggle round-trip, forgot link, Google button,
    footer position.
  - `verify-darkmode.mjs` 105 assertions: toggle state, `localStorage`
    persistence, OS-preference default, WCAG contrast pairs in both themes,
    zero horizontal overflow across 9 routes x 12 widths x 2 themes, and a
    dashboard guard that `index.css` still beats preflight.
  - `verify-a11y.mjs` 152 assertions: landmarks, keyboard access, focus
    visibility, reduced motion, accessible names, image alternatives.
  - `verify-dashboards.mjs` 62 assertions across 8 protected routes. Seeds a
    Supabase session into `localStorage` under the key supabase-js derives from
    the project URL, then asserts each dashboard reaches its own route and that
    `.btn` keeps its 8px radius, 40px min-height and variant background while
    inputs keep their 1px border.
  - `verify-auth-errors.mjs` 10 assertions: server rejections from `/token`,
    `/signup` and `/recover` render the styled error and status regions.
  - `audit-auth-contrast.mjs`: 40+ WCAG contrast pairs.

Two test bugs worth noting, because both initially produced confident false
passes rather than failures:

- The Supabase stub answered every `/rest/v1/profiles` request with a single
  object. `AuthContext` fetches with `.single()` but `AdminDashboard` fetches
  the same table as a list, so one of the two always crashed. supabase-js
  signals this through the `Accept` header (`pgrst.object`), so the stub now
  branches on it the way PostgREST does.
- The preflight response omitted `x-supabase-api-version`. That failed CORS, so
  the app reported "Failed to fetch" instead of the server's actual message,
  and a test asserting "an error appeared" would have passed while checking
  nothing about error handling.

## Not covered

- Real sign-in, real OAuth and real reset emails: untested, because no
  Supabase project credentials are available in this environment. The stubbed
  rejections exercise the UI paths only.
- Visual review. Screenshots were produced but could not be inspected
  automatically; layout was verified by measuring geometry rather than by eye.
