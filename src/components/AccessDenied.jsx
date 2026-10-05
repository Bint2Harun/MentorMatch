import { Link } from "react-router-dom";

/**
 * Shared "Access Denied" panel.
 *
 * Replaces seven near-identical inline copies so the copy and layout stay
 * consistent. `useRole` decides *when* this renders; this only owns how it
 * looks.
 */
function AccessDenied({ detail }) {
  return (
    <main className="container">
      <h1>Access Denied</h1>
      <p>
        {detail ?? "You do not have permission to access this page."}
      </p>
      <Link to="/">Back to Home</Link>
    </main>
  );
}

export default AccessDenied;