import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

function HomePage() {
  const { user, profile, loading: authLoading } = useAuth();

  const [loadingMentors, setLoadingMentors] = useState(true);

  // No longer using featured mentors, but keeping effect in case you need it later
  useEffect(() => {
    const loadMentors = async () => {
      setLoadingMentors(true);
      setLoadingMentors(false);
    };

    loadMentors();
  }, []);

  if (authLoading) {
    return (
      <div className="container">
        <p style={{ padding: "2rem" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
      }}
    >
      {/* Top Bar with Auth Links */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1rem 0",
          borderBottom: "1px solid var(--border)",
          marginBottom: "2rem",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>
          MentorMatch
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          {!user ? (
            <>
              <Link to="/login" className="btn btn-secondary">
                Login
              </Link>
              <Link to="/register" className="btn btn-primary">
                Register
              </Link>
            </>
          ) : (
            <>
              <Link to="/browse-mentors" className="btn btn-secondary">
                Browse Mentors
              </Link>
              <Link
                to={
                  profile?.role === "Student"
                    ? "/student-dashboard"
                    : profile?.role === "Mentor"
                    ? "/mentor-dashboard"
                    : "/admin-dashboard"
                }
                className="btn btn-primary"
              >
                Dashboard
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Main content wrapper */}
      <div style={{ flex: 1 }}>
        {/* 1. Hero Section with image on the right */}
        <section
          style={{
            display: "flex",
            alignItems: "center",
            gap: "2rem",
            padding: "3rem 1rem 4rem",
            marginBottom: "2rem",
          }}
        >
          {/* Left: text + search + CTAs */}
          <div style={{ flex: 1, minWidth: "280px" }}>
            <h1
              style={{
                margin: 0,
                fontSize: "2.2rem",
                lineHeight: 1.2,
              }}
            >
              Find Your Perfect Mentor. Accelerate Your Skills.
            </h1>

            <p
              style={{
                marginTop: "0.75rem",
                fontSize: "1.05rem",
                marginBottom: "1.5rem",
              }}
            >
              A secure platform for students to find mentors, view availability,
              request mentorship sessions, and avoid booking conflicts.
            </p>

            {/* Search Bar (UI only for now) */}
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                maxWidth: "600px",
                margin: "0 0 1rem",
                flexWrap: "wrap",
              }}
            >
              <input
                type="text"
                placeholder="Search by subject, industry, or skill"
                style={{
                  flex: 1,
                  minWidth: "200px",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                }}
              />
              <select
                style={{
                  padding: "0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                }}
              >
                <option value="">All availability</option>
                <option value="weekdays">Weekdays</option>
                <option value="weekends">Weekends</option>
                <option value="evenings">Evenings</option>
              </select>
              <Link to="/browse-mentors" className="btn btn-primary">
                Search
              </Link>
            </div>

            {/* Dual CTAs */}
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                flexWrap: "wrap",
              }}
            >
              <Link to="/browse-mentors" className="btn btn-primary">
                Find a Mentor
              </Link>
              <Link to="/apply-mentor" className="btn btn-secondary">
                Become a Mentor
              </Link>
            </div>
          </div>

          {/* Right: hero image */}
          <div
            style={{
              flex: 1,
              minWidth: "260px",
            }}
          >
            <img
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop"
              alt="Students learning with mentor"
              style={{
                width: "100%",
                height: "auto",
                borderRadius: "12px",
                objectFit: "cover",
                boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
              }}
            />
          </div>
        </section>

        {/* 2. How It Works with icons (no images) */}
        <section
          style={{
            marginBottom: "3rem",
            padding: "2rem 0",
            borderTop: "1px solid var(--border)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <h2
            style={{
              fontSize: "1.4rem",
              marginBottom: "1.5rem",
              textAlign: "center",
            }}
          >
            How It Works
          </h2>

          <div className="grid-3">
            <div className="card" style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "2.5rem",
                  marginBottom: "0.75rem",
                }}
              >
                🔎
              </div>
              <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem" }}>
                1. Choose an expert
              </h3>
              <p style={{ fontSize: "0.95rem" }}>
                Browse verified mentors by subject, industry, and availability.
              </p>
            </div>

            <div className="card" style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "2.5rem",
                  marginBottom: "0.75rem",
                }}
              >
                📅
              </div>
              <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem" }}>
                2. Pick a date & time
              </h3>
              <p style={{ fontSize: "0.95rem" }}>
                Select a slot that matches the mentor’s availability.
              </p>
            </div>

            <div className="card" style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "2.5rem",
                  marginBottom: "0.75rem",
                }}
              >
                💬
              </div>
              <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem" }}>
                3. Connect 1-on-1
              </h3>
              <p style={{ fontSize: "0.95rem" }}>
                Meet online and accelerate your skills with personalized guidance.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          padding: "1.5rem 0",
          textAlign: "center",
          fontSize: "0.9rem",
          marginTop: "2rem",
        }}
      >
        <div style={{ marginBottom: "0.5rem" }}>
          © {new Date().getFullYear()} MentorMatch By Ajobe Dev. All rights reserved.
        </div>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          
          <a href="rashida2harun@gmail.com" style={{ color: "inherit" }}>
            Contact
          </a>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;