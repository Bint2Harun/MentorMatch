import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import TrustStats from "../components/TrustStats";
import {
  btnLarge,
  btnOutline,
  btnPrimary,
  eyebrow,
  pill,
  sectionHead,
  sectionInner,
  sectionSubtitle,
  sectionTitle,
  sectionWrap,
  surfaceCard,
  textLink,
} from "../components/marketing-ui";
import {
  SearchIcon,
  CalendarIcon,
  VideoIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
} from "../components/Icons";

const STEPS = [
  {
    icon: SearchIcon,
    title: "Choose an expert",
    body: "Browse verified mentors by subject, industry, faculty and live availability.",
  },
  {
    icon: CalendarIcon,
    title: "Pick a date & time",
    body: "Select a slot that matches the mentor's weekly availability. No double bookings, ever.",
  },
  {
    icon: VideoIcon,
    title: "Connect 1-on-1",
    body: "Meet over video and accelerate your skills with guidance built around your goals.",
  },
];

const GUARANTEES = [
  { icon: ShieldCheckIcon, text: "Every mentor is reviewed before they appear" },
  { icon: CalendarIcon, text: "Conflict-free scheduling, enforced in the database" },
  { icon: VideoIcon, text: "Focused one-to-one sessions, not group calls" },
];

/** Quick filter prompts under the hero search field (Task 2.2). */
const SEARCH_CHIPS = [
  "Computer Science",
  "Design",
  "Career Advice",
  "Data Science",
];

const cardBody = "text-[0.97rem] leading-[1.65] text-ink-500 dark:text-ink-300";

/** Build the mentor results path for a query, ready to hand to navigate(). */
function searchPathFor(query) {
  const trimmed = (query || "").trim();
  return trimmed
    ? `/browse-mentors?q=${encodeURIComponent(trimmed)}`
    : "/browse-mentors";
}

