import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  LogOut,
  Moon,
  Sun,
  PanelLeft,
  PanelRight,
  Filter,
  Star,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_FILTERS,
  NOTE_STATUSES,
  NOTE_TYPES,
  activeFilterCount,
  filtersActive,
  type NoteFilters,
  type NoteStatus,
  type NoteType,
  type Sprint,
} from "@/lib/standup";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";

/** How many recent sprints stay visible before the "older" group collapses. */
const VISIBLE_SPRINTS = 4;

export function Sidebar({
  sprints,
  selectedId,
  onSelect,
  noteCounts,
  onNewSprint,
  collapsed,
  onToggleCollapse,
  filters,
  onFiltersChange,
}: {
  sprints: Sprint[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  noteCounts: Record<string, number>;
  onNewSprint: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  filters: NoteFilters;
  onFiltersChange: (filters: NoteFilters) => void;
}) {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const [showOlder, setShowOlder] = useState(false);

  const recent = sprints.slice(0, VISIBLE_SPRINTS);
  const older = sprints.slice(VISIBLE_SPRINTS);
  const fActive = filtersActive(filters);
  const fCount = activeFilterCount(filters);

  const renderSprint = (s: Sprint) => {
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
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "bg-sidebar-accent/40 text-sidebar-foreground"
            )}
          >
            {s.name.trim() || "·"}
          </span>
        )}
      </button>
    );
  };

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
        {recent.map((s) => renderSprint(s))}

        {older.length > 0 && (
          <button
            onClick={() => setShowOlder((v) => !v)}
            aria-expanded={showOlder}
            className={cn(
              "w-full flex items-center gap-1.5 rounded-md text-xs text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors",
              collapsed ? "justify-center py-2" : "px-3 py-1.5 mt-1"
            )}
            title="Starsze sprinty"
          >
            {showOlder ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
            {!collapsed && <>Starsze sprinty ({older.length})</>}
          </button>
        )}

        {showOlder && older.map((s) => renderSprint(s))}
      </div>

      {/* Filters */}
      {!collapsed && (
        <div className="border-t border-sidebar-border px-3 py-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <Filter className="size-3.5" />
              Filtry
              {fCount > 0 && (
                <span className="rounded-full bg-primary text-primary-foreground text-[10px] leading-none px-1.5 py-0.5">
                  {fCount}
                </span>
              )}
            </span>
            {fActive && (
              <button
                onClick={() => onFiltersChange(DEFAULT_FILTERS)}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Wyczyść
              </button>
            )}
          </div>

          <Select
            value={filters.type}
            onValueChange={(v) => onFiltersChange({ ...filters, type: v as NoteType | "all" })}
          >
            <SelectTrigger className="h-8 w-full text-xs" aria-label="Filtruj po typie">
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

          <Select
            value={filters.status}
            onValueChange={(v) => onFiltersChange({ ...filters, status: v as NoteStatus | "all" })}
          >
            <SelectTrigger className="h-8 w-full text-xs" aria-label="Filtruj po statusie">
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
            onClick={() =>
              onFiltersChange({ ...filters, highlight: filters.highlight === "yes" ? "all" : "yes" })
            }
            aria-pressed={filters.highlight === "yes"}
            className={cn(
              "h-8 w-full px-3 rounded-md text-xs inline-flex items-center gap-2 border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              filters.highlight === "yes"
                ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
                : "border-border text-muted-foreground hover:bg-accent"
            )}
          >
            <Star className={cn("size-3.5", filters.highlight === "yes" && "fill-yellow-300")} />
            Tylko highlights
          </button>
        </div>
      )}

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
