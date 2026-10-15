import { useState, useEffect } from "react";
import { authService } from "../services/authService";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    authService.getSession().then((currSession) => {
      if (mounted) {
        setSession(currSession);
        setUser(currSession?.user ?? null);
        setLoading(false);
      }
    });

    const { data: { subscription } } = authService.onAuthStateChange((_event, newSession) => {
      if (mounted) {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  return {
    user,
    session,
    loading,
    isConfigured: authService.isConfigured(),
    signUp: authService.signUp,
    signIn: authService.signIn,
    signOut: authService.signOut
  };
}
