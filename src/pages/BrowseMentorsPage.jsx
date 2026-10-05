import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

// The RPC is asked for one extra row so we can tell whether a next page exists
// without a second count query.
const PAGE_SIZE = 12;

function BrowseMentorsPage() {
  const { user, profile, loading: authLoading } = useAuth();

  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedFaculty, setSelectedFaculty] = useState("All");
  const [faculties, setFaculties] = useState([]);
  const [page, setPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);

  // Faculty list comes from expertise_categories rather than from the mentors
  // on screen: once filtering happens in SQL the visible rows no longer contain
  // every faculty, so deriving the dropdown from them would drop options.
  useEffect(() => {
    const loadFaculties = async () => {
      const { data, error } = await supabase
        .from("expertise_categories")
        .select("faculty")
        .not("faculty", "is", null);

      if (error) {
        console.error("Error loading faculties:", error);
        return;
      }

      const unique = new Set(
        (data || []).map((row) => row.faculty).filter(Boolean)
      );
      setFaculties(["All", ...Array.from(unique).sort()]);
    };

    loadFaculties();
  }, []);

  useEffect(() => {
    const loadMentors = async () => {
      setLoading(true);
      setErrorMessage("");

      // search_mentors enforces is_approved and role = 'Mentor' server-side and
      // aggregates expertise categories, replacing the nested PostgREST joins
      // this page used to normalise by hand.
      const { data, error } = await supabase.rpc("search_mentors", {
        p_faculty: selectedFaculty === "All" ? null : selectedFaculty,
        p_limit: PAGE_SIZE + 1,
        p_offset: page * PAGE_SIZE,
      });

      if (error) {
        console.error("Error loading mentors:", error);
        setErrorMessage("Unable to load mentors. Please try again.");
        setMentors([]);
        setHasNextPage(false);
        setLoading(false);
        return;
      }

      const rows = data || [];
      setHasNextPage(rows.length > PAGE_SIZE);

      const transformed = rows.slice(0, PAGE_SIZE).map((row) => ({
        id: row.id,
        bio: row.bio || "",
        skills: Array.isArray(row.skills) ? row.skills : [],
        industry: row.industry,
        yearsExperience: row.years_experience,
        timezone: row.timezone,
        profiles: {
          full_name: row.full_name,
          email: row.email,
        },
        // The RPC aggregates category_ids / category_names / category_faculties
        // with one shared `order by`, so they are index-aligned by construction.
        categories: (row.category_names || []).map((name, index) => ({
          id: (row.category_ids || [])[index],
          name,
          faculty: (row.category_faculties || [])[index],
        })),
      }));

      setMentors(transformed);
      setLoading(false);
    };

    loadMentors();
  }, [selectedFaculty, page]);

  // Changing the faculty invalidates the current offset.
  const handleFacultyChange = (faculty) => {
    setSelectedFaculty(faculty);
    setPage(0);
  };

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
            onChange={(e) => handleFacultyChange(e.target.value)}
          >
            {faculties.map((faculty) => (
              <option key={faculty} value={faculty}>
                {faculty}
              </option>
            ))}
          </select>
        </div>

        <p className="browse-mentors-count">
          {mentors.length === 0
            ? "No mentors on this page"
            : `Showing ${page * PAGE_SIZE + 1}-${
                page * PAGE_SIZE + mentors.length
              }`}
        </p>
      </section>

      {/* Error State */}
      {errorMessage && (
        <div className="dashboard-error-message">{errorMessage}</div>
      )}

      {/* Empty State */}
      {!errorMessage && mentors.length === 0 && (
        <div className="dashboard-empty-state">
          No approved mentors were found for this faculty.
        </div>
      )}

      {/* Mentor Cards */}
      {!errorMessage && mentors.length > 0 && (
        <section className="mentor-card-grid">
          {mentors.map((mentor, index) => {
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

      {/* Pagination */}
      {!errorMessage && mentors.length > 0 && (page > 0 || hasNextPage) && (
        <nav
          className="browse-mentors-pagination"
          aria-label="Mentor list pages"
        >
          <button
            type="button"
            className="btn btn-secondary"
            disabled={page === 0 || loading}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </button>

          <span className="browse-mentors-count">Page {page + 1}</span>

          <button
            type="button"
            className="btn btn-secondary"
            disabled={!hasNextPage || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </nav>
      )}
    </main>
  );
}

export default BrowseMentorsPage;