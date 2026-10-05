import { Link } from "react-router-dom";
import {
  btnPrimary,
  eyebrow,
  sectionInner,
  sectionSubtitle,
  sectionTitle,
  sectionWrap,
} from "../components/marketing-ui";

const FAQS = [
  {
    q: "How much does MentorMatch cost?",
    a: "Creating an account and browsing mentors is free. Booking and pricing depend on the mentor you choose: each mentor sets their own rate, and the exact price is always shown on their profile before you request a session. MentorMatch does not add a booking fee at launch.",
  },
  {
    q: "How are mentors verified?",
    a: "Every mentor applies through the platform and is reviewed before they appear in search. Until a profile is approved it stays hidden from browsing, and an approved mentor stops appearing if their approval is withdrawn.",
  },
  {
    q: "What happens if a mentor is double-booked?",
    a: "It cannot happen. Booking conflicts are prevented in the database itself, not just in the interface. A session is only accepted if the mentor's calendar is genuinely free for that time.",
  },
  {
    q: "Can I cancel a session?",
    a: "Yes. You can cancel a pending or confirmed session from your bookings page, which releases the slot back to the mentor's calendar immediately.",
  },
  {
    q: "How do I become a mentor?",
    a: "Register as a student, then apply to become a mentor from your dashboard. Add your expertise, skills and weekly availability. Once your application is approved you can start accepting session requests.",
  },
  {
    q: "Which timezone are sessions shown in?",
    a: "Each mentor sets their own timezone, and their availability is displayed in that timezone so the slots they publish are the slots they actually mean. Confirmations record the timezone at the time of booking.",
  },
];

function FaqPage() {
  return (
    <>
      <section className={`${sectionWrap} pb-8`}>
        <div className={sectionInner}>
          <span className={eyebrow}>Pricing & FAQ</span>
          <h1 className={sectionTitle}>Questions, answered</h1>
          <p className={sectionSubtitle}>
            Everything below reflects how MentorMatch currently works.
          </p>
        </div>
      </section>

      <section id="help" className={`${sectionWrap} pt-0`}>
        <div className={`${sectionInner} max-w-[46rem]`}>
          <div className="grid gap-3">
            {FAQS.map(({ q, a }) => (
              <details
                key={q}
                className="group rounded-xl border border-[var(--hairline)] bg-[var(--surface)] px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[1.03rem] font-bold text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:text-white">
                  {q}
                  {/* Chevron rotates with the open state; the visual affordance
                      is the ::after marker in most browsers, so this replaces it. */}
                  <svg
                    viewBox="0 0 24 24"
                    width={20}
                    height={20}
                    aria-hidden="true"
                    focusable="false"
                    className="shrink-0 text-ink-400 transition-transform group-open:rotate-180"
                  >
                    <path
                      d="m6 9 6 6 6-6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </summary>
                <p className="mt-3 text-[0.99rem] leading-[1.7] text-ink-500 dark:text-ink-300">
                  {a}
                </p>
              </details>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-[var(--hairline)] bg-[var(--surface-muted)] px-6 py-8 text-center">
            <p className="text-[1rem] text-ink-600 dark:text-ink-300">
              Still stuck? We would rather answer than leave you guessing.
            </p>
            <Link to="/contact" className={btnPrimary}>
              Contact support
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

export default FaqPage;
