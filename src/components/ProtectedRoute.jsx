import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;