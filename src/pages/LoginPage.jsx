import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  authBack,
  authCard,
  authCardSub,
  authCardTitle,
  authDivider,
  authFoot,
  authInput,
  authLabel,
  authLayout,
  authLede,
  authOauth,
  authPage,
  authPasswordToggle,
  authPasswordWrap,
  authPills,
  authPromo,
  authRule,
  authSubmit,
  authTitle,
  pill,
  textLink,
} from "../components/marketing-ui";
import {
  CheckCircleIcon,
  EyeIcon,
  EyeOffIcon,
  GoogleIcon,
  ArrowLeftIcon,
} from "../components/Icons";

const PILLS = ["Find mentors", "Book sessions", "Grow together"];

function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signInWithOAuth, user, profile } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);

  useEffect(() => {
    if (!user || !profile) return;

    if (profile.role === "Student") {
      navigate("/student-dashboard");
    } else if (profile.role === "Mentor") {
      navigate("/mentor-dashboard");
    } else if (profile.role === "Administrator") {
      navigate("/admin-dashboard");
    } else {
      navigate("/");
    }
  }, [user, profile, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (!email.trim() || !password) {
      setErrorMessage("Please enter your email address and password.");
      return;
    }

    setSubmitting(true);

    const { error } = await signIn({
      email: email.trim(),
      password,
    });

    setSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
    }
  };

  const handleOAuth = async () => {
    setErrorMessage("");
    setOauthBusy(true);

    const { error } = await signInWithOAuth({ provider: "google" });

    // On success the browser is redirected away, so this only runs on failure.
    if (error) {
      setErrorMessage(
        "Google sign-in is unavailable right now. Please use your email and password."
      );
      setOauthBusy(false);
    }
  };

  return (
    // Rendered inside MarketingLayout, which owns the header, footer and the
    // bottom-anchored flex column. A nested <main> or a min-height here would
    // double up the landmark and push the footer out of view.
    <div className={authPage}>
      <div className={authLayout}>
        {/* Promo side. `order-first` is implicit: it is the first child, so on
            narrow screens the pitch stacks above the form. */}
        <section className={authPromo}>
          <h1 className={authTitle}>Learn faster with the right guidance.</h1>

          <p className={authLede}>
            MentorMatch connects students with experienced mentors for academic,
            career, and personal development. Book mentoring sessions and grow
            with personalised guidance.
          </p>

          <ul className={authPills}>
            {PILLS.map((item) => (
              <li key={item} className={pill}>
                <CheckCircleIcon
                  width={15}
                  height={15}
                  className="text-brand-600 dark:text-brand-400"
                />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* ------------------------------------------------- Login card */}
        <section className={authCard} aria-label="Login form">
          <div>
            <h2 className={authCardTitle}>Welcome back</h2>
            <p className={authCardSub}>
              Log in to continue to your MentorMatch account.
            </p>
          </div>

          <button
            type="button"
            className={authOauth}
            onClick={handleOAuth}
            disabled={oauthBusy}
          >
            <GoogleIcon width={19} height={19} />
            {oauthBusy ? "Opening Google..." : "Continue with Google"}
          </button>

          <p className={authDivider}>or</p>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className={authLabel} htmlFor="email">
                Email address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                className={authInput}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="example@email.com"
                autoComplete="email"
              />
            </div>

            <div className="mb-4">
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <label className={authLabel} htmlFor="password">
                  Password
                </label>
                <Link to="/forgot-password" className="text-[0.88rem] font-semibold text-brand-600 no-underline hover:underline hover:underline-offset-[3px] dark:text-brand-400">
                  Forgot password?
                </Link>
              </div>

              <div className={authPasswordWrap}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className={authInput}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className={authPasswordToggle}
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOffIcon width={19} height={19} />
                  ) : (
                    <EyeIcon width={19} height={19} />
                  )}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className={authError} role="alert">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              className={authSubmit}
              disabled={submitting}
            >
              {submitting ? "Logging in..." : "Log In"}
            </button>
          </form>

          <hr className={authRule} />

          <p className={authFoot}>
            New to MentorMatch?{" "}
            <Link to="/register" className={textLink}>
              Create an account
            </Link>
          </p>

          <Link to="/" className={authBack}>
            <ArrowLeftIcon width={15} height={15} />
            Back to home
          </Link>
        </section>
      </div>
    </div>
  );
}

export default LoginPage;