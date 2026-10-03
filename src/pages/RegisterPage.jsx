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

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "0.85rem 0.95rem",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "1rem",
    outline: "none",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "0.45rem",
    fontWeight: 700,
    color: "#374151",
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
            Start your mentorship journey today.
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
            Create a free Student account to discover approved mentors, request
            one-to-one sessions, and receive guidance for your academic and
            career goals.
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
              Join as a student
            </span>

            <span
              style={{
                background: "#e0e7ff",
                color: "#db930c",
                padding: "0.45rem 0.75rem",
                borderRadius: "999px",
                fontSize: "0.85rem",
                fontWeight: 700,
              }}
            >
              Find guidance
            </span>

            <span
              style={{
                background: "#dcfce7",
                color: "#166534",
                padding: "0.45rem 0.75rem",
                borderRadius: "999px",
                fontSize: "0.85rem",
                fontWeight: 700,
              }}
            >
              Grow with confidence
            </span>
          </div>
        </section>

        {/* Registration card */}
        <section
          aria-label="Registration form"
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
              Create your account
            </h2>

            <p style={{ margin: 0, color: "#6b7280", lineHeight: 1.5 }}>
              Join MentorMatch and begin as a Student.
            </p>
          </div>

          <div
            style={{
              marginBottom: "1.25rem",
              padding: "0.8rem 0.9rem",
              borderRadius: "8px",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              color: "#1e40af",
              fontSize: "0.9rem",
              lineHeight: 1.55,
            }}
          >
            Mentor and Administrator access can only be assigned through the approved
            system workflow.
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "1rem" }}>
              <label htmlFor="fullName" style={labelStyle}>
                Full name
              </label>

              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Enter your full name"
                autoComplete="name"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label htmlFor="email" style={labelStyle}>
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
              <label htmlFor="password" style={labelStyle}>
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
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

            {message && (
              <div
                role="status"
                style={{
                  marginBottom: "1rem",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  color: "#166534",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  fontSize: "0.92rem",
                  lineHeight: 1.5,
                }}
              >
                {message}
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
                background: submitting ? "#93c5fd" : "#08c567",
                color: "#ffffff",
                fontSize: "1rem",
                fontWeight: 700,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Creating account..." : "Create account"}
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
            Already have an account?{" "}
            <Link
              to="/login"
              style={{
                color: "#d1a207",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Log in
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

export default RegisterPage;