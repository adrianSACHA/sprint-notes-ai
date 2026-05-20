import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check } from "lucide-react";
import { buildReviewPrompt, daysWithNotes, sprintWeeks, type Note, type Sprint } from "@/lib/standup";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

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
  const prompt = useMemo(() => buildReviewPrompt(sprint, notes), [sprint, notes]);
  const weeks = useMemo(() => sprintWeeks(sprint), [sprint]);
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    toast.success("Skopiowano do schowka");
    setTimeout(() => setCopied(false), 2000);
  }

  const notesByDay = useMemo(() => {
    const m = new Map<string, Note[]>();
    for (const n of notes) {
      const arr = m.get(n.date) ?? [];
      arr.push(n);
      m.set(n.date, arr);
    }
    return m;
  }, [notes]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sprint Review — {sprint.name}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 flex-wrap">
          <Badge variant="secondary">Dni z notatkami: {daysWithNotes(notes)}</Badge>
          <Badge variant="secondary">Łącznie notatek: {notes.length}</Badge>
          <Badge variant="secondary">Tygodnie: {weeks.length}</Badge>
        </div>

        <div className="space-y-4 mt-2">
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Notatki</h3>
            <div className="space-y-3">
              {weeks.map((week, i) => (
                <div key={i} className="space-y-2">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Tydzień {i + 1}</div>
                  {week.map((d) => {
                    const key = format(d, "yyyy-MM-dd");
                    const dayNotes = notesByDay.get(key) ?? [];
                    if (dayNotes.length === 0) return null;
                    return (
                      <div key={key} className="rounded-md bg-muted/40 p-3">
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          {format(parseISO(key), "EEEE, d MMM")}
                        </div>
                        <ul className="space-y-1 text-sm">
                          {dayNotes.map((n) => (
                            <li key={n.id}>• {n.text}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              ))}
              {notes.length === 0 && (
                <div className="text-sm text-muted-foreground">Brak notatek w tym sprincie.</div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Prompt do AI</h3>
              <Button size="sm" onClick={copy} variant="default">
                {copied ? <Check className="size-4 mr-1" /> : <Copy className="size-4 mr-1" />}
                {copied ? "Skopiowano" : "Kopiuj prompt"}
              </Button>
            </div>
            <pre className="rounded-md bg-secondary/60 border border-border p-4 text-xs font-mono whitespace-pre-wrap text-left max-h-72 overflow-y-auto">
{prompt}
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
