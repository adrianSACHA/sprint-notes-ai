import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, Trash2, FileText, Pencil, Check, X, Star, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isSameDay, parseISO } from "date-fns";
import {
  isoDate,
  sprintWeeks,
  daysWithNotes,
  NOTE_TYPES,
  NOTE_STATUSES,
  type Note,
  type NoteStatus,
  type NoteType,
  type Sprint,
} from "@/lib/standup";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { SprintReviewDialog } from "./SprintReviewDialog";
import { EditSprintDialog } from "./EditSprintDialog";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const TYPE_STYLES: Record<NoteType, string> = {
  task: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  bug: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  review: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  meeting: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  blocker: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  note: "bg-muted text-muted-foreground border-border",
};

const STATUS_STYLES: Record<NoteStatus, string> = {
  in_progress: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  done: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  handoff_testing: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  blocked: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  info: "bg-muted text-muted-foreground border-border",
};

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

  const dayHasNotes = useMemo(() => new Set(notes.map((n) => n.date)), [notes]);

  // Filters
  const [filterType, setFilterType] = useState<NoteType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<NoteStatus | "all">("all");
  const [filterHighlight, setFilterHighlight] = useState<"all" | "yes">("all");

  const dayNotes = useMemo(() => {
    return notes
      .filter((n) => n.date === selectedDate)
      .filter((n) => (filterType === "all" ? true : n.type === filterType))
      .filter((n) => (filterStatus === "all" ? true : n.status === filterStatus))
      .filter((n) => (filterHighlight === "yes" ? n.review_highlight : true))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [notes, selectedDate, filterType, filterStatus, filterHighlight]);

  const filtersActive = filterType !== "all" || filterStatus !== "all" || filterHighlight !== "all";

  // Composer
  const [text, setText] = useState("");
  const [composerType, setComposerType] = useState<NoteType>("task");
  const [composerStatus, setComposerStatus] = useState<NoteStatus>("in_progress");
  const [composerHighlight, setComposerHighlight] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [editSprintOpen, setEditSprintOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed || !user || submitting) return;
    if (trimmed.length > 500) {
      toast.error("Maksymalnie 500 znaków");
      return;
    }
    setSubmitting(true);
    const supabase = await getSupabaseBrowserClient();
    const { error } = await supabase.from("notes").insert({
      user_id: user.id,
      sprint_id: sprint.id,
      date: selectedDate,
      text: trimmed,
      type: composerType,
      status: composerStatus,
      review_highlight: composerHighlight,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setText("");
    setComposerHighlight(false);
    taRef.current?.focus();
    onNotesChange();
  }

  async function remove(id: string) {
    const supabase = await getSupabaseBrowserClient();
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    onNotesChange();
  }

  async function patchNote(id: string, patch: Partial<Pick<Note, "status" | "type" | "review_highlight">>) {
    const supabase = await getSupabaseBrowserClient();
    const { error } = await supabase.from("notes").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    onNotesChange();
  }

  function startEdit(n: Note) {
    setEditingId(n.id);
    setEditingText(n.text);
  }
  function cancelEdit() {
    setEditingId(null);
    setEditingText("");
  }
  async function saveEdit(id: string) {
    const trimmed = editingText.trim();
    if (!trimmed) return toast.error("Notatka nie może być pusta");
    if (trimmed.length > 500) return toast.error("Maksymalnie 500 znaków");
    setEditSaving(true);
    const supabase = await getSupabaseBrowserClient();
    const { error } = await supabase.from("notes").update({ text: trimmed }).eq("id", id);
    setEditSaving(false);
    if (error) return toast.error(error.message);
    cancelEdit();
    onNotesChange();
  }

  function handleComposerKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      submit();
      return;
    }
    if (e.altKey) {
      const k = e.key.toLowerCase();
      if (k === "h") {
        e.preventDefault();
        setComposerHighlight((v) => !v);
      } else if (k === "d") {
        e.preventDefault();
        setComposerStatus("done");
      } else if (k === "b") {
        e.preventDefault();
        setComposerStatus("blocked");
        setComposerType("blocker");
      } else if (k === "q") {
        e.preventDefault();
        setComposerStatus("handoff_testing");
      } else if (k === "i") {
        e.preventDefault();
        setComposerStatus("in_progress");
      }
    }
  }

  return (
    <div className="flex-1 flex flex-col h-screen min-w-0">
      {/* Header */}
      <header className="px-8 py-5 border-b border-border flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight truncate">{sprint.name}</h1>
            <button
              onClick={() => setEditSprintOpen(true)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Edytuj sprint"
              title="Edytuj sprint"
            >
              <Pencil className="size-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {format(parseISO(sprint.start_date), "d MMM")} – {format(parseISO(sprint.end_date), "d MMM yyyy")}
          </p>
        </div>
        <Button variant="secondary" onClick={() => setReviewOpen(true)} aria-label="Otwórz Sprint Review">
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
              aria-label={`Wybierz ${format(d, "EEEE d MMM")}`}
              aria-pressed={active}
              className={cn(
                "px-3 py-2 rounded-md text-left min-w-[88px] transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
              {has && <span className="absolute top-1.5 right-2 size-1.5 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="px-8 py-2.5 flex items-center gap-2 border-b border-border bg-background/50 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
          <Filter className="size-3.5" />
          Filtruj
        </div>
        <Select value={filterType} onValueChange={(v) => setFilterType(v as NoteType | "all")}>
          <SelectTrigger className="h-8 w-[150px] text-xs" aria-label="Filtruj po typie">
            <SelectValue placeholder="Typ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie typy</SelectItem>
            {NOTE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as NoteStatus | "all")}>
          <SelectTrigger className="h-8 w-[160px] text-xs" aria-label="Filtruj po statusie">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie statusy</SelectItem>
            {NOTE_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          type="button"
          onClick={() => setFilterHighlight((v) => (v === "yes" ? "all" : "yes"))}
          aria-pressed={filterHighlight === "yes"}
          aria-label="Pokaż tylko highlights"
          className={cn(
            "h-8 px-2.5 rounded-md text-xs inline-flex items-center gap-1.5 border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            filterHighlight === "yes"
              ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
              : "border-border text-muted-foreground hover:bg-accent"
          )}
        >
          <Star className={cn("size-3.5", filterHighlight === "yes" && "fill-yellow-300")} />
          Highlights
        </button>
        {filtersActive && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
            onClick={() => {
              setFilterType("all");
              setFilterStatus("all");
              setFilterHighlight("all");
            }}
          >
            Wyczyść
          </Button>
        )}
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {dayNotes.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            {filtersActive ? "Brak notatek pasujących do filtrów." : "Brak notatek – wpisz co robiłeś"}
          </div>
        ) : (
          <ul className="space-y-2 max-w-3xl">
            {dayNotes.map((n) => {
              const isEditing = editingId === n.id;
              const typeMeta = NOTE_TYPES.find((t) => t.value === n.type);
              const statusMeta = NOTE_STATUSES.find((s) => s.value === n.status);
              return (
                <li
                  key={n.id}
                  className={cn(
                    "group rounded-md bg-card px-4 py-3 hover:bg-accent/40 transition-colors",
                    n.review_highlight && "ring-1 ring-yellow-500/40 bg-yellow-500/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <>
                          <Textarea
                            autoFocus
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value.slice(0, 500))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                e.preventDefault();
                                saveEdit(n.id);
                              } else if (e.key === "Escape") {
                                e.preventDefault();
                                cancelEdit();
                              }
                            }}
                            rows={2}
                            className="resize-none text-sm"
                            aria-label="Edytuj treść notatki"
                          />
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[11px] text-muted-foreground">
                              {editingText.length}/500 · Ctrl+Enter zapisz, Esc anuluj
                            </span>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={editSaving}>
                                <X className="size-4 mr-1" />
                                Anuluj
                              </Button>
                              <Button size="sm" onClick={() => saveEdit(n.id)} disabled={editSaving}>
                                <Check className="size-4 mr-1" />
                                Zapisz
                              </Button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                            {n.review_highlight && (
                              <Star className="size-3.5 fill-yellow-300 text-yellow-300" aria-label="Highlight" />
                            )}
                            {typeMeta && (
                              <Badge
                                variant="outline"
                                className={cn("text-[10px] font-mono px-1.5 py-0 h-5", TYPE_STYLES[n.type])}
                              >
                                {typeMeta.short}
                              </Badge>
                            )}
                            {statusMeta && (
                              <Badge
                                variant="outline"
                                className={cn("text-[10px] font-mono px-1.5 py-0 h-5", STATUS_STYLES[n.status])}
                              >
                                {statusMeta.short}
                              </Badge>
                            )}
                            <span className="text-[11px] text-muted-foreground">
                              {format(parseISO(n.created_at), "HH:mm")}
                              {n.edited_at && " · edytowano"}
                            </span>
                          </div>
                          <div className="text-sm whitespace-pre-wrap break-words text-left">{n.text}</div>
                        </>
                      )}
                    </div>
                    {!isEditing && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button
                          onClick={() => patchNote(n.id, { review_highlight: !n.review_highlight })}
                          className={cn(
                            "p-1.5 rounded hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            n.review_highlight ? "text-yellow-300" : "text-muted-foreground hover:text-foreground"
                          )}
                          aria-label={n.review_highlight ? "Usuń highlight" : "Oznacz jako highlight"}
                          title="Highlight do review"
                        >
                          <Star className={cn("size-4", n.review_highlight && "fill-yellow-300")} />
                        </button>
                        <button
                          onClick={() => startEdit(n)}
                          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label="Edytuj notatkę"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => remove(n.id)}
                          className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label="Usuń notatkę"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Inline status switcher on hover */}
                  {!isEditing && (
                    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1">Status:</span>
                      {NOTE_STATUSES.map((s) => (
                        <button
                          key={s.value}
                          onClick={() => patchNote(n.id, { status: s.value })}
                          aria-label={`Ustaw status ${s.label}`}
                          aria-pressed={n.status === s.value}
                          className={cn(
                            "text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            n.status === s.value
                              ? STATUS_STYLES[s.value]
                              : "border-border text-muted-foreground hover:bg-accent"
                          )}
                        >
                          {s.short}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Composer */}
      <div className="px-8 py-3 border-t border-border bg-background">
        <div className="max-w-3xl">
          <div className="flex items-end gap-2">
            <Textarea
              ref={taRef}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 500))}
              onKeyDown={handleComposerKey}
              placeholder={`Co robiłeś ${format(parseISO(selectedDate), "EEEE d MMM")}? (Enter wysyła)`}
              rows={2}
              className="resize-none"
              aria-label="Treść nowej notatki"
            />
            <Button
              onClick={submit}
              disabled={!text.trim() || submitting}
              size="icon"
              className="size-10 shrink-0"
              aria-label="Wyślij notatkę"
            >
              <Send className="size-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Select value={composerType} onValueChange={(v) => setComposerType(v as NoteType)}>
              <SelectTrigger className="h-7 w-[140px] text-xs" aria-label="Typ notatki">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={composerStatus} onValueChange={(v) => setComposerStatus(v as NoteStatus)}>
              <SelectTrigger className="h-7 w-[150px] text-xs" aria-label="Status notatki">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTE_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={() => setComposerHighlight((v) => !v)}
              aria-pressed={composerHighlight}
              aria-label="Oznacz jako highlight do review"
              className={cn(
                "h-7 px-2.5 rounded-md text-xs inline-flex items-center gap-1.5 border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                composerHighlight
                  ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
                  : "border-border text-muted-foreground hover:bg-accent"
              )}
            >
              <Star className={cn("size-3.5", composerHighlight && "fill-yellow-300")} />
              Highlight
            </button>
            <span className="text-[10px] text-muted-foreground ml-auto hidden md:inline">
              Alt+D done · Alt+Q do testów · Alt+B blocker · Alt+I in progress · Alt+H ★
            </span>
            <span className="text-[10px] text-muted-foreground">{text.length}/500</span>
          </div>
        </div>
      </div>

      <SprintReviewDialog open={reviewOpen} onOpenChange={setReviewOpen} sprint={sprint} notes={notes} onSprintChange={onSprintChange} />
      <EditSprintDialog
        open={editSprintOpen}
        onOpenChange={setEditSprintOpen}
        sprint={sprint}
        onSaved={onSprintChange}
        onDeleted={onSprintChange}
      />
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
