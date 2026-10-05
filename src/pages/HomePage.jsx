import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import TrustStats from "../components/TrustStats";
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
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="hero-eyebrow">
              <ShieldCheckIcon width={16} height={16} />
              Verified industry mentors
            </span>

            <h1 className="hero-title">
              Find Your <span className="hero-accent">Perfect Mentor</span>.
              <br />
              Accelerate Your Skills.
            </h1>

            <p className="hero-lede">
              A secure platform for students to find mentors, view real
              availability, request sessions, and avoid booking conflicts.
            </p>

            {/* Integrated search: one bordered control, button docked inside */}
            <form className="hero-search" onSubmit={handleSearch}>
              <span className="hero-search-icon" aria-hidden="true">
                <SearchIcon width={20} height={20} />
              </span>

              <input
                type="search"
                className="hero-search-input"
                placeholder="Search by subject, industry, or skill"
                aria-label="Search mentors"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />

              <button type="submit" className="btn btn-primary hero-search-btn">
                Search
              </button>
            </form>

            <div className="hero-actions">
              <Link to="/browse-mentors" className="btn btn-primary btn-lg">
                Find a Mentor
                <ArrowRightIcon width={18} height={18} />
              </Link>
              <Link to="/apply-mentor" className="btn btn-outline btn-lg">
                Become a Mentor
              </Link>
            </div>

            <ul className="hero-guarantees">
              {GUARANTEES.map(({ icon: Icon, text }) => (
                <li key={text}>
                  <Icon width={16} height={16} />
                  {text}
                </li>
              ))}
            </ul>
          </div>

          {/* Image sits on a soft accent panel with a shadow so it reads as a
              deliberate frame rather than a floating rectangle. */}
          <div className="hero-media">
            <div className="hero-media-accent" aria-hidden="true" />
            <img
              className="hero-image"
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
      <section id="how-it-works" className="section section-alt">
        <div className="section-inner">
          <header className="section-head">
            <span className="section-eyebrow">How it works</span>
            <h2 className="section-title">Three steps to your next session</h2>
            <p className="section-subtitle">
              From discovery to a booked session, without the back-and-forth
              that usually comes with finding a mentor.
            </p>
          </header>

          <ol className="steps-grid">
            {STEPS.map(({ icon: Icon, title, body }, index) => (
              <li className="step-card" key={title}>
                <span className="step-index" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="step-icon" aria-hidden="true">
                  <Icon width={26} height={26} />
                </span>
                <h3 className="step-title">{title}</h3>
                <p className="step-body">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* --------------------------------------------------------- About */}
      <section id="about" className="section section-plain">
        <div className="section-inner">
          <header className="section-head">
            <span className="section-eyebrow">About us</span>
            <h2 className="section-title">Quality mentorship, made accessible</h2>
            <p className="section-subtitle">
              MentorMatch connects students with experienced mentors for
              academic, career, and personal development.
            </p>
          </header>

          <div className="about-grid">
            <div className="about-card">
              <h3 className="about-card-title">For students</h3>
              <p>
                Browse approved mentors, explore their skills and expertise, and
                book one-to-one sessions at times that work for you. Every
                booking is checked against the mentor's calendar, so a slot you
                request is never silently double-booked.
              </p>
            </div>

            <div className="about-card">
              <h3 className="about-card-title">For mentors</h3>
              <p>
                Share what you know, guide students through academic and career
                challenges, and manage your own weekly availability. You decide
                which requests to accept.
              </p>
            </div>

            <div className="about-card">
              <h3 className="about-card-title">Why we built it</h3>
              <p>
                Meaningful connections happen where experience meets ambition.
                MentorMatch exists to make those connections easy to find and
                reliable to keep.
              </p>
            </div>
          </div>

          {!user && (
            <div className="about-cta">
              <Link to="/register" className="btn btn-primary btn-lg">
                Create your free account
                <ArrowRightIcon width={18} height={18} />
              </Link>
              <p>
                Already registered as a mentor?{" "}
                <Link to="/login" className="text-link">
                  Sign in
                </Link>
              </p>
            </div>
          )}

          {user && profile?.role === "Student" && (
            <div className="about-cta">
              <Link to="/browse-mentors" className="btn btn-primary btn-lg">
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