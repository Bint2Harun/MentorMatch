import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  authBack,
  authCard,
  authCardSub,
  authCardTitle,
  authError,
  authFoot,
  authInput,
  authLabel,
  authLayout,
  authLede,
  authNote,
  authPage,
  authPasswordToggle,
  authPasswordWrap,
  authPills,
  authPromo,
  authRule,
  authSubmit,
  authSuccess,
  authTitle,
  pill,
  textLink,
} from "../components/marketing-ui";
import {
  CheckCircleIcon,
  ArrowLeftIcon,
  EyeIcon,
  EyeOffIcon,
} from "../components/Icons";

const PILLS = ["Join as a student", "Find guidance", "Grow with confidence"];

function RegisterPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setErrorMessage("");

    if (!fullName.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    if (!email.trim()) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must contain at least 6 characters.");
      return;
    }

    setSubmitting(true);

    const { data, error } = await signUp({
      fullName: fullName.trim(),
      email: email.trim(),
      password,
    });

    setSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (data.user && !data.session) {
      setMessage(
        "Registration was successful. Please check your email and confirm your account before logging in."
      );
      return;
    }

    setMessage(
      "Registration was successful. Your account has been created as a Student."
    );

    setTimeout(() => {
      navigate("/");
    }, 1500);
  };

  return (
    // Inside MarketingLayout, which already owns the header, footer and the
    // bottom-anchored flex column.
    <div className={authPage}>
      <div className={authLayout}>
        <section className={authPromo}>
          <h1 className={authTitle}>
            Start your mentorship journey today.
          </h1>

          <p className={authLede}>
            Create a free Student account to discover approved mentors, request
            one-to-one sessions, and receive guidance for your academic and
            career goals.
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

        <section className={authCard} aria-label="Registration form">
          <div>
            <h2 className={authCardTitle}>Create your account</h2>
            <p className={authCardSub}>
              Join MentorMatch and begin as a Student.
            </p>
          </div>

          <div className={authNote}>
            Mentor and Administrator access can only be assigned through the
            approved system workflow.
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className={authLabel} htmlFor="fullName">
                Full name
              </label>

              <input
                id="fullName"
                name="fullName"
                type="text"
                className={authInput}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Enter your full name"
                autoComplete="name"
              />
            </div>

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
              <label className={authLabel} htmlFor="password">
                Password
              </label>

              <div className={authPasswordWrap}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className={authInput}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
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

            {message && (
              <div className={authSuccess} role="status">
                <CheckCircleIcon width={18} height={18} />
                <span>{message}</span>
              </div>
            )}

            <button
              type="submit"
              className={authSubmit}
              disabled={submitting}
            >
              {submitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          <hr className={authRule} />

          <p className={authFoot}>
            Already have an account?{" "}
            <Link to="/login" className={textLink}>
              Log in
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

export default RegisterPage;
