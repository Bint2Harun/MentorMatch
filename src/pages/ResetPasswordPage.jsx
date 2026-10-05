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
  authPasswordToggle,
  authPasswordWrap,
  authPromo,
  authRule,
  authSubmit,
  authSuccess,
  authTitle,
} from "../components/marketing-ui";
import {
  CheckCircleIcon,
  ArrowLeftIcon,
  EyeIcon,
  EyeOffIcon,
} from "../components/Icons";

function ResetPasswordPage() {
  const { session, loading, updatePassword } = useAuth();

  // Supabase strips the recovery tokens from the URL once it establishes a
  // session, so an error fragment here means the link was tampered with or
  // already used. Read once during initialisation rather than in an effect.
  const [errorMessage, setErrorMessage] = useState(() =>
    window.location.hash.includes("error")
      ? "This reset link is invalid or has expired."
      : ""
  );

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (password.length < 6) {
      setErrorMessage("Please choose a password of at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("The two passwords do not match.");
      return;
    }

    setSubmitting(true);
    const { error } = await updatePassword({ password });
    setSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setDone(true);
  };

  // Hold off until the session check settles, otherwise a valid link briefly
  // looks expired while Supabase is still exchanging the token.
  if (!loading && !session && !done) {
    return (
      <div className={authPage}>
        <div className={authLayout}>
          <section className={authPromo}>
            <h1 className={authTitle}>Reset link no longer valid</h1>
            <p className={authLede}>
              Password reset links are single use and expire after a short
              while. Request a fresh link and try again.
            </p>
          </section>

          <section className={authCard} aria-label="Reset link expired">
            <div>
              <h2 className={authCardTitle}>Link expired</h2>
              <p className={authCardSub}>
                We could not find an active reset session on this device.
              </p>
            </div>

            <Link
              to="/forgot-password"
              className={authSubmit}
            >
              Request a new link
            </Link>

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

  return (
    <div className={authPage}>
      <div className={authLayout}>
        <section className={authPromo}>
          <h1 className={authTitle}>Choose a new password</h1>
          <p className={authLede}>
            Pick something you have not used before. You will be signed in
            automatically once it is changed.
          </p>
        </section>

        <section className={authCard} aria-label="Set a new password">
          <div>
            <h2 className={authCardTitle}>Set a new password</h2>
            <p className={authCardSub}>At least 6 characters.</p>
          </div>

          {done ? (
            <>
              <div className={authSuccess} role="status">
                <CheckCircleIcon width={18} height={18} />
                <span>
                  Your password has been updated. You can continue to your
                  dashboard.
                </span>
              </div>

              <Link
                to="/student-dashboard"
                className={authSubmit}
              >
                Go to dashboard
              </Link>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className={authLabel} htmlFor="new-password">
                  New password
                </label>

                <div className={authPasswordWrap}>
                  <input
                    id="new-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    className={authInput}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter a new password"
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

              <div className="mb-4">
                <label className={authLabel} htmlFor="confirm-password">
                  Confirm new password
                </label>

                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  className={authInput}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repeat the new password"
                  autoComplete="new-password"
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
                {submitting ? "Updating..." : "Update password"}
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

export default ResetPasswordPage;