import {
  eyebrow,
  sectionInner,
  sectionSubtitle,
  sectionTitle,
  sectionWrap,
} from "./marketing-ui";

/**
 * Shared shell for the legal pages.
 *
 * These pages describe real, verifiable behaviour taken from the Phase 1 schema
 * and RLS policies. They are explicitly marked as needing review by someone
 * qualified before launch: this is engineering documentation of what the
 * product does, not legal advice, and it is not a substitute for a reviewed
 * policy.
 */
function LegalPage({ eyebrow: eyebrowText, title, updated, intro, sections }) {
  return (
    <>
      <section className={`${sectionWrap} pb-8`}>
        <div className={sectionInner}>
          <span className={eyebrow}>{eyebrowText}</span>
          <h1 className={sectionTitle}>{title}</h1>
          <p className={sectionSubtitle}>
            Last updated {updated}. Draft &mdash; pending legal review.
          </p>
        </div>
      </section>

      <section className={`${sectionWrap} pt-0`}>
        {/* Narrow measure: legal prose at full 1180px is unreadable. */}
        <div className={`${sectionInner} max-w-[46rem]`}>
          <div className="mb-8 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-[0.94rem] leading-relaxed text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100">
            <strong>This page is a draft.</strong> It documents how the platform
            currently behaves so users are not left guessing. It has not been
            reviewed by a lawyer and should be replaced with counsel-approved
            text before MentorMatch is launched publicly.
          </div>

          <p className="text-[1.05rem] leading-[1.7] text-ink-500 dark:text-ink-300">
            {intro}
          </p>

          {sections.map(({ heading, body, items }) => (
            <section key={heading} className="mt-9">
              <h2 className="mb-2.5 text-[1.28rem] font-extrabold tracking-[-0.02em] text-ink-900 dark:text-white">
                {heading}
              </h2>
              {body && (
                <p className="text-[1rem] leading-[1.7] text-ink-500 dark:text-ink-300">
                  {body}
                </p>
              )}
              {items && (
                <ul className="mt-2.5 grid list-none gap-1.5 p-0 text-[1rem] leading-[1.7] text-ink-500 dark:text-ink-300">
                  {items.map((item) => (
                    <li key={item} className="flex gap-2.5">
                      <span
                        className="mt-[0.65em] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </section>
    </>
  );
}

export default LegalPage;