function HomePage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  // Sample session shown in the hero preview card. Anchored a few days ahead
  // and formatted in the visitor's own locale/timezone, so the mockup never
  // goes stale and demonstrates local-time display.
  const sampleSession = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() + 3);
    start.setHours(16, 0, 0, 0);
    const end = new Date(start.getTime() + 45 * 60 * 1000);

    const dateFormat = new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const timeFormat = new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });

    return {
      dateLabel: dateFormat.format(start),
      timeLabel: `${timeFormat.format(start)} – ${timeFormat.format(end)}`,
    };
  }, []);

  // Chips and the search button share one path: pre-fill the field, then run
  // the search on /browse-mentors. Guests keep their query through login via
  // the redirectTo parameter instead of losing it.
  const runSearch = (term) => {
    const next = typeof term === "string" ? term : query;
    setQuery(next);

    const target = searchPathFor(next);
    navigate(
      user ? target : `/login?redirectTo=${encodeURIComponent(target)}`
    );
  };

  const handleSearch = (event) => {
    event.preventDefault();
    runSearch(query);
  };

  return (
    <>
      {/* ---------------------------------------------------------- Hero */}
      <section className={`${sectionWrap} pt-10 sm:pt-14`}>
        {/* Balanced two-column grid: equal tracks keep the text column and the
            visual column the same width on desktop/tablet, so the right half
            never collapses into empty whitespace. */}
        <div className={`${sectionInner} grid items-center gap-12 lg:grid-cols-2 lg:gap-16`}>
          <div className="lg:max-w-[34rem]">
            <span className={pill}>
              <ShieldCheckIcon
                width={16}
                height={16}
                className="text-brand-600 dark:text-brand-400"
              />
              Verified industry mentors
            </span>

            <h1 className="mt-5 text-[clamp(2.2rem,5.6vw,3.5rem)] leading-[1.08] font-black tracking-[-0.035em] text-ink-900 dark:text-white">
              Find Your{" "}
              <span className="text-brand-600 dark:text-brand-400">
                Perfect Mentor
              </span>
              .<br />
              Accelerate Your Skills.
            </h1>

            <p className="mt-6 text-[1.08rem] leading-[1.7] text-ink-500 dark:text-ink-300">
              A secure platform for students to find mentors, view real
              availability, request sessions, and avoid booking conflicts.
            </p>

            {/* Integrated search: one bordered control, button docked inside */}
            <form
              className="mt-8 flex w-full max-w-[560px] flex-col gap-2.5 rounded-[14px] border border-[var(--hairline-strong)] bg-[var(--surface)] p-2 sm:flex-row sm:items-center"
              onSubmit={handleSearch}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2.5 px-2">
                <span
                  className="shrink-0 text-ink-500 dark:text-ink-400"
                  aria-hidden="true"
                >
                  <SearchIcon width={20} height={20} />
                </span>

                <input
                  type="search"
                  className="min-h-11 min-w-0 flex-1 border-0 bg-transparent py-2.5 text-[1rem] text-ink-900 outline-none placeholder:text-ink-500 focus-visible:outline-none dark:text-white dark:placeholder:text-ink-400"
                  placeholder="Search by subject, industry, or skill"
                  aria-label="Search mentors"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className={`${btnPrimary} min-h-11 w-full shrink-0 sm:w-auto`}
              >
                Search
              </button>
            </form>

            {/* Quick filter prompts: one click pre-fills the field and runs
                the search on /browse-mentors. */}
            <div
              role="group"
              aria-label="Popular searches"
              className="mt-4 flex w-full max-w-[560px] flex-wrap items-center gap-2"
            >
              <span className="mr-0.5 text-[0.85rem] font-semibold text-ink-500 dark:text-ink-400">
                Popular:
              </span>
              {SEARCH_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => runSearch(chip)}
                  className="inline-flex min-h-11 items-center rounded-full border border-[var(--hairline-strong)] bg-[var(--surface)] px-4 py-2 text-[0.85rem] font-semibold text-ink-700 transition-colors hover:border-brand-600 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:text-ink-200 dark:hover:border-brand-400 dark:hover:bg-brand-900/40 dark:hover:text-brand-300"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* CTA hierarchy: Find a Mentor is the solid primary action,
                Become a Mentor the outlined secondary. */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link to="/browse-mentors" className={`${btnPrimary} ${btnLarge}`}>
                Find a Mentor
                <ArrowRightIcon width={18} height={18} />
              </Link>
              <Link to="/apply-mentor" className={`${btnOutline} ${btnLarge}`}>
                Become a Mentor
              </Link>
            </div>

            <ul className="mt-7 flex list-none flex-wrap gap-x-6 gap-y-2.5 p-0">
              {GUARANTEES.map(({ icon: Icon, text }) => (
                <li
                  key={text}
                  className="inline-flex items-center gap-2 text-[0.9rem] text-ink-500 dark:text-ink-400"
                >
                  <Icon
                    width={16}
                    height={16}
                    className="shrink-0 text-brand-600 dark:text-brand-400"
                  />
                  {text}
                </li>
              ))}
            </ul>
          </div>

          {/* Hero visual: a photo on a soft accent panel, with a floating
              product-preview card showing what a booked session looks like in
              the visitor's own timezone. Fills the right-hand column so the
              desktop/tablet layout stays balanced. */}
          <div className="relative mx-auto w-full max-w-[540px] lg:max-w-none">
            {/* Accent slab behind the photo. Hidden below 480px and kept flush
                with the photo edge until `sm`: the -right-4 offset otherwise
                hugs the viewport edge on narrow screens and reads as a floating
                block overlapping the content. */}
            <div
              className="absolute -top-4 right-0 bottom-4 left-4 rounded-2xl bg-brand-100 dark:bg-brand-900/40 max-[480px]:hidden sm:-right-4"
              aria-hidden="true"
            />
            <img
              className="relative block aspect-[4/3] w-full rounded-2xl object-cover shadow-[0_18px_45px_rgba(11,28,50,0.16)]"
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&h=675&fit=crop"
              alt="A mentor working one-to-one with a student"
              width={900}
              height={675}
              loading="eager"
              decoding="async"
            />

            {/* Platform stat chip, top-right of the photo */}
            <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--hairline)] bg-[var(--surface)] px-3 py-1.5 text-[0.8rem] font-bold text-ink-700 shadow-[0_6px_18px_rgba(11,28,50,0.14)] dark:bg-[var(--surface)] dark:text-ink-200 sm:top-4 sm:right-4">
              <ShieldCheckIcon
                width={14}
                height={14}
                className="text-brand-600 dark:text-brand-400"
              />
              Conflict-free scheduling
            </div>

            {/* Floating session preview card */}
            <div className="absolute bottom-3 left-3 w-[250px] rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-4 shadow-[0_18px_45px_rgba(11,28,50,0.22)] sm:bottom-5 sm:left-5">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900/60 dark:text-brand-300">
                  <CheckCircleIcon width={16} height={16} />
                </span>
                <span className="text-[0.72rem] font-black tracking-[0.09em] text-brand-700 uppercase dark:text-brand-400">
                  Session confirmed
                </span>
              </div>

              <p className="mt-2.5 text-[0.95rem] leading-snug font-extrabold text-ink-900 dark:text-white">
                Data Science mentoring
              </p>

              <p className="mt-1 flex items-center gap-1.5 text-[0.85rem] text-ink-500 dark:text-ink-400">
                <ClockIcon width={14} height={14} className="shrink-0" />
                {sampleSession.dateLabel} · {sampleSession.timeLabel}
              </p>

              <p className="mt-2 border-t border-[var(--hairline)] pt-2 text-[0.75rem] text-ink-500 dark:text-ink-400">
                Shown in your local timezone
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Real platform numbers. Withheld entirely while all counts are zero. */}
      <TrustStats />

      {/* ------------------------------------------------- How It Works */}
      <section id="how-it-works" className={`${sectionWrap} bg-[var(--surface-sunken)]`}>
        <div className={sectionInner}>
          <header className={sectionHead}>
            <span className={eyebrow}>How it works</span>
            <h2 className={sectionTitle}>Three steps to your next session</h2>
            <p className={sectionSubtitle}>
              From discovery to a booked session, without the back-and-forth
              that usually comes with finding a mentor.
            </p>
          </header>

          <ol className="grid list-none grid-cols-1 gap-6 p-0 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, body }, index) => (
              <li
                key={title}
                className={`${surfaceCard} relative p-7 pb-8 pt-12 shadow-[0_2px_14px_rgba(11,28,50,0.05)]`}
              >
                {/* Numbered badge, offset into the card's top padding. */}
                <span
                  className="absolute top-4 left-7 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-[0.85rem] font-extrabold text-brand-700 dark:bg-brand-900 dark:text-brand-200"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <span
                  className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300"
                  aria-hidden="true"
                >
                  <Icon width={26} height={26} />
                </span>
                <h3 className="mt-4 mb-2 text-[1.15rem] font-extrabold tracking-[-0.015em] text-ink-900 dark:text-white">
                  {title}
                </h3>
                <p className={cardBody}>{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* --------------------------------------------------------- About */}
      <section id="about" className={sectionWrap}>
        <div className={sectionInner}>
          <header className={sectionHead}>
            <span className={eyebrow}>About us</span>
            <h2 className={sectionTitle}>Quality mentorship, made accessible</h2>
            <p className={sectionSubtitle}>
              MentorMatch connects students with experienced mentors for
              academic, career, and personal development.
            </p>
          </header>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                title: "For students",
                body: "Browse approved mentors, explore their skills and expertise, and book one-to-one sessions at times that work for you. Every booking is checked against the mentor's calendar, so a slot you request is never silently double-booked.",
              },
              {
                title: "For mentors",
                body: "Share what you know, guide students through academic and career challenges, and manage your own weekly availability. You decide which requests to accept.",
              },
              {
                title: "Why we built it",
                body: "Meaningful connections happen where experience meets ambition. MentorMatch exists to make those connections easy to find and reliable to keep.",
              },
            ].map((card) => (
              <div key={card.title} className={`${surfaceCard} p-6`}>
                <h3 className="mb-2.5 text-[1.06rem] font-extrabold text-ink-900 dark:text-white">
                  {card.title}
                </h3>
                <p className={cardBody}>{card.body}</p>
              </div>
            ))}
          </div>

          {!user && (
            <div className="mt-11 flex flex-col items-center gap-4 text-center">
              <Link to="/register" className={`${btnPrimary} ${btnLarge}`}>
                Create your free account
                <ArrowRightIcon width={18} height={18} />
              </Link>
              <p className="text-[0.95rem] text-ink-500 dark:text-ink-300">
                Already registered as a mentor?{" "}
                <Link to="/login" className={textLink}>
                  Sign in
                </Link>
              </p>
            </div>
          )}

          {user && profile?.role === "Student" && (
            <div className="mt-11 flex flex-col items-center gap-4 text-center">
              <Link to="/browse-mentors" className={`${btnPrimary} ${btnLarge}`}>
                Browse mentors
                <ArrowRightIcon width={18} height={18} />
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default HomePage;
