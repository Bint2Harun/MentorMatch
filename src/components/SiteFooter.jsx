import { Link } from "react-router-dom";
import Logo from "./Logo";
import { MailIcon } from "../components/Icons";

const COLUMNS = [
  {
    heading: "Quick Links",
    links: [
      { label: "Find Mentors", to: "/browse-mentors" },
      { label: "Become a Mentor", to: "/apply-mentor" },
      { label: "How It Works", to: "/#how-it-works" },
      { label: "About Us", to: "/#about" },
    ],
  },
  {
    heading: "Resources & Support",
    links: [
      { label: "Contact", to: "/contact" },
      { label: "Pricing & FAQ", to: "/faq" },
      { label: "Help Center", to: "/faq#help" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms of Service", to: "/terms" },
    ],
  },
];

const SOCIALS = [
  {
    label: "MentorMatch on LinkedIn",
    href: "https://www.linkedin.com/",
    path: "M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05c.53-.95 1.83-1.95 3.77-1.95C21.4 8.75 22 11 22 14.1V21h-4v-6.1c0-1.45-.03-3.3-2-3.3-2 0-2.3 1.57-2.3 3.2V21h-4V9Z",
  },
  {
    label: "MentorMatch on X (Twitter)",
    href: "https://x.com/",
    path: "M18.2 2H21l-6.6 7.5L22 22h-6.1l-4.8-6.2L5.6 22H2.8l7-8L2 2h6.2l4.3 5.7L18.2 2Zm-1 18h1.6L7.1 3.8H5.4L17.2 20Z",
  },
  {
    label: "MentorMatch on Instagram",
    href: "https://www.instagram.com/",
    path: "M12 2.2c3.2 0 3.6 0 4.9.07 1.2.05 1.8.25 2.2.42.6.22 1 .48 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c0 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2 0-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c0-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2Zm0 1.8c-3.1 0-3.5 0-4.7.07-1.1.05-1.7.24-2.1.4-.5.2-.9.44-1.2.8-.4.3-.6.7-.8 1.2-.2.4-.4 1-.4 2.1C2.7 8.5 2.7 8.9 2.7 12s0 3.5.07 4.7c.05 1.1.24 1.7.4 2.1.2.5.4.9.8 1.2.3.4.7.6 1.2.8.4.2 1 .4 2.1.4 1.2.07 1.6.07 4.7.07s3.5 0 4.7-.07c1.1-.05 1.7-.24 2.1-.4.5-.2.9-.4 1.2-.8.4-.3.6-.7.8-1.2.2-.4.4-1 .4-2.1.07-1.2.07-1.6.07-4.7s0-3.5-.07-4.7c-.05-1.1-.24-1.7-.4-2.1a3.1 3.1 0 0 0-.8-1.2 3.1 3.1 0 0 0-1.2-.8c-.4-.2-1-.4-2.1-.4-1.2-.07-1.6-.07-4.7-.07Zm0 3.1a5 5 0 1 1 0 9.9 5 5 0 0 1 0-9.9Zm0 8.1a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2Zm5.1-9.3a1.2 1.2 0 1 1 0 2.3 1.2 1.2 0 0 1 0-2.3Z",
  },
];

/**
 * Multi-column marketing footer with a sub-footer bar.
 *
 * Every destination is a real route: the four legal/support pages exist as
 * stubs rather than being dead links.
 */
function SiteFooter() {
  return (
    // mt-auto pins the footer to the bottom when the page is short.
    <footer className="mt-auto bg-logo-navy text-ink-300">
      <div className="mx-auto grid w-full max-w-[1180px] grid-cols-1 gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))] lg:gap-10 lg:py-16">
        {/* Column 1: brand + mission + socials */}
        <div>
          <Link
            to="/"
            aria-label="MentorMatch home"
            className="inline-flex items-center gap-2.5 no-underline"
          >
            <Logo variant="mark" height={34} />
            <span className="text-[1.3rem] leading-none font-black tracking-[-0.035em] text-white">
              Mentor<span className="text-brand-400">Match</span>
            </span>
          </Link>

          <p className="mt-4 mb-5 max-w-[26rem] text-[0.94rem] leading-[1.65] text-ink-400">
            Connecting students with verified industry mentors for focused,
            one-to-one guidance that moves careers forward.
          </p>

          <ul className="mb-4 flex gap-2.5 p-0">
            {SOCIALS.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  aria-label={social.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-white/15 text-ink-300 transition-colors hover:border-brand-400/45 hover:bg-brand-500/20 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width={18}
                    height={18}
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d={social.path} fill="currentColor" />
                  </svg>
                </a>
              </li>
            ))}
          </ul>

          <a
            className="inline-flex items-center gap-2 text-[0.88rem] break-all text-ink-400 no-underline transition-colors hover:text-white"
            href="mailto:my1onlinestores@gmail.com"
          >
            <MailIcon width={16} height={16} />
            my1onlinestores@gmail.com
          </a>
        </div>

        {/* Columns 2-4 */}
        {COLUMNS.map((column) => (
          <nav key={column.heading} aria-label={column.heading}>
            <h2 className="mb-4 text-[0.8rem] font-extrabold tracking-[0.09em] text-white uppercase">
              {column.heading}
            </h2>
            <ul className="grid gap-2.5 p-0">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-[0.94rem] text-ink-400 no-underline transition-colors hover:text-white hover:underline hover:decoration-1 hover:underline-offset-[3px]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      {/* ink-500 / ink-600 only reach 3.2:1 and 2.3:1 on the navy background,
          so the small print steps up to ink-400 (5.1:1) and ink-300 (8.8:1). */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-4 px-5 py-4 text-[0.85rem] text-ink-400">
          <span>
            &copy; {new Date().getFullYear()} MentorMatch. All rights reserved.
          </span>
          <span className="text-ink-300">Built by Ajobe Dev</span>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
