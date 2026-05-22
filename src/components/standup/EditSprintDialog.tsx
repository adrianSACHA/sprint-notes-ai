import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Sprint } from "@/lib/standup";

export function EditSprintDialog({
  open,
  onOpenChange,
  sprint,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sprint: Sprint;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(sprint.name);
  const [start, setStart] = useState(sprint.start_date);
  const [end, setEnd] = useState(sprint.end_date);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(sprint.name);
      setStart(sprint.start_date);
      setEnd(sprint.end_date);
    }
  }, [open, sprint]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Podaj nazwę sprintu");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("sprints")
      .update({ name: name.trim(), start_date: start, end_date: end })
      .eq("id", sprint.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Sprint zaktualizowany");
    onSaved();
    onOpenChange(false);
  }

  async function remove() {
    if (!confirm(`Usunąć sprint "${sprint.name}" wraz ze wszystkimi notatkami?`)) return;
    setDeleting(true);
    await supabase.from("notes").delete().eq("sprint_id", sprint.id);
    const { error } = await supabase.from("sprints").delete().eq("id", sprint.id);
    setDeleting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Sprint usunięty");
    onDeleted();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edytuj sprint</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ename">Nazwa</Label>
            <Input id="ename" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="estart">Start</Label>
              <Input id="estart" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eend">Koniec</Label>
              <Input id="eend" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="sm:justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={remove}
              disabled={deleting}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              {deleting ? "Usuwanie..." : "Usuń sprint"}
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Anuluj
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Zapisywanie..." : "Zapisz"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
