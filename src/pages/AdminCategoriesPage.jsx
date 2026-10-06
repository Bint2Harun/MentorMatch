import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../hooks/useRole";
import AccessDenied from "../components/AccessDenied";
import { supabase } from "../lib/supabase";

function AdminCategoriesPage() {
  const { profile, signOut } = useAuth();
  const { loading: authLoading, profilePending, isAllowed } = useRole("Administrator");

  const [categoriesByFaculty, setCategoriesByFaculty] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Form state
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [faculty, setFaculty] = useState("General");

  const faculties = [
    "Business",
    "Engineering & Technology",
    "Mathematics & Statistics",
    "Social Sciences & Humanities",
    "Health & Life Sciences",
    "Law & Professional Studies",
    "General"
  ];

  const loadCategories = async () => {
    setLoading(true);
    setMessage("");
    setErrorMessage("");

    const { data, error } = await supabase
      .from("expertise_categories")
      .select("id, name, description, faculty")
      .order("faculty", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
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
    setLoading(false);
  };

  useEffect(() => {
    if (profile?.role === "Administrator") {
      // Standard fetch-on-mount: the loader flips its loading flag before
      // awaiting the request, which the new rule reads as a cascading render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadCategories();
    }
  }, [profile]);

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) alert(error.message);
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setName("");
    setDescription("");
    setFaculty("General");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (!name.trim()) {
      setErrorMessage("Category name is required.");
      return;
    }

    if (editingId) {
      // Update existing
      const { error } = await supabase
        .from("expertise_categories")
        .update({
          name: name.trim(),
          description: description.trim(),
          faculty,
          updated_at: new Date().toISOString()
        })
        .eq("id", editingId);

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setMessage("Category updated successfully.");
    } else {
      // Insert new
      const { error } = await supabase
        .from("expertise_categories")
        .insert({
          name: name.trim(),
          description: description.trim(),
          faculty,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setMessage("Category added successfully.");
    }

    resetForm();
    loadCategories();
  };

  const handleEdit = (cat) => {
    setIsAdding(true);
    setEditingId(cat.id);
    setName(cat.name);
    setDescription(cat.description || "");
    setFaculty(cat.faculty || "General");
  };

  const handleDelete = async (id, catName) => {
    if (!confirm(`Delete category "${catName}"? This cannot be undone.`)) {
      return;
    }

    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("expertise_categories")
      .delete()
      .eq("id", id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMessage("Category deleted successfully.");
    if (editingId === id) resetForm();
    loadCategories();
  };

  if (authLoading || profilePending) {
    return <p style={{ padding: "2rem" }}>Loading...</p>;
  }

  if (!isAllowed) {
    return <AccessDenied />;
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #ccc",
          paddingBottom: "1rem"
        }}
      >
        <div>
          <h1>Manage Expertise Categories</h1>
          <p>
            Welcome, <strong>{profile?.full_name || "Administrator"}</strong>
          </p>
        </div>

        <button onClick={handleLogout}>Logout</button>
      </header>

      {/* Add / Edit Form */}
      <section style={{ marginTop: "2rem" }}>
        <h2>{editingId ? "Edit Category" : isAdding ? "Add Category" : "Categories"}</h2>

        {!isAdding ? (
          <button onClick={() => setIsAdding(true)}>Add New Category</button>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{
              border: "1px solid #ccc",
              padding: "1rem",
              borderRadius: "6px",
              marginTop: "1rem",
              maxWidth: "600px"
            }}
          >
            <div style={{ marginBottom: "1rem" }}>
              <label htmlFor="name">Category Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Accounting"
                style={{ display: "block", width: "100%", padding: "0.6rem" }}
                required
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label htmlFor="description">Description (optional)</label>
              <textarea
                id="description"
                rows="3"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this category"
                style={{ display: "block", width: "100%", padding: "0.6rem" }}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label htmlFor="faculty">Faculty / Department</label>
              <select
                id="faculty"
                value={faculty}
                onChange={(e) => setFaculty(e.target.value)}
                style={{ display: "block", width: "100%", padding: "0.6rem" }}
              >
                {faculties.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            {errorMessage && (
              <p style={{ color: "crimson" }}>{errorMessage}</p>
            )}

            {message && (
              <p style={{ color: "green" }}>{message}</p>
            )}

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="submit">
                {editingId ? "Update Category" : "Save Category"}
              </button>
              <button type="button" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Grouped Categories */}
      <section style={{ marginTop: "2rem" }}>
        <h2>Existing Categories</h2>

        {loading && <p>Loading categories...</p>}

        {!loading && Object.keys(categoriesByFaculty).length === 0 && (
          <p>No categories found.</p>
        )}

        {!loading &&
          Object.entries(categoriesByFaculty).map(([fac, cats]) => (
            <div
              key={fac}
              style={{
                marginBottom: "2rem",
                border: "1px solid #ddd",
                borderRadius: "6px",
                padding: "1rem"
              }}
            >
              <h3 style={{ marginTop: 0 }}>{fac}</h3>

              <ul style={{ listStyle: "none", padding: 0 }}>
                {cats.map((cat) => (
                  <li
                    key={cat.id}
                    style={{
                      marginBottom: "0.75rem",
                      paddingBottom: "0.75rem",
                      borderBottom: "1px solid #eee"
                    }}
                  >
                    <div style={{ fontWeight: "bold" }}>{cat.name}</div>
                    {cat.description && (
                      <div style={{ color: "#555", fontSize: "0.95rem" }}>
                        {cat.description}
                      </div>
                    )}
                    <div style={{ marginTop: "0.5rem" }}>
                      <button
                        onClick={() => handleEdit(cat)}
                        style={{ marginRight: "0.5rem" }}
                      >
                        Edit
                      </button>
                      <button onClick={() => handleDelete(cat.id, cat.name)}>
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </section>

      <p style={{ marginTop: "2rem" }}>
        <Link to="/admin-dashboard">Back to Admin Dashboard</Link>
      </p>
    </main>
  );
}

export default AdminCategoriesPage;