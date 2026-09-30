import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function RegisterPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      password
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

    setMessage("Registration was successful. Your account has been created as a Student.");

    setTimeout(() => {
      navigate("/");
    }, 1500);
  };

  return (
    <main style={{ padding: "2rem", maxWidth: "500px", margin: "0 auto" }}>
      <h1>Create Student Account</h1>

      <p>
        Every new account is registered as a Student. Administrator and Mentor
        access can only be assigned through the approved system workflow.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="fullName">Full Name</label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Enter your full name"
            style={{ display: "block", width: "100%", padding: "0.6rem" }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="example@email.com"
            style={{ display: "block", width: "100%", padding: "0.6rem" }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 6 characters"
            style={{ display: "block", width: "100%", padding: "0.6rem" }}
          />
        </div>

        {errorMessage && (
          <p style={{ color: "crimson" }}>{errorMessage}</p>
        )}

        {message && (
          <p style={{ color: "green" }}>{message}</p>
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? "Creating Account..." : "Create Account"}
        </button>
      </form>

      <p style={{ marginTop: "1rem" }}>
        Already have an account? <Link to="/login">Login here</Link>.
      </p>

      <p>
        <Link to="/">Back to Home</Link>
      </p>
    </main>
  );
}

export default RegisterPage;