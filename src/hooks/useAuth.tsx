import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type AuthCtx = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

// Idle timeout: sign the user out after this many hours without activity.
const IDLE_TIMEOUT_HOURS = 8;
const IDLE_TIMEOUT_MS = IDLE_TIMEOUT_HOURS * 60 * 60 * 1000;

// Activity timestamp is written at most this often, and checked periodically.
const ACTIVITY_THROTTLE_MS = 30_000;
const ACTIVITY_KEY = "standuplog:last-activity";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const supabase = getSupabaseBrowserClient();
      const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
        setSession(s);
        setLoading(false);
      });
      unsubscribe = () => sub.subscription.unsubscribe();
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
        setLoading(false);
      });
    return () => unsubscribe?.();
  }, []);

  // Sign the user out after a period without activity (idle timeout).
  // Activity is tracked across reloads via localStorage, so returning to the
  // app after the limit shows the login screen instead of a stale session.
  useEffect(() => {
    if (!session) {
      localStorage.removeItem(ACTIVITY_KEY);
      return;
    }

    const supabase = getSupabaseBrowserClient();

    const touch = () => localStorage.setItem(ACTIVITY_KEY, String(Date.now()));

    const isExpired = () => {
      const raw = Number(localStorage.getItem(ACTIVITY_KEY));
      return Number.isFinite(raw) && raw > 0 && Date.now() - raw > IDLE_TIMEOUT_MS;
    };

    const enforce = () => {
      if (isExpired()) {
        localStorage.removeItem(ACTIVITY_KEY);
        void supabase.auth.signOut();
      }
    };

    // Seed the timestamp on a fresh login.
    if (!localStorage.getItem(ACTIVITY_KEY)) touch();

    // Check immediately (covers reopening the app after hours).
    enforce();

    let lastTouch = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastTouch < ACTIVITY_THROTTLE_MS) return;
      lastTouch = now;
      if (isExpired()) enforce();
      else touch();
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") enforce();
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart", "pointerdown"];
    for (const eventName of events) {
      window.addEventListener(eventName, onActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", enforce);

    const interval = window.setInterval(enforce, 60_000);

    return () => {
      for (const eventName of events) {
        window.removeEventListener(eventName, onActivity);
      }
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", enforce);
      window.clearInterval(interval);
    };
  }, [session]);

  const value: AuthCtx = {
    session,
    user: session?.user ?? null,
    loading,
    async signIn(email, password) {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    async signUp(email, password) {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      return { error: error?.message ?? null };
    },
    async signOut() {
      const supabase = getSupabaseBrowserClient();
      localStorage.removeItem(ACTIVITY_KEY);
      await supabase.auth.signOut();
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}

