import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Gate a route on authentication and role.
 *
 * `allowedRoles` is required. A missing or empty list denies access instead of
 * allowing it, so a mistyped prop (this component used to be handed
 * `requiredRole` by mistake and silently skipped the role check) can never open
 * a route to every signed-in user. Use `allowedRoles={null}` deliberately if a
 * route should be reachable by any authenticated role.
 */
function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <p style={{ padding: "2rem" }}>Loading...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    return (
      <main style={{ padding: "2rem" }}>
        <h2>Profile Loading</h2>
        <p>Please wait while your user profile is loaded.</p>
      </main>
    );
  }

  // Explicit opt-out: any authenticated role may enter.
  if (allowedRoles === null) {
    return children;
  }

  const permitted = Array.isArray(allowedRoles) && allowedRoles.includes(profile.role);
  if (!permitted) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;