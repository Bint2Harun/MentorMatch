import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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
    <div className="auth-page">
      <div className="auth-layout">
        <section className="auth-promo">
          <h1 className="auth-title">Reset your password</h1>
          <p className="auth-lede">
            Enter the email address you registered with and we will send you a
            link to choose a new password.
          </p>
        </section>

        <section className="auth-card" aria-label="Reset password form">
          <div className="auth-card-head">
            <h2 className="auth-card-title">Forgot your password?</h2>
            <p className="auth-card-sub">
              We will email a secure link to reset it.
            </p>
          </div>

          {sent ? (
            <>
              <div className="auth-success" role="status">
                <CheckCircleIcon width={18} height={18} />
                <span>
                  If an account exists for <strong>{email.trim()}</strong>, a
                  reset link is on its way. Check your spam folder if it does
                  not arrive within a couple of minutes.
                </span>
              </div>

              <Link
                to="/login"
                className="btn btn-primary auth-submit"
                style={{ textAlign: "center" }}
              >
                Back to log in
              </Link>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="auth-field">
                <label className="auth-label" htmlFor="reset-email">
                  Email address
                </label>

                <input
                  id="reset-email"
                  name="email"
                  type="email"
                  className="auth-input"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="example@email.com"
                  autoComplete="email"
                />
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
                {submitting ? "Sending link..." : "Send reset link"}
              </button>
            </form>
          )}

          <hr className="auth-rule" />

          <Link to="/login" className="auth-back">
            <ArrowLeftIcon width={15} height={15} />
            Back to log in
          </Link>
        </section>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;