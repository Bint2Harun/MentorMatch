import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

function BrowseMentorsPage() {
  const { user, profile, loading: authLoading } = useAuth();

  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedFaculty, setSelectedFaculty] = useState("All");
  const [faculties, setFaculties] = useState([]);

  useEffect(() => {
    const loadMentors = async () => {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("mentor_profiles")
        .select(`
          id,
          bio,
          skills,
          is_approved,
          mentor_expertise (
            expertise_categories (
              id,
              name,
              faculty
            )
          ),
          profiles:profiles!inner (
            full_name,
            email
          )
        `)
        .eq("is_approved", true)
        .order("bio", { ascending: true });

      if (error) {
        console.error("Error loading mentors:", error);
        setErrorMessage("Unable to load mentors. Please try again.");
        setLoading(false);
        return;
      }

      const transformed = (data || []).map((mentor) => {
        const profileData = Array.isArray(mentor.profiles)
          ? mentor.profiles[0]
          : mentor.profiles;

        const categories = (mentor.mentor_expertise || [])
          .map((expertise) => expertise.expertise_categories)
          .filter(Boolean);

        return {
          id: mentor.id,
          bio: mentor.bio || "",
          skills: Array.isArray(mentor.skills) ? mentor.skills : [],
          profiles: profileData,
          categories,
        };
      });

      setMentors(transformed);

      const facultySet = new Set();

      transformed.forEach((mentor) => {
        mentor.categories.forEach((category) => {
          if (category.faculty) {
            facultySet.add(category.faculty);
          }
        });
      });

      setFaculties(["All", ...Array.from(facultySet).sort()]);
      setLoading(false);
    };

    loadMentors();
  }, []);

  const filteredMentors =
    selectedFaculty === "All"
      ? mentors
      : mentors.filter((mentor) =>
          mentor.categories.some(
            (category) => category.faculty === selectedFaculty
          )
        );

  const getBackLink = () => {
    if (!user) return "/";

    if (profile?.role === "Student") {
      return "/student-dashboard";
    }

    if (profile?.role === "Mentor") {
      return "/mentor-dashboard";
    }

    if (profile?.role === "Administrator") {
      return "/admin-dashboard";
    }

    return "/";
  };

  const getBackLabel = () => {
    if (!user) return "Back to Home";

    if (profile?.role === "Student") {
      return "Back to Student Dashboard";
    }

    if (profile?.role === "Mentor") {
      return "Back to Mentor Dashboard";
    }

    if (profile?.role === "Administrator") {
      return "Back to Admin Dashboard";
    }

    return "Back to Home";
  };

  if (authLoading || loading) {
    return (
      <main className="container">
        <p>Loading mentors...</p>
      </main>
    );
  }

  return (
    <main className="container">
      {/* Page Header */}
      <header className="browse-mentors-header">
        <div>
          <h1>Browse Mentors</h1>
          <p className="browse-mentors-subtitle">
            Find approved mentors by expertise, category, and faculty.
          </p>
        </div>

        <Link to={getBackLink()} className="btn btn-secondary">
          {getBackLabel()}
        </Link>
      </header>

      {/* Faculty Filter */}
      <section className="browse-mentors-filter">
        <div>
          <label htmlFor="faculty-filter">Filter by Faculty</label>

          <select
            id="faculty-filter"
            value={selectedFaculty}
            onChange={(e) => setSelectedFaculty(e.target.value)}
          >
            {faculties.map((faculty) => (
              <option key={faculty} value={faculty}>
                {faculty}
              </option>
            ))}
          </select>
        </div>

        <p className="browse-mentors-count">
          {filteredMentors.length} mentor
          {filteredMentors.length === 1 ? "" : "s"} found
        </p>
      </section>

      {/* Error State */}
      {errorMessage && (
        <div className="dashboard-error-message">{errorMessage}</div>
      )}

      {/* Empty State */}
      {!errorMessage && filteredMentors.length === 0 && (
        <div className="dashboard-empty-state">
          No approved mentors were found for this faculty.
        </div>
      )}

      {/* Mentor Cards */}
      {!errorMessage && filteredMentors.length > 0 && (
        <section className="mentor-card-grid">
          {filteredMentors.map((mentor, index) => {
            const mentorName = mentor.profiles?.full_name || "Mentor";

            const initials = mentorName
              .split(" ")
              .map((namePart) => namePart.charAt(0))
              .join("")
              .slice(0, 2)
              .toUpperCase();

            const accentClass =
              index % 4 === 0
                ? "mentor-card-green"
                : index % 4 === 1
                ? "mentor-card-dark-green"
                : index % 4 === 2
                ? "mentor-card-orange"
                : "mentor-card-blue";

            return (
              <article
                key={mentor.id}
                className={`mentor-card ${accentClass}`}
              >
                {/* Mentor Name and Email */}
                <div className="mentor-card-top">
                  <div className="mentor-card-avatar">{initials}</div>

                  <div className="mentor-card-heading">
                    <h2 className="mentor-card-name">
                      <Link to={`/mentor/${mentor.id}`}>
                        {mentorName}
                      </Link>
                    </h2>

                    {mentor.profiles?.email && (
                      <p className="mentor-card-email">
                        {mentor.profiles.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Biography */}
                <div className="mentor-card-section">
                  <div className="mentor-card-label">About</div>

                  <p className="mentor-card-bio">
                    {mentor.bio ||
                      "This mentor has not added a biography yet."}
                  </p>
                </div>

                {/* Skills */}
                <div className="mentor-card-section">
                  <div className="mentor-card-label">Skills</div>

                  {mentor.skills.length > 0 ? (
                    <div className="dashboard-tag-list">
                      {mentor.skills.map((skill) => (
                        <span
                          key={skill}
                          className="dashboard-tag dashboard-tag-green"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="dashboard-muted-text">
                      No skills listed.
                    </p>
                  )}
                </div>

                {/* Categories */}
                <div className="mentor-card-section">
                  <div className="mentor-card-label">Expertise Areas</div>

                  {mentor.categories.length > 0 ? (
                    <div className="dashboard-tag-list">
                      {mentor.categories.map((category) => (
                        <span
                          key={category.id}
                          className="dashboard-tag dashboard-tag-neutral"
                        >
                          {category.name}
                          {category.faculty
                            ? ` — ${category.faculty}`
                            : ""}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="dashboard-muted-text">
                      No expertise areas listed.
                    </p>
                  )}
                </div>

                {/* Card Actions */}
                <div className="mentor-card-actions">
                  <Link
                    to={`/mentor/${mentor.id}`}
                    className="btn btn-primary"
                  >
                    View Profile
                  </Link>

                  {profile?.role === "Student" && (
                    <Link
                      to={`/mentor/${mentor.id}`}
                      className="btn btn-secondary"
                    >
                      Book Session
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

export default BrowseMentorsPage;