import LegalPage from "../components/LegalPage";

function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      updated="5 October 2026"
      intro="These terms describe the rules MentorMatch actually enforces in the product. This draft needs review by someone qualified before public launch."
      sections={[
        {
          heading: "Accounts",
          items: [
            "You must provide accurate registration details and keep your account secure.",
            "One person may hold one account. Sharing credentials or booking slots on behalf of someone else is not permitted.",
            "You can apply to become a mentor at any time. Mentor profiles stay hidden from search until the application is approved.",
          ],
        },
        {
          heading: "Roles",
          body: "Access depends on your role. Students browse mentors and request sessions, mentors publish availability and accept or decline requests, and administrators review mentor applications and manage categories.",
        },
        {
          heading: "Booking and scheduling",
          items: [
            "Requesting a session does not guarantee it. A session is only booked once the mentor confirms it.",
            "A pending request holds the mentor's time slot, so it cannot be taken by someone else while it is awaiting a response.",
            "Cancelling a pending or confirmed session releases the slot back to the mentor's calendar immediately.",
            "Overlapping bookings are rejected by the database, so a slot cannot be double-booked.",
          ],
        },
        {
          heading: "Availability and timezones",
          body: "Mentors publish recurring weekly availability in their own timezone. The timezone in force when a session is booked is recorded with the booking, so later changes do not silently move sessions that are already agreed.",
        },
        {
          heading: "Conduct",
          items: [
            "Be respectful and professional in every session.",
            "Do not use the platform to harass, solicit or share anything unlawful.",
            "Mentors must not misrepresent their qualifications or expertise.",
            "We may suspend accounts that abuse the platform or breach these terms.",
          ],
        },
        {
          heading: "No guarantee of outcomes",
          body: "MentorMatch introduces people and schedules sessions. It does not promise any particular result from a session, and it is not responsible for the content of advice you receive.",
        },
        {
          heading: "Changes",
          body: "We may update these terms. Material changes will be announced on the site before they take effect.",
        },
      ]}
    />
  );
}

export default TermsPage;