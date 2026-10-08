import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

function ApplyMentorPage() {
  const { user, profile } = useAuth();

  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");

  // Category-related state
  const [categoriesByFaculty, setCategoriesByFaculty] = useState({});
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [existingApplication, setExistingApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      const { data, error } = await supabase
        .from("expertise_categories")
        .select("id, name, description, faculty")
        .order("faculty", { ascending: true })
        .order("name", { ascending: true });

      if (error) {
        console.error("Failed to load categories:", error);
        setLoadingCategories(false);
        return;
      }

      const grouped = {};
      (data || []).forEach((cat) => {
        const f = cat.faculty || "General";
        if (!grouped[f]) {
          grouped[f] = [];
        }
        grouped[f].push(cat);
      });

      setCategoriesByFaculty(grouped);
      setLoadingCategories(false);
    };

    loadCategories();
  }, []);

  // Load existing mentor application
  useEffect(() => {
    const loadMentorApplication = async () => {
      if (!user) {
        return;
      }

      const { data, error } = await supabase
        .from("mentor_profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        setErrorMessage(error.message);
      }

      if (data) {
        setExistingApplication(data);
        setBio(data.bio || "");
        setSkills((data.skills || []).join(", "));

        // Load selected categories for this mentor
        const { data: expertiseData, error: expError } = await supabase
          .from("mentor_expertise")
          .select("category_id")
          .eq("mentor_id", user.id);

        if (!expError && expertiseData) {
          setSelectedCategoryIds(expertiseData.map((e) => e.category_id));
        }
      }

      setLoading(false);
    };

    loadMentorApplication();
  }, [user]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setErrorMessage("");

    if (!bio.trim()) {
      setErrorMessage("Please enter a short biography.");
      return;
    }

    const skillList = skills
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);

    if (skillList.length === 0 && selectedCategoryIds.length === 0) {
      setErrorMessage("Please enter at least one skill or select at least one expertise category.");
      return;
    }

    setSubmitting(true);

    const mentorProfile = {
      bio: bio.trim(),
      skills: skillList,
      updated_at: new Date().toISOString(),
    };
    const mentorWrite = existingApplication
      ? supabase
          .from("mentor_profiles")
          .update(mentorProfile)
          .eq("id", user.id)
      : supabase.from("mentor_profiles").insert({
          id: user.id,
          ...mentorProfile,
          is_approved: false,
        });
    const { error: mentorError } = await mentorWrite;

    if (mentorError) {
      setSubmitting(false);
      setErrorMessage(mentorError.message);
      return;
    }

    // Sync mentor_expertise: delete old, insert new
    const { error: deleteError } = await supabase
      .from("mentor_expertise")
      .delete()
      .eq("mentor_id", user.id);

    if (deleteError) {
      setSubmitting(false);
      setErrorMessage(deleteError.message);
      return;
    }

    if (selectedCategoryIds.length > 0) {
      const rows = selectedCategoryIds.map((catId) => ({
        mentor_id: user.id,
        category_id: catId
      }));

      const { error: insertError } = await supabase
        .from("mentor_expertise")
        .insert(rows);

      if (insertError) {
        setSubmitting(false);
        setErrorMessage(insertError.message);
        return;
      }
    }

    setSubmitting(false);

    setMessage(
      "Mentor application submitted successfully. Please wait for administrator approval."
    );

    setExistingApplication({
      id: user.id,
      bio: bio.trim(),
      skills: skillList,
      is_approved: existingApplication?.is_approved ?? false,
    });
  };

  const toggleCategory = (categoryId) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  if (loading) {
    return <p style={{ padding: "2rem" }}>Loading mentor application...</p>;
  }

  if (profile?.role === "Mentor") {
    return (
      <main style={{ padding: "2rem" }}>
        <h1>You Are Already a Mentor</h1>
        <p>Your mentor account has already been approved.</p>
        <Link to="/">Back to Home</Link>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Apply to Become a Mentor</h1>

      <p>
        Complete this form to apply to become a mentor. An Administrator will
        review your application before approving your Mentor role.
      </p>

      {existingApplication && !existingApplication.is_approved && (
        <p style={{ color: "#9a6700", fontWeight: "bold" }}>
          Your Mentor application is awaiting administrator approval.
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="bio">Short Biography</label>
          <textarea
            id="bio"
            rows="5"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            placeholder="Describe your background, experience, and areas of mentorship."
            style={{ display: "block", width: "100%", padding: "0.6rem" }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="skills">
            Skills or Expertise Areas (separate each skill with a comma)
          </label>
          <input
            id="skills"
            type="text"
            value={skills}
            onChange={(event) => setSkills(event.target.value)}
            placeholder="Example: Python Programming, Web Development, Robotics"
            style={{ display: "block", width: "100%", padding: "0.6rem" }}
          />
        </div>

        {/* Expertise Categories */}
        <div style={{ marginBottom: "1rem" }}>
          <label>Select Expertise Categories</label>

          {loadingCategories ? (
            <p>Loading categories...</p>
          ) : Object.keys(categoriesByFaculty).length === 0 ? (
            <p>No categories available.</p>
          ) : (
            Object.entries(categoriesByFaculty).map(([faculty, cats]) => (
              <div
                key={faculty}
                style={{
                  marginTop: "1rem",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  padding: "0.75rem"
                }}
              >
                <div style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>
                  {faculty}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                    gap: "0.5rem"
                  }}
                >
                  {cats.map((cat) => {
                    const isChecked = selectedCategoryIds.includes(cat.id);
                    return (
                      <label
                        key={cat.id}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "0.5rem",
                          fontSize: "0.95rem"
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCategory(cat.id)}
                        />
                        <span>
                          <strong>{cat.name}</strong>
                          {cat.description && (
                            <div
                              style={{
                                color: "#555",
                                fontSize: "0.85rem"
                              }}
                            >
                              {cat.description}
                            </div>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {errorMessage && (
          <p style={{ color: "crimson" }}>{errorMessage}</p>
        )}

        {message && (
          <p style={{ color: "green" }}>{message}</p>
        )}

        <button type="submit" disabled={submitting}>
          {submitting
            ? "Submitting Application..."
            : existingApplication
              ? "Update Application"
              : "Submit Mentor Application"}
        </button>
      </form>

      <p style={{ marginTop: "1.5rem" }}>
        <Link to="/student-dashboard">Back to Student Dashboard</Link>
      </p>
    </main>
  );
}

export default ApplyMentorPage;