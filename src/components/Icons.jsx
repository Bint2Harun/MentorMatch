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

export function BellIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
      <path d="M13.7 19a2 2 0 0 1-3.4 0" />
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
/* --------------------------------------------------------- Auth pages */

export function EyeIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M10.6 6.1A8.9 8.9 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.8 3.6" />
      <path d="M6.2 7.6A16 16 0 0 0 2.5 12S6 18 12 18a9.2 9.2 0 0 0 3.3-.6" />
      <path d="m10 10.1a3 3 0 0 0 4.1 4.1" />
      <path d="m4 4 16 16" />
    </svg>
  );
}

/**
 * Google brand mark. Uses official multi-colour paths rather than
 * `currentColor` so the recognisable four-colour logo is preserved; the button
 * label and border still carry the brand font colour.
 */
export function GoogleIcon(props) {
  const { width, height, ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      width={width ?? 20}
      height={height ?? 20}
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.53 5.53 0 0 1-2.4 3.63v3.01h3.88c2.27-2.09 3.58-5.17 3.58-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.88-3.01c-1.07.72-2.44 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.95H1.25v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.61H1.25a12 12 0 0 0 0 10.78l4.02-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.25 6.61l4.02 3.11C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

export function ArrowLeftIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </svg>
  );
}

export function CheckCircleIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </svg>
  );
}
