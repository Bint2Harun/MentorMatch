/**
 * Shared shell for the legal pages.
 *
 * These pages describe real, verifiable behaviour taken from the Phase 1 schema
 * and RLS policies. They are explicitly marked as needing review by someone
 * qualified before launch: this is engineering documentation of what the
 * product does, not legal advice, and it is not a substitute for a reviewed
 * policy.
 */
function LegalPage({ eyebrow, title, updated, intro, sections }) {
  return (
    <>
      <section className="page-hero">
        <div className="section-inner">
          <span className="section-eyebrow">{eyebrow}</span>
          <h1 className="section-title">{title}</h1>
          <p className="section-subtitle">
            Last updated {updated}. Draft &mdash; pending legal review.
          </p>
        </div>
      </section>

      <section className="section section-plain">
        <div className="section-inner section-inner-narrow">
          <div className="legal-notice">
            <strong>This page is a draft.</strong> It documents how the platform
            currently behaves so users are not left guessing. It has not been
            reviewed by a lawyer and should be replaced with counsel-approved
            text before MentorMatch is launched publicly.
          </div>

          <p className="legal-intro">{intro}</p>

          {sections.map(({ heading, body, items }) => (
            <section className="legal-section" key={heading}>
              <h2 className="legal-heading">{heading}</h2>
              {body && <p>{body}</p>}
              {items && (
                <ul className="legal-list">
                  {items.map((item) => (
                    <li key={item}>{item}</li>
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