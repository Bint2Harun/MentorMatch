import { MailIcon } from "../components/Icons";

function ContactPage() {
  return (
    <>
      <section className="page-hero">
        <div className="section-inner">
          <span className="section-eyebrow">Contact</span>
          <h1 className="section-title">Talk to a human</h1>
          <p className="section-subtitle">
            Questions about bookings, mentor applications or anything else.
          </p>
        </div>
      </section>

      <section className="section section-plain">
        <div className="section-inner section-inner-narrow">
          <div className="contact-card">
            <span className="step-icon" aria-hidden="true">
              <MailIcon width={26} height={26} />
            </span>

            <h2 className="about-card-title">Email us</h2>
            <p>
              The fastest route to an answer. Include your account email and, if
              it is about a specific session, its date and time so we can look
              it up.
            </p>

            <a
              className="btn btn-primary"
              href="mailto:rashida2harun@gmail.com?subject=MentorMatch%20enquiry"
            >
              rashida2harun@gmail.com
            </a>
          </div>

          <div className="contact-card">
            <h2 className="about-card-title">Common questions first</h2>
            <p>
              Most messages we receive are already answered on the FAQ, which
              covers pricing, verification, cancellations and timezones.
            </p>
            <a className="text-link" href="/faq">
              Read the FAQ
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

export default ContactPage;