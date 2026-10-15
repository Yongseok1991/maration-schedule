import { supabase, isSupabaseConfigured } from "./supabase";

export const authService = {
  isConfigured: () => isSupabaseConfigured,

  async getSession() {
    if (!supabase) return null;
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn("Auth getSession error:", error.message);
      return null;
    }
    return data.session;
  },

  async getUser() {
    if (!supabase) return null;
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user;
  },

  async signUp({ email, password, nickname }) {
    if (!supabase) throw new Error("Supabase가 설정되지 않았습니다.");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nickname: nickname || email.split("@")[0]
        }
      }
    });
    if (error) throw error;
    return data;
  },

  async signIn({ email, password, keepLoggedIn = true }) {
    if (!supabase) throw new Error("Supabase가 설정되지 않았습니다.");
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("racebook_keep_logged_in", keepLoggedIn ? "true" : "false");
      } catch (e) {
        console.warn("Could not save keepLoggedIn flag:", e);
      }
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    if (!supabase) return;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } finally {
      if (typeof window !== "undefined") {
        try {
          Object.keys(window.localStorage).forEach((key) => {
            if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
              window.localStorage.removeItem(key);
            }
          });
          Object.keys(window.sessionStorage).forEach((key) => {
            if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
              window.sessionStorage.removeItem(key);
            }
          });
        } catch {
          // ignore cleanup errors
        }
      }
    }
  },

  onAuthStateChange(callback) {
    if (!supabase) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  }
};
