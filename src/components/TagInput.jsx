import { useState } from "react";

/**
 * Comma/Enter-separated tag chips input. `value` is a string array; typing a
 * tag and pressing Enter or comma commits it. Used for interests and preferred
 * topics so students answer in tags rather than free-form walls of text.
 */
function TagInput({ value = [], onChange, placeholder = "" }) {
  const [draft, setDraft] = useState("");

  const commitDraft = () => {
    const raw = draft.trim();
    if (!raw) {
      setDraft("");
      return;
    }

    const seen = new Set(value.map((tag) => tag.toLowerCase()));
    const next = value.slice();
    const tags = raw
      .split(/[,;\n]+/)
      .map((tag) => tag.trim())
      .filter(Boolean);

    for (const tag of tags) {
      const key = tag.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        next.push(tag);
      }
    }

    onChange(next);
    setDraft("");
  };

  const removeTag = (index) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="tag-input">
      <div className="tag-input-chips">
        {value.map((tag, index) => (
          <span key={`${tag}-${index}`} className="dashboard-tag dashboard-tag-green">
            {tag}
            <button
              type="button"
              className="tag-input-remove"
              aria-label={`Remove ${tag}`}
              onClick={() => removeTag(index)}
            >
              &times;
            </button>
          </span>
        ))}

        <input
          type="text"
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              commitDraft();
            } else if (event.key === "Backspace" && !draft && value.length > 0) {
              removeTag(value.length - 1);
            }
          }}
          onBlur={commitDraft}
        />
      </div>
    </div>
  );
}

export default TagInput;