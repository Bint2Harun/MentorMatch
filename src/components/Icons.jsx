/**
 * Line icon set for the marketing pages.
 *
 * Inline SVG rather than an icon font or emoji so the icons inherit
 * `currentColor`, stay crisp at any size, and add no network request.
 * Every icon shares a 24x24 viewBox and a 1.75 stroke for a consistent weight.
 */

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: false,
};

export function SearchIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function CalendarIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <path d="m9 15 2 2 4-4" />
    </svg>
  );
}

export function ChatIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M21 12a8 8 0 0 1-8 8H8l-4 3v-5.5A8 8 0 0 1 13 4a8 8 0 0 1 8 8Z" />
      <path d="M9 11h6M9 14.5h3.5" />
    </svg>
  );
}

export function ShieldCheckIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3l7 3v5.5c0 4.3-2.9 8.1-7 9.5-4.1-1.4-7-5.2-7-9.5V6l7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function ClockIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.2l3.2 2" />
    </svg>
  );
}

export function StarIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4L4.2 9.7l5.4-.8L12 4Z" />
    </svg>
  );
}

export function ArrowRightIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 12h13M13 6.5 18.5 12 13 17.5" />
    </svg>
  );
}

export function UsersIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.5a3.25 3.25 0 0 1 0 6M17 14.6a5.5 5.5 0 0 1 3.5 4.9" />
    </svg>
  );
}

export function VideoIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="6.5" width="12.5" height="11" rx="2.5" />
      <path d="m15.5 11 5-3v8l-5-3" />
    </svg>
  );
}

export function MailIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 5.5L20 7" />
    </svg>
  );
}

export default {
  SearchIcon,
  CalendarIcon,
  ChatIcon,
  ShieldCheckIcon,
  ClockIcon,
  StarIcon,
  ArrowRightIcon,
  UsersIcon,
  VideoIcon,
  MailIcon,
};