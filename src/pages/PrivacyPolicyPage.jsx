import LegalPage from "../components/LegalPage";

function PrivacyPolicyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      updated="5 October 2026"
      intro="MentorMatch stores the minimum profile information needed to run one-to-one mentoring sessions. This draft describes the data the platform actually stores today, based on the current database schema and its row-level security policies."
      sections={[
        {
          heading: "What we store",
          items: [
            "Account identity: your email address and display name.",
            "Profile details: your role (student, mentor or administrator), and for mentors a biography, industry, years of experience, timezone and a list of skills.",
            "Expertise categories: the categories you select on your mentor profile.",
            "Availability: the weekly recurring time slots you publish as a mentor.",
            "Bookings: the mentor, student, date, start and end time, status, timezone snapshot and any notes you add.",
          ],
        },
        {
          heading: "Who can see what",
          body: "Access is enforced in the database itself rather than in the interface, so a direct API call cannot bypass it:",
          items: [
            "Your full name and email are visible to mentors you book with and to administrators.",
            "Mentor profiles are visible to signed-in users, but only once the mentor's application has been approved.",
            "Booking details are visible only to the mentor and the student involved in that booking.",
            "Aggregate platform counts are public. They contain no identifiers.",
          ],
        },
        {
          heading: "Sessions and meetings",
          body: "Booking requests carry a status of pending, confirmed, cancelled or completed. Meeting links are recorded when a session is confirmed. Session times are stored together with the mentor's timezone at the time of booking.",
        },
        {
          heading: "What we do not do",
          items: [
            "We do not sell your data.",
            "We do not use your booking activity for advertising.",
            "Mentors do not receive your email address unless you book with them.",
          ],
        },
        {
          heading: "Deleting your data",
          body: "Deleting your account removes your profile, availability and bookings. Bookings that involve another person may be retained in an anonymised form so the other participant's history stays accurate. Contact us to request deletion.",
        },
        {
          heading: "Cookies and local storage",
          body: "MentorMatch stores your session in your browser's local storage so you stay signed in, and remembers whether you chose the light or dark theme under the key 'mentormatch-theme'. We do not use advertising or cross-site tracking cookies.",
        },
      ]}
    />
  );
}

export default PrivacyPolicyPage;