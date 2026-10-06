import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import TagInput from "./TagInput";

/**
 * "Edit Profile" modal for a Student: photo upload (avatars bucket), name,
 * interests, learning goals and preferred topics. Saves through the normal
 * profiles_write path; the DB guard still protects role/email.
 */
function EditProfileModal({ open, onClose }) {
  const { user, profile, fetchProfile } = useAuth();

  const [fullName, setFullName] = useState("");
  const [interests, setInterests] = useState([]);
  const [learningGoals, setLearningGoals] = useState("");
  const [preferredTopics, setPreferredTopics] = useState([]);

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (open && profile) {
      // Rehydrate the form each time the modal opens. Same documented pattern
      // as AdminDashboard's fetch-on-mount loaders.
      /* eslint-disable react-hooks/set-state-in-effect */
      setFullName(profile.full_name || "");
      setInterests(Array.isArray(profile.interests) ? profile.interests : []);
      setLearningGoals(profile.learning_goals || "");
      setPreferredTopics(
        Array.isArray(profile.preferred_topics) ? profile.preferred_topics : []
      );
      setAvatarFile(null);
      setAvatarPreview(null);
      setErrorMessage("");
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open, profile]);

  if (!open || !user) return null;

  const initials = (fullName || "Student").charAt(0).toUpperCase();

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please choose an image file for your avatar.");
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setErrorMessage("");
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      setErrorMessage("Full name cannot be empty.");
      return;
    }

    setSaving(true);
    setErrorMessage("");

    let avatarUrl = profile.avatar_url || null;

    if (avatarFile) {
      const filePath = `${user.id}/avatar`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, avatarFile, {
          upsert: true,
          contentType: avatarFile.type,
        });

      if (uploadError) {
        setErrorMessage(`Avatar upload failed: ${uploadError.message}`);
        setSaving(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      avatarUrl = publicUrl;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        avatar_url: avatarUrl,
        interests,
        learning_goals: learningGoals.trim(),
        preferred_topics: preferredTopics,
      })
      .eq("id", user.id);

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await fetchProfile(user.id);
    onClose();
  };

  const avatarSrc =
    avatarPreview || (profile.avatar_url ? profile.avatar_url : null);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Edit Profile</h2>

          <button
            type="button"
            className="modal-close"
            aria-label="Close"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="edit-profile-avatar-row">
            <div className="dashboard-avatar edit-profile-avatar">
              {avatarSrc ? (
                <img src={avatarSrc} alt="Profile avatar" />
              ) : (
                initials
              )}
            </div>

            <div>
              <label className="btn btn-secondary edit-profile-upload">
                {avatarFile ? "Change photo" : "Upload photo"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  hidden
                />
              </label>

              {avatarFile && (
                <button
                  type="button"
                  className="btn btn-danger edit-profile-upload"
                  onClick={() => {
                    setAvatarFile(null);
                    setAvatarPreview(null);
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <div className="edit-profile-field">
            <label htmlFor="edit-full-name">Full Name</label>
            <input
              id="edit-full-name"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </div>

          <div className="edit-profile-field">
            <label htmlFor="edit-interests">Interests / Learning Goals</label>
            <TagInput
              value={interests}
              onChange={setInterests}
              placeholder="e.g. data science, public speaking"
            />
            <p className="dashboard-muted-text">
              Tags only. Press Enter or comma to add each interest.
            </p>
          </div>

          <div className="edit-profile-field">
            <label htmlFor="edit-learning-goals">Learning Goals</label>
            <textarea
              id="edit-learning-goals"
              value={learningGoals}
              onChange={(event) => setLearningGoals(event.target.value)}
              rows={3}
              placeholder="What do you want to achieve with mentoring?"
            />
          </div>

          <div className="edit-profile-field">
            <label htmlFor="edit-preferred-topics">Preferred Tech Stack/Topics</label>
            <TagInput
              value={preferredTopics}
              onChange={setPreferredTopics}
              placeholder="e.g. Python, React, system design"
            />
          </div>

          {errorMessage && (
            <div className="dashboard-error-message">{errorMessage}</div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>

          <button
            type="button"
            className="btn btn-primary"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditProfileModal;