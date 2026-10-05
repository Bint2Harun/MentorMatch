import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  authBack,
  authCard,
  authCardSub,
  authCardTitle,
  authError,
  authInput,
  authLabel,
  authLayout,
  authLede,
  authPage,
  authPromo,
  authRule,
  authSubmit,
  authSuccess,
  authTitle,
} from "../components/marketing-ui";
import { CheckCircleIcon, ArrowLeftIcon } from "../components/Icons";

function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (!email.trim()) {
      setErrorMessage("Please enter the email address on your account.");
      return;
    }

    setSubmitting(true);
    const { error } = await sendPasswordReset({ email: email.trim() });
    setSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSent(true);
  };

  return (
    <div className={authPage}>
      <div className={authLayout}>
        <section className={authPromo}>
          <h1 className={authTitle}>Reset your password</h1>
          <p className={authLede}>
            Enter the email address you registered with and we will send you a
            link to choose a new password.
          </p>
        </section>

        <section className={authCard} aria-label="Reset password form">
          <div>
            <h2 className={authCardTitle}>Forgot your password?</h2>
            <p className={authCardSub}>
              We will email a secure link to reset it.
            </p>
          </div>

          {sent ? (
            <>
              <div className={authSuccess} role="status">
                <CheckCircleIcon width={18} height={18} />
                <span>
                  If an account exists for <strong>{email.trim()}</strong>, a
                  reset link is on its way. Check your spam folder if it does
                  not arrive within a couple of minutes.
                </span>
              </div>

              <Link
                to="/login"
                className={authSubmit}
              >
                Back to log in
              </Link>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className={authLabel} htmlFor="reset-email">
                  Email address
                </label>

                <input
                  id="reset-email"
                  name="email"
                  type="email"
                  className={authInput}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="example@email.com"
                  autoComplete="email"
                />
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
                {submitting ? "Sending link..." : "Send reset link"}
              </button>
            </form>
          )}

          <hr className={authRule} />

          <Link to="/login" className={authBack}>
            <ArrowLeftIcon width={15} height={15} />
            Back to log in
          </Link>
        </section>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;