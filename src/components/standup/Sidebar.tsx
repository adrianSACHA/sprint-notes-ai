import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronLeft, ChevronRight, LogOut, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Sprint } from "@/lib/standup";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";

export function Sidebar({
  sprints,
  selectedId,
  onSelect,
  noteCounts,
  onNewSprint,
  weeks,
  currentWeek,
  onWeekChange,
}: {
  sprints: Sprint[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  noteCounts: Record<string, number>;
  onNewSprint: () => void;
  weeks: number;
  currentWeek: number;
  onWeekChange: (i: number) => void;
}) {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <aside className="w-64 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col h-screen">
      <div className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-semibold tracking-tight">StandupLog</div>
            <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
          </div>
          <button
            onClick={toggle}
            className="p-1.5 rounded-md hover:bg-sidebar-accent text-muted-foreground"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </div>
      </div>

      <div className="px-3 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Sprinty
      </div>
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {sprints.length === 0 && (
          <div className="px-2 py-1 text-sm text-muted-foreground">Brak sprintów</div>
        )}
        {sprints.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between gap-2 transition-colors",
              selectedId === s.id
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "hover:bg-sidebar-accent/60 text-sidebar-foreground"
            )}
          >
            <span className="truncate">{s.name}</span>
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
              {noteCounts[s.id] ?? 0}
            </Badge>
          </button>
        ))}
      </div>

      {selectedId && weeks > 1 && (
        <div className="px-3 py-3 border-t border-sidebar-border">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Tydzień</div>
          <div className="flex items-center justify-between gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onWeekChange(Math.max(0, currentWeek - 1))}
              disabled={currentWeek === 0}
              className="size-8"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm">
              {currentWeek + 1} / {weeks}
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onWeekChange(Math.min(weeks - 1, currentWeek + 1))}
              disabled={currentWeek === weeks - 1}
              className="size-8"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="p-3 border-t border-sidebar-border space-y-2">
        <Button onClick={onNewSprint} className="w-full" size="sm">
          <Plus className="size-4 mr-1" />
          Nowy sprint
        </Button>
        <Button onClick={signOut} variant="ghost" size="sm" className="w-full text-muted-foreground">
          <LogOut className="size-4 mr-1" />
          Wyloguj
        </Button>
      </div>
    </aside>
  );
}
