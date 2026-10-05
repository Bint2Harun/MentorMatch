import logoLockup from "../assets/mentormatch-logo.png";
import markOnly from "../assets/mentormatch-mark.png";

/**
 * Brand logo.
 *
 * `variant="full"`    icon mark + wordmark. Use in headers and the home hero.
 * `variant="mark"`    icon mark only. Use where the wordmark is already
 *                      present in adjacent text, or in tight spaces.
 *
 * Both come from src/assets/MentorMatch logo.png via Vite, so the URLs are
 * fingerprinted in a production build.
 */
function Logo({
  variant = "full",
  height = 40,
  className,
  ...rest
}) {
  const src = variant === "mark" ? markOnly : logoLockup;

  // The lockup is wider than it is tall; the mark is roughly 1.48:1.
  const width =
    variant === "mark" ? Math.round(height * 1.479) : "auto";

  return (
    <img
      src={src}
      alt="MentorMatch"
      height={height}
      width={width}
      className={className}
      style={{ display: "block", width, height: "auto" }}
      decoding="async"
      {...rest}
    />
  );
}

export default Logo;
