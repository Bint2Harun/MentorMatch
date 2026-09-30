import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function LoginPage() {
  const navigate = useNavigate();
  const { signIn, user, profile } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Redirect once profile is loaded after login
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
      return;
    }

    // Navigation will happen in the useEffect once profile loads
  };

  return (
    <main style={{ padding: "2rem", maxWidth: "500px", margin: "0 auto" }}>
      <h1>Login</h1>

      <form onSubmit={handleSubmit}>
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
            placeholder="Enter your password"
            style={{ display: "block", width: "100%", padding: "0.6rem" }}
          />
        </div>

        {errorMessage && (
          <p style={{ color: "crimson" }}>{errorMessage}</p>
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? "Logging in..." : "Login"}
        </button>
      </form>

      <p style={{ marginTop: "1rem" }}>
        Do not have an account? <Link to="/register">Register here</Link>.
      </p>

      <p>
        <Link to="/">Back to Home</Link>
      </p>
    </main>
  );
}

export default LoginPage;