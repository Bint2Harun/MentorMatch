import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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
    <div className="auth-page">
      <div className="auth-layout">
        {/* ------------------------------------------------ Promo side */}
        <section className="auth-promo">
          <h1 className="auth-title">Learn faster with the right guidance.</h1>

          <p className="auth-lede">
            MentorMatch connects students with experienced mentors for academic,
            career, and personal development. Book mentoring sessions and grow
            with personalised guidance.
          </p>

          <ul className="auth-pills">
            {PILLS.map((pill) => (
              <li className="auth-pill" key={pill}>
                <CheckCircleIcon width={15} height={15} />
                {pill}
              </li>
            ))}
          </ul>
        </section>

        {/* ------------------------------------------------- Login card */}
        <section className="auth-card" aria-label="Login form">
          <div className="auth-card-head">
            <h2 className="auth-card-title">Welcome back</h2>
            <p className="auth-card-sub">
              Log in to continue to your MentorMatch account.
            </p>
          </div>

          <button
            type="button"
            className="auth-oauth"
            onClick={handleOAuth}
            disabled={oauthBusy}
          >
            <GoogleIcon width={19} height={19} />
            {oauthBusy ? "Opening Google..." : "Continue with Google"}
          </button>

          <p className="auth-divider">or</p>

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="auth-label" htmlFor="email">
                Email address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                className="auth-input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="example@email.com"
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <div className="auth-label-row">
                <label className="auth-label" htmlFor="password">
                  Password
                </label>
                <Link to="/forgot-password" className="auth-forgot">
                  Forgot password?
                </Link>
              </div>

              <div className="auth-password-wrap">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className="auth-input"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="auth-password-toggle"
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
              <div className="auth-error" role="alert">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={submitting}
            >
              {submitting ? "Logging in..." : "Log In"}
            </button>
          </form>

          <hr className="auth-rule" />

          <p className="auth-foot">
            New to MentorMatch?{" "}
            <Link to="/register" className="text-link">
              Create an account
            </Link>
          </p>

          <Link to="/" className="auth-back">
            <ArrowLeftIcon width={15} height={15} />
            Back to home
          </Link>
        </section>
      </div>
    </div>
  );
}

export default LoginPage;