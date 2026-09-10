import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronLeft, ChevronRight, LogOut, Moon, Sun, PanelLeft, PanelRight } from "lucide-react";
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
  collapsed,
  onToggleCollapse,
}: {
  sprints: Sprint[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  noteCounts: Record<string, number>;
  onNewSprint: () => void;
  weeks: number;
  currentWeek: number;
  onWeekChange: (i: number) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <aside
      className={cn(
        "shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col h-screen transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "border-b border-sidebar-border",
          collapsed ? "px-2 py-3 flex flex-col items-center gap-2" : "px-4 py-4"
        )}
      >
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-base font-semibold tracking-tight">StandupLog</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggle}
                className="p-1.5 rounded-md hover:bg-sidebar-accent text-muted-foreground"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </button>
              <button
                onClick={onToggleCollapse}
                className="p-1.5 rounded-md hover:bg-sidebar-accent text-muted-foreground"
                aria-label="Zwiń panel"
              >
                <PanelLeft className="size-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-md hover:bg-sidebar-accent text-muted-foreground"
              aria-label="Rozwiń panel"
            >
              <PanelRight className="size-4" />
            </button>
            <button
              onClick={toggle}
              className="p-1.5 rounded-md hover:bg-sidebar-accent text-muted-foreground"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          </div>
        )}
      </div>

      {/* Week nav — above sprints list */}
      {selectedId && weeks > 1 && !collapsed && (
        <div className="px-3 pt-3 pb-1">
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

      {/* Sprints list */}
      {!collapsed && (
        <div className="px-3 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Sprinty
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {sprints.length === 0 && (
          <div className={cn("text-sm text-muted-foreground", collapsed ? "px-1 py-1 text-center" : "px-2 py-1")}>
            Brak
          </div>
        )}
        {sprints.map((s) => {
          const active = selectedId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              title={collapsed ? s.name : undefined}
              className={cn(
                "w-full rounded-md transition-colors",
                collapsed
                  ? "flex items-center justify-center py-2"
                  : "text-left px-3 py-2 text-sm flex items-center justify-between gap-2",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent/60 text-sidebar-foreground"
              )}
            >
              {!collapsed ? (
                <>
                  <span className="truncate">{s.name}</span>
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                    {noteCounts[s.id] ?? 0}
                  </Badge>
                </>
                            ) : (
                <span
                  title={s.name}
                  className={cn(
                    "flex items-center justify-center rounded-md text-[11px] font-bold h-8 min-w-8 px-1 tabular-nums",
                    active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "bg-sidebar-accent/40 text-sidebar-foreground"
                  )}
                >
                  {s.name.trim() || "·"}
                </span>
              )}
            </button>
          );
        })}
      </div>




      {/* Footer buttons */}
      <div
        className={cn(
          "p-3 border-t border-sidebar-border",
          collapsed ? "flex flex-col items-center gap-2" : "space-y-2"
        )}
      >
        {collapsed ? (
          <>
            <Button onClick={onNewSprint} variant="ghost" size="icon" className="size-8" aria-label="Nowy sprint">
              <Plus className="size-4" />
            </Button>
            <Button onClick={signOut} variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Wyloguj">
              <LogOut className="size-4" />
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onNewSprint} className="w-full" size="sm">
              <Plus className="size-4 mr-1" />
              Nowy sprint
            </Button>
            <Button onClick={signOut} variant="ghost" size="sm" className="w-full text-muted-foreground">
              <LogOut className="size-4 mr-1" />
              Wyloguj
            </Button>
          </>
        )}
      </div>
    </aside>
  );
}
