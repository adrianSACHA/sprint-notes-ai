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
import {
  Send,
  Trash2,
  FileText,
  Pencil,
  Check,
  X,
  Star,
  Filter,
  CalendarDays,
  NotebookPen,
  CalendarRange,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isSameDay, parseISO } from "date-fns";
import {
  isoDate,
  sprintDays,
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
  onNotesChange,
  onSprintChange,
}: {
  sprint: Sprint;
  notes: Note[];
  onNotesChange: () => void;
  onSprintChange: () => void;
}) {
  const { user } = useAuth();
  const days = useMemo(() => sprintDays(sprint), [sprint]);
  const weekCount = useMemo(() => sprintWeeks(sprint).length, [sprint]);
  const today = new Date();

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const todayIso = isoDate(today);
    if (days.some((d) => isoDate(d.date) === todayIso)) return todayIso;
    return days[0] ? isoDate(days[0].date) : todayIso;
  });

  useEffect(() => {
    const todayIso = isoDate(today);
    if (days.some((d) => isoDate(d.date) === todayIso)) setSelectedDate(todayIso);
    else if (days[0]) setSelectedDate(isoDate(days[0].date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sprint.id]);

  const dayHasNotes = useMemo(() => new Set(notes.map((n) => n.date)), [notes]);

  // Filters
  const [filterType, setFilterType] = useState<NoteType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<NoteStatus | "all">("all");
  const [filterHighlight, setFilterHighlight] = useState<"all" | "yes">("all");
  const [panelOpen, setPanelOpen] = useState(true);

  const dayNotes = useMemo(() => {
    return notes
      .filter((n) => n.date === selectedDate)
      .filter((n) => (filterType === "all" ? true : n.type === filterType))
      .filter((n) => (filterStatus === "all" ? true : n.status === filterStatus))
      .filter((n) => (filterHighlight === "yes" ? n.review_highlight : true))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [notes, selectedDate, filterType, filterStatus, filterHighlight]);

  const filtersActive = filterType !== "all" || filterStatus !== "all" || filterHighlight !== "all";
  const activeFilterCount =
    (filterType !== "all" ? 1 : 0) +
    (filterStatus !== "all" ? 1 : 0) +
    (filterHighlight !== "all" ? 1 : 0);

  const dayRawCount = useMemo(
    () => notes.filter((n) => n.date === selectedDate).length,
    [notes, selectedDate]
  );

  function clearFilters() {
    setFilterType("all");
    setFilterStatus("all");
    setFilterHighlight("all");
  }

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
    <div className="flex-1 flex h-screen min-w-0">
      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="px-8 py-5 border-b border-border flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-semibold tracking-tight truncate">{sprint.name}</h1>
              <button
                onClick={() => setEditSprintOpen(true)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Edytuj sprint"
                title="Edytuj sprint"
              >
                <Pencil className="size-4" />
              </button>
              <div className="flex items-center gap-3 text-xs text-muted-foreground ml-1">
                <span className="inline-flex items-center gap-1.5" title="Dni z notatkami">
                  <CalendarDays className="size-3.5" />
                  <span className="tabular-nums font-medium text-foreground">{daysWithNotes(notes)}</span>
                  <span>dni</span>
                </span>
                <span className="text-border">·</span>
                <span className="inline-flex items-center gap-1.5" title="Notatek łącznie">
                  <NotebookPen className="size-3.5" />
                  <span className="tabular-nums font-medium text-foreground">{notes.length}</span>
                  <span>notatek</span>
                </span>
                <span className="text-border">·</span>
                <span className="inline-flex items-center gap-1.5" title="Tygodnie sprintu">
                  <CalendarRange className="size-3.5" />
                  <span className="tabular-nums font-medium text-foreground">{weekCount}</span>
                  <span>tyg.</span>
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {format(parseISO(sprint.start_date), "d MMM")} – {format(parseISO(sprint.end_date), "d MMM yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setPanelOpen((v) => !v)}
              aria-pressed={panelOpen}
              aria-label="Pokaż lub ukryj panel filtrów"
              title="Pokaż lub ukryj panel filtrów"
              className={cn(
                "h-9 px-3 rounded-md text-sm inline-flex items-center gap-1.5 border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                panelOpen
                  ? "bg-accent border-border text-foreground"
                  : "border-border text-muted-foreground hover:bg-accent"
              )}
            >
              <SlidersHorizontal className="size-4" />
              Filtry
              {activeFilterCount > 0 && (
                <span className="ml-0.5 rounded-full bg-primary text-primary-foreground text-[10px] leading-none px-1.5 py-0.5">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <Button variant="secondary" onClick={() => setReviewOpen(true)} aria-label="Otwórz Sprint Review">
              <FileText className="size-4 mr-1.5" />
              Sprint Review
            </Button>
          </div>
        </header>

        {/* Day tabs — all workdays of the sprint */}
        <div className="px-8 py-3 flex gap-1.5 border-b border-border overflow-x-auto">
          {days.map((d, i) => {
            const iso = isoDate(d.date);
            const active = iso === selectedDate;
            const isToday = isSameDay(d.date, today);
            const has = dayHasNotes.has(iso);
            const startsNewWeek = i > 0 && days[i - 1].week !== d.week;
            return (
              <div key={iso} className={cn("flex items-center shrink-0", startsNewWeek && "ml-2")}>
                {startsNewWeek && <span className="h-8 w-px bg-border mr-2.5" aria-hidden />}
                <button
                  onClick={() => setSelectedDate(iso)}
                  aria-label={`Wybierz ${format(d.date, "EEEE d MMM")}`}
                  aria-pressed={active}
                  className={cn(
                    "px-3 py-2 rounded-md text-left min-w-[88px] transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "bg-secondary text-secondary-foreground"
                      : "hover:bg-secondary/50 text-muted-foreground"
                  )}
                >
                  <div className={cn("text-[10px] uppercase tracking-wide", isToday && "text-primary font-semibold")}>
                    {format(d.date, "EEE")}
                  </div>
                  <div className={cn("text-sm font-medium", isToday && !active && "text-foreground")}>
                    {format(d.date, "d MMM")}
                  </div>
                  {has && <span className="absolute top-1.5 right-2 size-1.5 rounded-full bg-primary" />}
                </button>
              </div>
            );
          })}
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
      </div>

      {/* Right panel — filters + stats (collapsible) */}
      {panelOpen && (
        <aside className="w-72 shrink-0 border-l border-border bg-sidebar/40 flex flex-col h-screen overflow-y-auto">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="inline-flex items-center gap-2 text-sm font-medium">
              <Filter className="size-4 text-muted-foreground" />
              Filtry
            </div>
            <button
              onClick={() => setPanelOpen(false)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Zamknij panel filtrów"
              title="Zamknij panel"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Stats */}
          <div className="px-5 py-4 border-b border-border space-y-2.5">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Podsumowanie</div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-md bg-card px-2.5 py-2">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Notatki</div>
                <div className="text-lg font-semibold tabular-nums">{notes.length}</div>
              </div>
              <div className="rounded-md bg-card px-2.5 py-2">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Dni</div>
                <div className="text-lg font-semibold tabular-nums">{daysWithNotes(notes)}</div>
              </div>
              <div className="rounded-md bg-card px-2.5 py-2">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Tyg.</div>
                <div className="text-lg font-semibold tabular-nums">{weekCount}</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Wybrany dzień:{" "}
              <span className="font-medium text-foreground">
                {filtersActive ? `${dayNotes.length} / ${dayRawCount}` : dayRawCount}
              </span>{" "}
              notatek
            </div>
          </div>

          {/* Filter controls */}
          <div className="px-5 py-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Typ</label>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as NoteType | "all")}>
                <SelectTrigger className="h-9 w-full text-sm" aria-label="Filtruj po typie">
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
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as NoteStatus | "all")}>
                <SelectTrigger className="h-9 w-full text-sm" aria-label="Filtruj po statusie">
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
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Wyróżnienia</label>
              <button
                type="button"
                onClick={() => setFilterHighlight((v) => (v === "yes" ? "all" : "yes"))}
                aria-pressed={filterHighlight === "yes"}
                aria-label="Pokaż tylko highlights"
                className={cn(
                  "h-9 w-full px-3 rounded-md text-sm inline-flex items-center gap-2 border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  filterHighlight === "yes"
                    ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
                    : "border-border text-muted-foreground hover:bg-accent"
                )}
              >
                <Star className={cn("size-4", filterHighlight === "yes" && "fill-yellow-300")} />
                Tylko highlights
              </button>
            </div>

            {filtersActive && (
              <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={clearFilters}>
                Wyczyść filtry
              </Button>
            )}
          </div>
        </aside>
      )}

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
