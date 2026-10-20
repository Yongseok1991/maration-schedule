import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://ayvxlbnovvsdupxsotec.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_1lcq2IVZvi71rgHJrZMvVg_sUse0Vzp";

const supabaseUrl = (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_ANON_KEY) || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const memStorage = new Map();

const authStorage = {
  getItem: (key) => {
    if (typeof window === "undefined") return memStorage.get(key) || null;
    try {
      return window.sessionStorage.getItem(key) || window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    if (typeof window === "undefined") {
      memStorage.set(key, value);
      return;
    }
    try {
      const keepLoggedIn = window.localStorage.getItem("racebook_keep_logged_in") !== "false";
      if (keepLoggedIn) {
        window.localStorage.setItem(key, value);
        window.sessionStorage.removeItem(key);
      } else {
        window.sessionStorage.setItem(key, value);
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn("Auth storage setItem error:", e);
    }
  },
  removeItem: (key) => {
    if (typeof window === "undefined") {
      memStorage.delete(key);
      return;
    }
    try {
      window.sessionStorage.removeItem(key);
      window.localStorage.removeItem(key);
    } catch (e) {
      console.warn("Auth storage removeItem error:", e);
    }
  }
};

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: authStorage,
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null;
