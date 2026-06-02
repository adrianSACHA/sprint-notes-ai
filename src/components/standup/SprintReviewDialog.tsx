import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, CheckCircle2, TestTube2, Loader2, AlertOctagon, Star } from "lucide-react";
import {
  buildReviewPrompt,
  buildReviewSummary,
  daysWithNotes,
  groupNotesForReview,
  type Note,
  type Sprint,
} from "@/lib/standup";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function SprintReviewDialog({
  open,
  onOpenChange,
  sprint,
  notes,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sprint: Sprint;
  notes: Note[];
}) {
  const groups = useMemo(() => groupNotesForReview(notes), [notes]);
  const summary = useMemo(() => buildReviewSummary(sprint, notes), [sprint, notes]);
  const prompt = useMemo(() => buildReviewPrompt(sprint, notes), [sprint, notes]);

  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  async function copy(text: string, which: "summary" | "prompt") {
    await navigator.clipboard.writeText(text);
    if (which === "summary") {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } else {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    }
    toast.success("Skopiowano do schowka");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-left">Sprint Review — {sprint.name}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 flex-wrap">
          <Badge variant="secondary">Dni: {daysWithNotes(notes)}</Badge>
          <Badge variant="secondary">Notatek: {notes.length}</Badge>
          <Badge variant="secondary">Dostarczone: {groups.delivered.length}</Badge>
          <Badge variant="secondary">Do testów: {groups.testing.length}</Badge>
          <Badge variant="secondary">W trakcie: {groups.inProgress.length}</Badge>
          <Badge variant="secondary">Blockery: {groups.blockers.length}</Badge>
          {groups.highlights.length > 0 && (
            <Badge variant="secondary">★ Highlights: {groups.highlights.length}</Badge>
          )}
        </div>

        {/* Narrative summary */}
        <section className="mt-4 rounded-md bg-secondary/40 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Podsumowanie do odczytania</h3>
            <Button size="sm" variant="ghost" onClick={() => copy(summary, "summary")} aria-label="Kopiuj podsumowanie">
              {copiedSummary ? <Check className="size-4 mr-1" /> : <Copy className="size-4 mr-1" />}
              {copiedSummary ? "Skopiowano" : "Kopiuj"}
            </Button>
          </div>
          <p className="text-sm leading-relaxed text-foreground/90 text-left">{summary}</p>
        </section>

        {/* Grouped */}
        <div className="grid md:grid-cols-2 gap-3 mt-4">
          <Group
            title="Dostarczone"
            icon={<CheckCircle2 className="size-4 text-emerald-400" />}
            notes={groups.delivered}
            empty="Brak ukończonych notatek."
          />
          <Group
            title="Do testów"
            icon={<TestTube2 className="size-4 text-sky-400" />}
            notes={groups.testing}
            empty="Nic nie przekazano do testów."
          />
          <Group
            title="W trakcie"
            icon={<Loader2 className="size-4 text-amber-400" />}
            notes={groups.inProgress}
            empty="Brak aktywnych zadań."
          />
          <Group
            title="Blockery"
            icon={<AlertOctagon className="size-4 text-rose-400" />}
            notes={groups.blockers}
            empty="Brak blockerów. 🎉"
            tone="warn"
          />
        </div>

        {groups.highlights.length > 0 && (
          <Group
            className="mt-3"
            title="Highlights"
            icon={<Star className="size-4 text-yellow-400" />}
            notes={groups.highlights}
            empty=""
          />
        )}

        {/* AI Prompt */}
        <section className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Prompt do AI</h3>
            <Button size="sm" onClick={() => copy(prompt, "prompt")} aria-label="Kopiuj prompt">
              {copiedPrompt ? <Check className="size-4 mr-1" /> : <Copy className="size-4 mr-1" />}
              {copiedPrompt ? "Skopiowano" : "Kopiuj prompt"}
            </Button>
          </div>
          <pre className="rounded-md bg-secondary/60 p-4 text-xs font-mono whitespace-pre-wrap text-left max-h-64 overflow-y-auto">
{prompt}
          </pre>
        </section>
      </DialogContent>
    </Dialog>
  );
}

function Group({
  title,
  icon,
  notes,
  empty,
  tone,
  className,
}: {
  title: string;
  icon: React.ReactNode;
  notes: Note[];
  empty: string;
  tone?: "warn";
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-md bg-card p-3",
        tone === "warn" && notes.length > 0 && "ring-1 ring-rose-500/30",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h4 className="text-sm font-semibold">{title}</h4>
        <span className="text-xs text-muted-foreground ml-auto">{notes.length}</span>
      </div>
      {notes.length === 0 ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {notes.map((n) => (
            <li key={n.id} className="text-sm flex gap-2 items-start">
              {n.review_highlight && <Star className="size-3.5 text-yellow-400 mt-0.5 shrink-0" />}
              <span className="text-[10px] text-muted-foreground font-mono mt-0.5 shrink-0">
                {format(parseISO(n.date), "dd.MM")}
              </span>
              <span className="text-left">{n.text}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
