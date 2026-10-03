import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function LoginPage() {
  const navigate = useNavigate();
  const { signIn, user, profile } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "0.85rem 0.95rem",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "1rem",
    outline: "none",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
        background:
          "linear-gradient(135deg, #eff6ff 0%, #f8fafc 45%, #eef2ff 100%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1050px",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(340px, 430px)",
          gap: "4rem",
          alignItems: "center",
        }}
      >
        {/* Branding side */}
        <section
          style={{
            maxWidth: "520px",
            padding: "1rem",
          }}
        >
          <Link
            to="/"
            aria-label="MentorMatch home"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.6rem",
              textDecoration: "none",
              marginBottom: "1.5rem",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "13px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#eaf1ff",
                border: "1px solid #bfd3ff",
                fontSize: "1.55rem",
              }}
            >
              🎓
            </span>

            <span
              style={{
                fontWeight: 800,
                fontSize: "1.7rem",
                letterSpacing: "-0.04em",
              }}
            >
              <span style={{ color: "#1d4ed8" }}>Mentor</span>
              <span style={{ color: "#111827" }}>Match</span>
            </span>
          </Link>

          <h1
            style={{
              fontSize: "2.8rem",
              lineHeight: 1.12,
              margin: "0 0 1rem",
              color: "#111827",
              letterSpacing: "-0.04em",
            }}
          >
            Learn faster with the right guidance.
          </h1>

          <p
            style={{
              margin: 0,
              maxWidth: "500px",
              color: "#4b5563",
              fontSize: "1.12rem",
              lineHeight: 1.7,
            }}
          >
            MentorMatch connects students with experienced mentors for
            academic, career, and personal development. Book mentoring sessions
            and grow with personalised guidance.
          </p>

          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              flexWrap: "wrap",
              marginTop: "1.5rem",
            }}
          >
            <span
              style={{
                background: "#dbeafe",
                color: "#1d4ed8",
                padding: "0.45rem 0.75rem",
                borderRadius: "999px",
                fontSize: "0.85rem",
                fontWeight: 700,
              }}
            >
              Find mentors
            </span>

            <span
              style={{
                background: "#e0e7ff",
                color: "#3730a3",
                padding: "0.45rem 0.75rem",
                borderRadius: "999px",
                fontSize: "0.85rem",
                fontWeight: 700,
              }}
            >
              Book sessions
            </span>

            <span
              style={{
                background: "#dcfce7",
                color: "#ca7d09",
                padding: "0.45rem 0.75rem",
                borderRadius: "999px",
                fontSize: "0.85rem",
                fontWeight: 700,
              }}
            >
              Grow together
            </span>
          </div>
        </section>

        {/* Login card */}
        <section
          aria-label="Login form"
          style={{
            width: "100%",
            background: "#ffffff",
            padding: "2rem",
            borderRadius: "16px",
            boxShadow: "0 18px 45px rgba(30, 64, 175, 0.14)",
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <h2
              style={{
                margin: "0 0 0.5rem",
                color: "#111827",
                fontSize: "1.6rem",
              }}
            >
              Welcome back
            </h2>
            <p style={{ margin: 0, color: "#22c057", lineHeight: 1.5 }}>
              Log in to continue to your MentorMatch account.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "1rem" }}>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  marginBottom: "0.45rem",
                  fontWeight: 700,
                  color: "#374151",
                }}
              >
                Email address
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="example@email.com"
                autoComplete="email"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label
                htmlFor="password"
                style={{
                  display: "block",
                  marginBottom: "0.45rem",
                  fontWeight: 700,
                  color: "#374151",
                }}
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                style={inputStyle}
              />
            </div>

            {errorMessage && (
              <div
                role="alert"
                style={{
                  marginBottom: "1rem",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  color: "#b91c1c",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  fontSize: "0.92rem",
                }}
              >
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: "100%",
                border: "none",
                borderRadius: "8px",
                padding: "0.9rem 1rem",
                background: submitting ? "#93c5fd" : "#2563eb",
                color: "#ffffff",
                fontSize: "1rem",
                fontWeight: 700,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Logging in..." : "Log In"}
            </button>
          </form>

          <div
            style={{
              margin: "1.5rem 0",
              borderTop: "1px solid #e5e7eb",
            }}
          />

          <p
            style={{
              textAlign: "center",
              margin: 0,
              color: "#4b5563",
              lineHeight: 1.6,
            }}
          >
            New to MentorMatch?{" "}
            <Link
              to="/register"
              style={{
                color: "#1d4ed8",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Create an account
            </Link>
          </p>

          <p
            style={{
              textAlign: "center",
              margin: "1rem 0 0",
              fontSize: "0.9rem",
            }}
          >
            <Link
              to="/"
              style={{
                color: "#6b7280",
                textDecoration: "none",
              }}
            >
              ← Back to home
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

export default LoginPage;