import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../hooks/useRole";
import AccessDenied from "../components/AccessDenied";
import { supabase } from "../lib/supabase";

function MentorEditProfilePage() {
  const { user, profile, signOut } = useAuth();
  const { loading: authLoading, profilePending, isAllowed } = useRole("Mentor");
  const navigate = useNavigate();

  const [bio, setBio] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadMentorProfile = async () => {
      if (!user) return;

      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("mentor_profiles")
        .select("id, bio, skills")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      if (!data) {
        setErrorMessage("Mentor profile not found.");
        setLoading(false);
        return;
      }

      setBio(data.bio || "");

      if (Array.isArray(data.skills)) {
        setSkillsText(data.skills.join(", "));
      } else {
        setSkillsText("");
      }

      setLoading(false);
    };

    if (profile?.role === "Mentor") {
      loadMentorProfile();
    }
  }, [user, profile]);

  const handleSave = async (e) => {
    e.preventDefault();

    if (!user) return;

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const skills = skillsText
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);

    const { error } = await supabase
      .from("mentor_profiles")
      .update({
        bio: bio.trim() || null,
        skills,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMessage("Profile updated successfully.");
  };

  const handleLogout = async () => {
    const { error } = await signOut();

    if (error) {
      alert(error.message);
    }
  };

  if (authLoading || profilePending) {
    return <p style={{ padding: "2rem" }}>Loading...</p>;
  }

  if (!isAllowed) {
    return <AccessDenied detail="You do not have permission to edit a mentor profile." />;
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <span className="dashboard-brand-light">Mentor</span>
          <span className="dashboard-brand-green">Match</span>
        </div>

        <nav className="dashboard-nav">
          <Link to="/mentor-dashboard" className="dashboard-nav-link">
            <span className="dashboard-nav-icon">▦</span>
            Dashboard
          </Link>

          <Link to="/mentor-bookings" className="dashboard-nav-link">
            <span className="dashboard-nav-icon">▣</span>
            My Bookings
          </Link>

          <Link to="/mentor-availability" className="dashboard-nav-link">
            <span className="dashboard-nav-icon">◷</span>
            Availability
          </Link>

          <Link
            to="/mentor-edit-profile"
            className="dashboard-nav-link dashboard-nav-active"
          >
            <span className="dashboard-nav-icon">✎</span>
            Edit Profile
          </Link>

          <Link to="/" className="dashboard-nav-link">
            <span className="dashboard-nav-icon">⌂</span>
            Home
          </Link>
        </nav>

        <div className="dashboard-sidebar-bottom">
          <div className="dashboard-user-summary">
            <div className="dashboard-avatar">
              {(profile?.full_name || "Mentor").charAt(0).toUpperCase()}
            </div>

            <div>
              <div className="dashboard-user-name">
                {profile?.full_name || "Mentor"}
              </div>
              <div className="dashboard-user-role">Mentor</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="dashboard-logout-button"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1 className="dashboard-heading">Edit Profile</h1>
            <p className="dashboard-subheading">
              Update your mentor biography and skills.
            </p>
          </div>

          <div className="dashboard-header-avatar">
            {(profile?.full_name || "Mentor").charAt(0).toUpperCase()}
          </div>
        </header>

        <div className="dashboard-content">
          <section className="dashboard-panel mentor-edit-panel">
            <div className="mentor-edit-heading">
              <div>
                <h2 className="dashboard-panel-title">Mentor Profile Details</h2>
                <p className="dashboard-muted-text">
                  Keep your information accurate so students can understand your
                  expertise.
                </p>
              </div>

              <button
                onClick={() => navigate("/mentor-dashboard")}
                className="mentor-edit-cancel-button"
                type="button"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="mentor-edit-form-group">
                <label htmlFor="bio" className="mentor-edit-label">
                  Biography
                </label>

                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={7}
                  placeholder="Tell students about your background, experience, and how you can help them."
                  className="mentor-edit-textarea"
                />
              </div>

              <div className="mentor-edit-form-group">
                <label htmlFor="skills" className="mentor-edit-label">
                  Skills and Expertise
                </label>

                <input
                  id="skills"
                  type="text"
                  value={skillsText}
                  onChange={(e) => setSkillsText(e.target.value)}
                  placeholder="Example: React, UI/UX Design, JavaScript"
                  className="mentor-edit-input"
                />

                <p className="mentor-edit-help">
                  Separate each skill with a comma.
                </p>
              </div>

              {message && (
                <p className="dashboard-success-message">{message}</p>
              )}

              {errorMessage && (
                <p className="dashboard-error-message">{errorMessage}</p>
              )}

              <div className="mentor-edit-actions">
                <button
                  type="submit"
                  disabled={saving}
                  className="mentor-edit-save-button"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/mentor-dashboard")}
                  className="mentor-edit-cancel-button"
                >
                  Back to Dashboard
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}

export default MentorEditProfilePage;