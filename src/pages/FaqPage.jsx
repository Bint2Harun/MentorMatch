import { Link } from "react-router-dom";

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
      <section className="page-hero">
        <div className="section-inner">
          <span className="section-eyebrow">Pricing & FAQ</span>
          <h1 className="section-title">Questions, answered</h1>
          <p className="section-subtitle">
            Everything below reflects how MentorMatch currently works.
          </p>
        </div>
      </section>

      <section className="section section-plain" id="help">
        <div className="section-inner section-inner-narrow">
          <div className="faq-list">
            {FAQS.map(({ q, a }) => (
              <details className="faq-item" key={q}>
                <summary className="faq-question">{q}</summary>
                <p className="faq-answer">{a}</p>
              </details>
            ))}
          </div>

          <div className="page-cta">
            <p>Still stuck? We would rather answer than leave you guessing.</p>
            <Link to="/contact" className="btn btn-primary">
              Contact support
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

export default FaqPage;