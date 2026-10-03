function Logo() {
  return (
    <svg
      role="img"
      aria-labelledby="mentormatch-logo-title"
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title id="mentormatch-logo-title">MentorMatch logo</title>

      <rect width="36" height="36" rx="10" fill="#df8015" />

      <path
        d="M10 24V12l4 6 4-6v12"
        stroke="#ffffff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle
        cx="25"
        cy="17"
        r="4.5"
        stroke="#ffffff"
        strokeWidth="2.4"
      />

      <path
        d="M25 21.5V24"
        stroke="#ffffff"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default Logo;