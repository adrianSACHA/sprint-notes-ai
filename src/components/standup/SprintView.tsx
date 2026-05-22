import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Trash2, FileText, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isSameDay, parseISO } from "date-fns";
import { isoDate, sprintWeeks, daysWithNotes, type Note, type Sprint } from "@/lib/standup";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { SprintReviewDialog } from "./SprintReviewDialog";
import { EditSprintDialog } from "./EditSprintDialog";

export function SprintView({
  sprint,
  notes,
  currentWeek,
  onNotesChange,
  onSprintChange,
}: {
  sprint: Sprint;
  notes: Note[];
  currentWeek: number;
  onNotesChange: () => void;
  onSprintChange: () => void;
}) {
  const { user } = useAuth();
  const weeks = useMemo(() => sprintWeeks(sprint), [sprint]);
  const week = weeks[Math.min(currentWeek, weeks.length - 1)] ?? [];
  const today = new Date();

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const todayIso = isoDate(today);
    if (week.find((d) => isoDate(d) === todayIso)) return todayIso;
    return week[0] ? isoDate(week[0]) : todayIso;
  });

  useEffect(() => {
    const todayIso = isoDate(today);
    if (week.find((d) => isoDate(d) === todayIso)) setSelectedDate(todayIso);
    else if (week[0]) setSelectedDate(isoDate(week[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sprint.id, currentWeek]);

  const dayHasNotes = useMemo(() => {
    const s = new Set(notes.map((n) => n.date));
    return s;
  }, [notes]);

  const dayNotes = useMemo(
    () =>
      notes
        .filter((n) => n.date === selectedDate)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [notes, selectedDate]
  );

  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed || !user || submitting) return;
    if (trimmed.length > 500) {
      toast.error("Maksymalnie 500 znaków");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("notes").insert({
      user_id: user.id,
      sprint_id: sprint.id,
      date: selectedDate,
      text: trimmed,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setText("");
    taRef.current?.focus();
    onNotesChange();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    onNotesChange();
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="flex-1 flex flex-col h-screen min-w-0">
      {/* Header */}
      <header className="px-8 py-5 border-b border-border flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{sprint.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {format(parseISO(sprint.start_date), "d MMM")} – {format(parseISO(sprint.end_date), "d MMM yyyy")}
          </p>
        </div>
        <Button variant="secondary" onClick={() => setReviewOpen(true)}>
          <FileText className="size-4 mr-1.5" />
          Sprint Review
        </Button>
      </header>

      {/* Stats */}
      <div className="px-8 py-4 flex gap-3 flex-wrap border-b border-border">
        <Stat label="Dni z notatkami" value={daysWithNotes(notes)} />
        <Stat label="Notatek łącznie" value={notes.length} />
        <Stat label="Tygodnie sprintu" value={weeks.length} />
      </div>

      {/* Day tabs */}
      <div className="px-8 py-3 flex gap-1.5 border-b border-border overflow-x-auto">
        {week.map((d) => {
          const iso = isoDate(d);
          const active = iso === selectedDate;
          const isToday = isSameDay(d, today);
          const has = dayHasNotes.has(iso);
          return (
            <button
              key={iso}
              onClick={() => setSelectedDate(iso)}
              className={cn(
                "px-3 py-2 rounded-md text-left min-w-[88px] transition-colors relative",
                active
                  ? "bg-secondary text-secondary-foreground"
                  : "hover:bg-secondary/50 text-muted-foreground"
              )}
            >
              <div className={cn("text-[10px] uppercase tracking-wide", isToday && "text-primary font-semibold")}>
                {format(d, "EEE")}
              </div>
              <div className={cn("text-sm font-medium", isToday && !active && "text-foreground")}>
                {format(d, "d MMM")}
              </div>
              {has && (
                <span className="absolute top-1.5 right-2 size-1.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {dayNotes.length === 0 ? (
          <div className="text-sm text-muted-foreground">Brak notatek – wpisz co robiłeś</div>
        ) : (
          <ul className="space-y-2 max-w-3xl">
            {dayNotes.map((n) => (
              <li
                key={n.id}
                className="group flex items-start justify-between gap-4 rounded-md bg-card px-4 py-3 hover:bg-accent/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm whitespace-pre-wrap break-words">{n.text}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {format(parseISO(n.created_at), "HH:mm")}
                  </div>
                </div>
                <button
                  onClick={() => remove(n.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  aria-label="Usuń notatkę"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Input */}
      <div className="px-8 py-4 border-t border-border bg-background">
        <div className="max-w-3xl flex items-end gap-2">
          <Textarea
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 500))}
            onKeyDown={handleKey}
            placeholder={`Co robiłeś ${format(parseISO(selectedDate), "EEEE d MMM")}? (Enter aby wysłać, Shift+Enter nowa linia)`}
            rows={2}
            className="resize-none"
          />
          <Button onClick={submit} disabled={!text.trim() || submitting} size="icon" className="size-10 shrink-0">
            <Send className="size-4" />
          </Button>
        </div>
        <div className="max-w-3xl text-[11px] text-muted-foreground mt-1.5 text-right">
          {text.length}/500
        </div>
      </div>

      <SprintReviewDialog open={reviewOpen} onOpenChange={setReviewOpen} sprint={sprint} notes={notes} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-card px-4 py-2.5 min-w-[140px]">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold mt-0.5">{value}</div>
    </div>
  );
}
