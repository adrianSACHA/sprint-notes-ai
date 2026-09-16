import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/standup/Sidebar";
import { SprintView } from "@/components/standup/SprintView";
import { NewSprintDialog } from "@/components/standup/NewSprintDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { DEFAULT_FILTERS, type Note, type NoteFilters, type Sprint } from "@/lib/standup";
import { parseISO } from "date-fns";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

/**
 * True when a Supabase error means the access token is missing/expired.
 * PostgREST returns 401 / PGRST301 for an expired JWT.
 */
function isAuthError(error: { message?: string; code?: string; status?: number } | null): boolean {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return (
    error.status === 401 ||
    error.code === "PGRST301" ||
    message.includes("jwt") ||
    message.includes("token") ||
    message.includes("expired")
  );
}

export function StandupHome() {
  const { user } = useAuth();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [filters, setFilters] = useState<NoteFilters>(DEFAULT_FILTERS);

  const loadSprints = useCallback(async () => {
    if (!user) return;
    const supabase = getSupabaseBrowserClient();
    const run = () =>
      supabase.from("sprints").select("*").order("start_date", { ascending: false });

    let { data, error } = await run();

    // Cold tab / overnight: access token may be expired. Refresh once, retry.
    if (error && isAuthError(error)) {
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        await supabase.auth.signOut();
        return;
      }
      ({ data, error } = await run());
    }

    if (error) {
      console.error("Błąd wczytywania sprintów:", error);
      return;
    }

    setSprints((data as Sprint[]) ?? []);
  }, [user]);

  const loadAllNotes = useCallback(async () => {
    if (!user) return;
    const supabase = getSupabaseBrowserClient();
    const run = () => supabase.from("notes").select("*");

    let { data, error } = await run();

    if (error && isAuthError(error)) {
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        await supabase.auth.signOut();
        return;
      }
      ({ data, error } = await run());
    }

    if (error) {
      console.error("Błąd wczytywania notatek:", error);
      return;
    }

    setNotes((data as Note[]) ?? []);
  }, [user]);

  useEffect(() => {
    (async () => {
      await Promise.all([loadSprints(), loadAllNotes()]);
      setBootstrapping(false);
    })();
  }, [loadSprints, loadAllNotes]);

  // Re-fetch when the tab becomes visible again or the window regains focus
  // (e.g. returning to the app the next morning). The 2s guard avoids a double
  // fire from focus + visibilitychange. Token expiry is handled in the loaders.
  useEffect(() => {
    let lastRun = 0;
    const refresh = () => {
      const now = Date.now();
      if (now - lastRun < 2000) return;
      lastRun = now;
      void loadSprints();
      void loadAllNotes();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", refresh);
    };
  }, [loadSprints, loadAllNotes]);

  // React to auth changes so data stays in sync after a token refresh/sign-in.
  // Deferred with setTimeout to avoid running inside the Supabase auth lock.
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
        setTimeout(() => {
          void loadSprints();
          void loadAllNotes();
        }, 0);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [loadSprints, loadAllNotes]);

  // Auto-select first/current sprint
  useEffect(() => {
    if (selectedId && sprints.find((s) => s.id === selectedId)) return;
    if (sprints.length === 0) {
      setSelectedId(null);
      return;
    }
    const today = new Date();
    const active = sprints.find(
      (s) => parseISO(s.start_date) <= today && parseISO(s.end_date) >= today
    );
    setSelectedId((active ?? sprints[0]).id);
  }, [sprints, selectedId]);

  const noteCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const n of notes) m[n.sprint_id] = (m[n.sprint_id] ?? 0) + 1;
    return m;
  }, [notes]);

  const selectedSprint = sprints.find((s) => s.id === selectedId) ?? null;
  const sprintNotes = useMemo(
    () => (selectedId ? notes.filter((n) => n.sprint_id === selectedId) : []),
    [notes, selectedId]
  );

  if (bootstrapping) {
    return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Ładowanie...</div>;
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar
        sprints={sprints}
        selectedId={selectedId}
        onSelect={setSelectedId}
        noteCounts={noteCounts}
        onNewSprint={() => setNewOpen(true)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {selectedSprint ? (
        <SprintView
          sprint={selectedSprint}
          notes={sprintNotes}
          filters={filters}
          onNotesChange={loadAllNotes}
          onSprintChange={async () => {
            await Promise.all([loadSprints(), loadAllNotes()]);
          }}
        />
      ) : (
        <div className="flex-1 grid place-items-center px-8">
          <div className="text-left">
            <h2 className="text-xl font-semibold tracking-tight mb-2">Utwórz swój pierwszy sprint</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Zacznij logować codzienne notatki standupowe.
            </p>
            <Button onClick={() => setNewOpen(true)}>
              <Plus className="size-4 mr-1" />
              Nowy sprint
            </Button>
          </div>
        </div>
      )}

      <NewSprintDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={async (id) => {
          await loadSprints();
          setSelectedId(id);
        }}
      />
    </div>
  );
}
