# Phase 4: public marketing site and auth pages

Status: implemented and verified locally. Not yet committed, and migrations
`0001`-`0005` have never been applied to a live Supabase project.

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

## Verification performed

Run against a local Vite server with a placeholder Supabase URL, so the RPC
fails as it would without a project.

- `npx tsc --noEmit` clean; `npx vite build` passes.
- ESLint unchanged at 10 problems (9 errors, 1 warning), all pre-existing in
  dashboard files. Every file touched here is lint-clean.
- Browser suites (Puppeteer + system Chrome), all passing:
  - `verify-marketing.mjs` 92 assertions: routes, hash anchors, link
    resolution, overflow at 320-1440px, hero/nav/pill/footer content, legal
    draft notices.
  - `verify-truststats.mjs` 14 assertions: banner withheld on all-zero and on
    RPC failure, shown with formatted numbers, notes only when meaningful, no
    invented rating.
  - `verify-auth.mjs` 87 assertions: single `<main>`, no duplicate brand,
    promo/card never intersect, Log In matches Register colour, uniform pills,
    card shadow/border, password toggle round-trip, forgot link, Google button,
    footer position.
  - `audit-auth-contrast.mjs`: 40+ WCAG contrast pairs.
  - Zero horizontal overflow across 9 pages x 11 widths.

## Not covered

- Real sign-in, real OAuth and real reset emails: untested, because no
  Supabase project credentials are available in this environment.
- Visual review. Screenshots were produced but could not be inspected
  automatically; layout was verified by measuring geometry rather than by eye.
