import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/standup/Sidebar";
import { SprintView } from "@/components/standup/SprintView";
import { NewSprintDialog } from "@/components/standup/NewSprintDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { sprintWeeks, type Note, type Sprint } from "@/lib/standup";
import { Toaster } from "@/components/ui/sonner";
import { isSameDay, parseISO } from "date-fns";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export const Route = createFileRoute("/")({
  component: () => (
    <AuthProvider>
      <Toaster />
      <Gate />
    </AuthProvider>
  ),
});

function Gate() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [session, loading, navigate]);
  if (loading) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Ładowanie...</div>;
  if (!session) return null;
  return <App />;
}

function App() {
  const { user } = useAuth();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [newOpen, setNewOpen] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const loadSprints = useCallback(async () => {
    if (!user) return;
    const supabase = await getSupabaseBrowserClient();
    const { data } = await supabase
      .from("sprints")
      .select("*")
      .order("start_date", { ascending: false });
    setSprints((data as Sprint[]) ?? []);
  }, [user]);

  const loadAllNotes = useCallback(async () => {
    if (!user) return;
    const supabase = await getSupabaseBrowserClient();
    const { data } = await supabase.from("notes").select("*");
    setNotes((data as Note[]) ?? []);
  }, [user]);

  useEffect(() => {
    (async () => {
      await Promise.all([loadSprints(), loadAllNotes()]);
      setBootstrapping(false);
    })();
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

  // Reset week when sprint changes — pick week containing today if possible
  useEffect(() => {
    if (!selectedId) return;
    const sprint = sprints.find((s) => s.id === selectedId);
    if (!sprint) return;
    const weeks = sprintWeeks(sprint);
    const todayIdx = weeks.findIndex((w) => w.some((d) => isSameDay(d, new Date())));
    setCurrentWeek(todayIdx >= 0 ? todayIdx : 0);
  }, [selectedId, sprints]);

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

  const weeks = selectedSprint ? sprintWeeks(selectedSprint).length : 0;

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
        weeks={weeks}
        currentWeek={currentWeek}
        onWeekChange={setCurrentWeek}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />

      {selectedSprint ? (
        <SprintView
          sprint={selectedSprint}
          notes={sprintNotes}
          currentWeek={currentWeek}
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
