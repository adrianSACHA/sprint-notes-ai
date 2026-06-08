export async function getSupabaseBrowserClient() {
  if (typeof window === "undefined") {
    throw new Error("Backend browser client is only available in the browser");
  }

  const { supabase } = await import("@/integrations/supabase/client");
  return supabase;
}