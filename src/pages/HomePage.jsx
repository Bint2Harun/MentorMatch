import { useState } from "react";
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

const cardBody = "text-[0.97rem] leading-[1.65] text-ink-500 dark:text-ink-300";

function HomePage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  // The landing page is public, but searching needs an account to browse.
  const handleSearch = (event) => {
    event.preventDefault();
    const target = user ? "/browse-mentors" : "/login";
    navigate(user ? `${target}?q=${encodeURIComponent(query)}` : target);
  };

  return (
    <>
      {/* ---------------------------------------------------------- Hero */}
      <section className={`${sectionWrap} pt-10 sm:pt-14`}>
        <div className={`${sectionInner} grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14`}>
          <div>
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

            <p className="mt-5 max-w-[34rem] text-[1.08rem] leading-[1.7] text-ink-500 dark:text-ink-300">
              A secure platform for students to find mentors, view real
              availability, request sessions, and avoid booking conflicts.
            </p>

            {/* Integrated search: one bordered control, button docked inside */}
            <form
              className="mt-7 flex w-full max-w-[560px] flex-col gap-2.5 rounded-[14px] border border-[var(--hairline-strong)] bg-[var(--surface)] p-2 sm:flex-row sm:items-center"
              onSubmit={handleSearch}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2.5 px-2">
                <span
                  className="shrink-0 text-ink-400"
                  aria-hidden="true"
                >
                  <SearchIcon width={20} height={20} />
                </span>

                <input
                  type="search"
                  className="min-w-0 flex-1 border-0 bg-transparent py-2 text-[1rem] text-ink-900 outline-none placeholder:text-ink-400 focus-visible:outline-none dark:text-white dark:placeholder:text-ink-500"
                  placeholder="Search by subject, industry, or skill"
                  aria-label="Search mentors"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              <button type="submit" className={`${btnPrimary} w-full shrink-0 sm:w-auto`}>
                Search
              </button>
            </form>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link to="/browse-mentors" className={btnLarge}>
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

          {/* Image sits on a soft accent panel with a shadow so it reads as a
              deliberate frame rather than a floating rectangle. */}
          <div className="relative">
            <div
              className="absolute -top-4 -right-4 bottom-4 left-4 rounded-2xl bg-brand-100 dark:bg-brand-900/40"
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
              <Link to="/register" className={btnLarge}>
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
              <Link to="/browse-mentors" className={btnLarge}>
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
