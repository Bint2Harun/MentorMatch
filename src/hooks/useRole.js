import { useAuth } from "../context/AuthContext";

/**
 * Role check for pages that are rendered behind a <ProtectedRoute>.
 *
 * The protected routes already gate on role, so this is a defence-in-depth
 * check for pages that also render their own "Access Denied" panel. It exists
 * mostly to give a correct tri-state: the previous inline checks read
 * `profile?.role !== "Mentor"`, which is true while `profile` is still null,
 * so every guarded page flashed "Access Denied" during profile load before
 * flipping to the real content.
 *
 * @param {...string} roles roles permitted on this page
 * @returns {{loading: boolean, isAuthenticated: boolean, role: string|null,
 *            profilePending: boolean, isAllowed: boolean}}
 */
export function useRole(...roles) {
  const { user, profile, loading } = useAuth();

  const isAuthenticated = Boolean(user);
  const role = profile?.role ?? null;
  // The session resolved but the profile row has not arrived yet. Access is
  // still unknown, so callers must render a loader rather than a denial.
  const profilePending = !loading && isAuthenticated && profile == null;

  const isAllowed = !loading && isAuthenticated && roles.includes(role);

  return { loading, isAuthenticated, role, profilePending, isAllowed };
}

export default useRole;