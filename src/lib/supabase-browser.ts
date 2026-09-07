import { supabase } from "@/lib/supabase";

// SPA-only: Supabase runs entirely in the browser and is guarded by RLS,
// so this resolves to the single browser client defined in src/lib/supabase.ts.
export function getSupabaseBrowserClient() {
  return supabase;
}