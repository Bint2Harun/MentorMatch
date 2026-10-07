import { Link } from "react-router-dom";
import {
  btnPrimary,
  eyebrow,
  sectionInner,
  sectionSubtitle,
  sectionTitle,
  sectionWrap,
  textLink,
} from "../components/marketing-ui";
import { MailIcon } from "../components/Icons";

const cardBody = "text-[0.99rem] leading-[1.65] text-ink-500 dark:text-ink-300";

function ContactPage() {
  return (
    <>
      <section className={`${sectionWrap} pb-8`}>
        <div className={sectionInner}>
          <span className={eyebrow}>Contact</span>
          <h1 className={sectionTitle}>Talk to a human</h1>
          <p className={sectionSubtitle}>
            Questions about bookings, mentor applications or anything else.
          </p>
        </div>
      </section>

      <section className={`${sectionWrap} pt-0`}>
        <div className={`${sectionInner} grid max-w-[46rem] gap-4`}>
          <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-6 sm:p-7">
            <span
              className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300"
              aria-hidden="true"
            >
              <MailIcon width={26} height={26} />
            </span>

            <h2 className="mt-4 mb-2.5 text-[1.15rem] font-extrabold text-ink-900 dark:text-white">
              Email us
            </h2>
            <p className={`${cardBody} mb-5`}>
              The fastest route to an answer. Include your account email and, if
              it is about a specific session, its date and time so we can look
              it up.
            </p>

            <a
              className={btnPrimary}
              href="mailto:my1onlinestores@gmail.com?subject=MentorMatch%20enquiry"
            >
              my1onlinestores@gmail.com
            </a>
          </div>

          <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-6 sm:p-7">
            <h2 className="mb-2.5 text-[1.15rem] font-extrabold text-ink-900 dark:text-white">
              Common questions first
            </h2>
            <p className={`${cardBody} mb-4`}>
              Most messages we receive are already answered on the FAQ, which
              covers pricing, verification, cancellations and timezones.
            </p>
            {/* Router Link, not an <a href>: the old markup forced a full
                document reload and threw away the header/footer shell. */}
            <Link to="/faq" className={textLink}>
              Read the FAQ
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

export default ContactPage;
