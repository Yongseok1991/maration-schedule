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

  async signIn({ email, password }) {
    if (!supabase) throw new Error("Supabase가 설정되지 않았습니다.");
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
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
