import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Profile error:", error.message);
      setProfile(null);
      return;
    }

    setProfile(data);
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const {
        data: { session: currentSession }
      } = await supabase.auth.getSession();

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        await fetchProfile(currentSession.user.id);
      }

      setLoading(false);
    };

    initializeAuth();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        await fetchProfile(currentSession.user.id);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async ({ fullName, email, password }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    return { data, error };
  };

  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    return { data, error };
  };

  /**
   * OAuth entry point (e.g. Google).
   *
   * Returns us to /login so the existing role router performs the redirect.
   * Supabase drops the tokens into the URL fragment, onAuthStateChange picks up
   * the session, and the page's effect sends the user to the right dashboard.
   *
   * REQUIRES: the provider enabled in Supabase -> Authentication -> Providers,
   * and this URL added to Authentication -> URL Configuration -> Redirect URLs.
   * Also requires the handle_new_user trigger from migration 0002 so an OAuth
   * user gets a profiles row; without it they sign in with no profile and are
   * bounced back to the home page.
   */
  const signInWithOAuth = async ({ provider }) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/login`
      }
    });

    return { data, error };
  };

  /**
   * Sends the password reset email.
   *
   * REQUIRES working SMTP. Supabase's built-in SMTP only delivers to project
   * team members and is heavily rate limited, so real users will not receive
   * the mail until custom SMTP is configured. Also requires this redirect URL
   * whitelisted under Authentication -> URL Configuration.
   */
  const sendPasswordReset = async ({ email }) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    return { data, error };
  };

  /**
   * Completes a password reset. Only valid while the user holds a recovery
   * session, which Supabase creates from the emailed link.
   */
  const updatePassword = async ({ password }) => {
    const { data, error } = await supabase.auth.updateUser({ password });

    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signUp,
        signIn,
        signInWithOAuth,
        sendPasswordReset,
        updatePassword,
        signOut,
        fetchProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Context files legitimately export both the provider and the hook that
// consumes it; splitting them across files would only add import churn.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}