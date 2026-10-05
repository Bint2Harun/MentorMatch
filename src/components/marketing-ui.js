/**
 * Shared class strings and small primitives for the public marketing pages.
 *
 * These live in JS so a button or badge cannot drift between the header, hero
 * and auth cards. Dark-mode pairs are applied inline here rather than relying on
 * `dark:` variants at each call site.
 */

export const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-[0.95rem] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

export const btnPrimary = `${btnBase} border-brand-700 bg-brand-700 text-white hover:border-brand-800 hover:bg-brand-800 disabled:cursor-not-allowed disabled:border-ink-300 disabled:bg-ink-300`;

export const btnOutline = `${btnBase} border-[var(--hairline-strong)] bg-[var(--surface)] text-ink-900 hover:bg-[var(--surface-muted)] dark:text-ink-50`;

export const btnLarge = `${btnBase} min-h-[50px] rounded-[10px] px-6 py-3 text-[1.02rem]`;

export const sectionWrap = "px-5 py-14 sm:py-18 lg:py-24";

export const sectionInner = "mx-auto w-full max-w-[1180px]";

export const sectionHead = "mx-auto mb-12 max-w-[42rem] text-center";

export const eyebrow =
  "mb-2.5 block text-[0.8rem] font-extrabold tracking-[0.09em] text-brand-600 uppercase dark:text-brand-400";

export const sectionTitle =
  "text-[clamp(1.75rem,3.4vw,2.5rem)] leading-[1.18] font-black tracking-[-0.03em] text-ink-900 dark:text-white";

export const sectionSubtitle =
  "mx-auto mt-3.5 max-w-[36rem] text-[1.05rem] leading-[1.65] text-ink-500 dark:text-ink-300";

export const pill =
  "inline-flex items-center gap-1.5 rounded-full border border-[var(--hairline)] bg-[var(--surface)] px-3 py-1.5 text-[0.85rem] font-semibold whitespace-nowrap text-ink-900 dark:text-ink-50";

export const textLink =
  "font-semibold text-brand-600 underline decoration-1 underline-offset-[3px] hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300";

/** Card surface shared by the How It Works and About grids. */
export const surfaceCard =
  "rounded-2xl border border-[var(--hairline)] bg-[var(--surface)]";

/* ------------------------------------------------------------------ auth */

/** Outer wrapper. */
export const authPage = "px-5 py-8 sm:py-12 lg:py-16";

export const authLayout =
  "mx-auto grid w-full max-w-[1080px] items-center gap-8 lg:grid-cols-[1fr_1.05fr] lg:gap-14";

/*
 * Below `lg` this grid is a single column, so DOM order decides the visual
 * stack. These two `order` pairs deliberately invert it: the card comes first
 * on phones so the fields are reachable without scrolling past the headline,
 * which pushed the login form roughly 700px down the page. Above `lg` the grid
 * has two columns and order is restored to promo-left, card-right.
 *
 * Do not "simplify" these back to source order without re-measuring at 360px.
 */
export const authPromo =
  "order-2 rounded-2xl border border-[var(--hairline)] bg-[var(--surface-sunken)] p-7 sm:p-8 lg:order-1";

export const authTitle =
  "text-[clamp(1.7rem,3.2vw,2.2rem)] leading-[1.15] font-black tracking-[-0.03em] text-ink-900 dark:text-white";

export const authLede =
  "mt-4 text-[1.02rem] leading-[1.7] text-ink-500 dark:text-ink-300";

export const authPills =
  "mt-6 flex list-none flex-wrap gap-2 p-0";

export const authCard =
  "order-1 rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-7 shadow-[0_2px_16px_rgba(11,28,50,0.06)] sm:p-9 lg:order-2";

export const authCardTitle =
  "text-[1.5rem] leading-tight font-black tracking-[-0.025em] text-ink-900 dark:text-white";

export const authCardSub = "mt-2 text-[0.97rem] text-ink-500 dark:text-ink-300";

export const authLabel =
  "mb-1.5 block text-[0.9rem] font-semibold text-ink-700 dark:text-ink-200";

/* The border is a custom step because the default hairline fails the 3:1
   non-text contrast requirement for input boundaries. */
export const authInput =
  "w-full rounded-[10px] border border-[var(--hairline-strong)] bg-[var(--surface)] px-3.5 py-3 text-[1rem] text-ink-900 transition-colors placeholder:text-ink-400 focus:border-brand-600 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-600 dark:text-white dark:placeholder:text-ink-500";

export const authPasswordWrap = "relative";

export const authPasswordToggle =
  "absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-[10px] text-ink-500 transition-colors hover:text-ink-900 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600 dark:text-ink-400 dark:hover:text-white";

export const authOauth =
  "flex w-full items-center justify-center gap-2.5 rounded-[10px] border border-[var(--hairline-strong)] bg-[var(--surface)] px-4 py-3 text-[0.97rem] font-semibold text-ink-900 transition-colors hover:bg-[var(--surface-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-ink-50";

export const authDivider =
  "my-5 text-center text-[0.85rem] font-semibold text-ink-400 dark:text-ink-500";

export const authNote =
  "mb-5 rounded-xl border border-[var(--hairline)] bg-[var(--surface-sunken)] px-4 py-3 text-[0.88rem] leading-relaxed text-ink-500 dark:text-ink-300";

export const authError =
  "mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-[0.92rem] font-medium text-red-800 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-200";

export const authSuccess =
  "mb-4 flex items-start gap-2.5 rounded-xl border border-brand-300 bg-brand-50 px-4 py-3 text-[0.92rem] font-medium text-brand-900 dark:border-brand-500/40 dark:bg-brand-900/30 dark:text-brand-100";

export const authSubmit =
  "mt-5 inline-flex w-full items-center justify-center rounded-[10px] border border-brand-700 bg-brand-700 px-4 py-3 text-[1rem] font-bold text-white transition-colors hover:border-brand-800 hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:border-ink-300 disabled:bg-ink-300";

export const authRule = "my-6 border-t border-[var(--hairline)]";

export const authFoot = "text-center text-[0.95rem] text-ink-500 dark:text-ink-300";

/* ink-400/ink-500 only reach ~3.3:1 on white and on the dark surface, so this
   de-emphasised link uses ink-500 (light) / ink-400 (dark) to clear 4.5:1. */
export const authBack =
  "mx-auto mt-6 inline-flex items-center gap-1.5 text-[0.88rem] font-semibold text-ink-500 no-underline transition-colors hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-200";
