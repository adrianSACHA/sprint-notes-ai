import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from "date-fns";

export type NoteType = "task" | "bug" | "review" | "meeting" | "blocker" | "note";
export type NoteStatus = "in_progress" | "done" | "blocked" | "handoff_testing" | "info";

export type Sprint = {
  id: string;
  user_id: string;
  name: string;
  start_date: string;
  end_date: string;
  created_at: string;
  review_summary?: string | null;
};

export type Note = {
  id: string;
  sprint_id: string;
  user_id: string;
  date: string;
  text: string;
  created_at: string;
  type: NoteType;
  status: NoteStatus;
  review_highlight: boolean;
  edited_at: string | null;
};

export const NOTE_TYPES: { value: NoteType; label: string; short: string }[] = [
  { value: "task", label: "Zadanie", short: "TASK" },
  { value: "bug", label: "Bug", short: "BUG" },
  { value: "review", label: "Code review", short: "REV" },
  { value: "meeting", label: "Spotkanie", short: "MTG" },
  { value: "blocker", label: "Blocker", short: "BLK" },
  { value: "note", label: "Notatka", short: "NOTE" },
];

export const NOTE_STATUSES: { value: NoteStatus; label: string; short: string }[] = [
  { value: "in_progress", label: "W trakcie", short: "WIP" },
  { value: "done", label: "Zrobione", short: "DONE" },
  { value: "handoff_testing", label: "Do testów", short: "QA" },
  { value: "blocked", label: "Zablokowane", short: "BLK" },
  { value: "info", label: "Info", short: "INFO" },
];

export const isoDate = (d: Date) => format(d, "yyyy-MM-dd");

export function sprintWeeks(sprint: Sprint): Date[][] {
  const start = parseISO(sprint.start_date);
  const end = parseISO(sprint.end_date);
  const monday = startOfWeek(start, { weekStartsOn: 1 });
  const weeks: Date[][] = [];
  let cursor = monday;
  while (cursor <= end) {
    const week: Date[] = [];
    for (let i = 0; i < 5; i++) week.push(addDays(cursor, i));
    weeks.push(week);
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

/**
 * All workdays (Mon–Fri) covered by the sprint, in chronological order,
 * each tagged with the week index it belongs to. Range is clamped to the
 * sprint's start/end dates.
 */
export function sprintDays(sprint: Sprint): { date: Date; week: number }[] {
  const start = parseISO(sprint.start_date);
  const end = parseISO(sprint.end_date);
  const firstMonday = startOfWeek(start, { weekStartsOn: 1 });
  const out: { date: Date; week: number }[] = [];
  let cursor = start;
  while (cursor <= end) {
    const dow = cursor.getDay(); // 0 = Sun, 6 = Sat
    if (dow >= 1 && dow <= 5) {
      const week = Math.floor(differenceInCalendarDays(cursor, firstMonday) / 7);
      out.push({ date: cursor, week });
    }
    cursor = addDays(cursor, 1);
  }
  return out;
}

export function weeksCount(sprint: Sprint): number {
  return sprintWeeks(sprint).length;
}

export function nextMonday(from = new Date()): Date {
  const dow = from.getDay();
  const diff = (8 - dow) % 7 || 7;
  return addDays(from, diff);
}

export function defaultSprintRange() {
  const start = nextMonday();
  const end = addDays(start, 13);
  return { start_date: isoDate(start), end_date: isoDate(end) };
}

export type ReviewGroups = {
  delivered: Note[];
  testing: Note[];
  inProgress: Note[];
  blockers: Note[];
  highlights: Note[];
};

export function groupNotesForReview(notes: Note[]): ReviewGroups {
  const delivered: Note[] = [];
  const testing: Note[] = [];
  const inProgress: Note[] = [];
  const blockers: Note[] = [];
  const highlights: Note[] = [];
  for (const n of notes) {
    if (n.review_highlight) highlights.push(n);
    if (n.status === "done") delivered.push(n);
    else if (n.status === "handoff_testing") testing.push(n);
    else if (n.status === "blocked" || n.type === "blocker") blockers.push(n);
    else if (n.status === "in_progress") inProgress.push(n);
  }
  const sortFn = (a: Note, b: Note) =>
    a.date === b.date ? a.created_at.localeCompare(b.created_at) : a.date.localeCompare(b.date);
  return {
    delivered: delivered.sort(sortFn),
    testing: testing.sort(sortFn),
    inProgress: inProgress.sort(sortFn),
    blockers: blockers.sort(sortFn),
    highlights: highlights.sort(sortFn),
  };
}

export function buildReviewSummary(sprint: Sprint, notes: Note[]): string {
  const g = groupNotesForReview(notes);
  const days = daysWithNotes(notes);
  const parts: string[] = [];
  parts.push(
    `W trakcie sprintu „${sprint.name}" (${sprint.start_date} – ${sprint.end_date}) zalogowano ${notes.length} notatek z ${days} dni pracy.`
  );
  if (g.delivered.length) {
    parts.push(
      `Dostarczono ${g.delivered.length} rzecz${g.delivered.length === 1 ? "" : "y"}: ${shortList(g.delivered)}.`
    );
  }
  if (g.testing.length) {
    parts.push(`Przekazano do testów: ${shortList(g.testing)}.`);
  }
  if (g.inProgress.length) {
    parts.push(`Wciąż w toku: ${shortList(g.inProgress)}.`);
  }
  if (g.blockers.length) {
    parts.push(`Napotkane blockery: ${shortList(g.blockers)}.`);
  } else {
    parts.push("Brak istotnych blockerów.");
  }
  if (g.highlights.length) {
    parts.push(`Warto podkreślić: ${shortList(g.highlights)}.`);
  }
  return parts.join(" ");
}

function shortList(notes: Note[], max = 4): string {
  const items = notes.slice(0, max).map((n) => trimText(n.text));
  const extra = notes.length - max;
  return items.join("; ") + (extra > 0 ? `; +${extra} więcej` : "");
}

function trimText(s: string): string {
  const t = s.trim().replace(/\s+/g, " ");
  return t.length > 80 ? t.slice(0, 77) + "…" : t;
}

export function buildReviewPrompt(sprint: Sprint, notes: Note[]): string {
  const sorted = [...notes].sort((a, b) =>
    a.date === b.date ? a.created_at.localeCompare(b.created_at) : a.date.localeCompare(b.date)
  );
  const g = groupNotesForReview(notes);
  const lines: string[] = [];
  lines.push(`Sprint: ${sprint.name}`);
  lines.push(`Okres: ${sprint.start_date} – ${sprint.end_date}`);
  lines.push("");
  lines.push(`Dostarczone (${g.delivered.length}):`);
  for (const n of g.delivered) lines.push(`- ${n.text}`);
  lines.push("");
  lines.push(`Do testów (${g.testing.length}):`);
  for (const n of g.testing) lines.push(`- ${n.text}`);
  lines.push("");
  lines.push(`W trakcie (${g.inProgress.length}):`);
  for (const n of g.inProgress) lines.push(`- ${n.text}`);
  lines.push("");
  lines.push(`Blockery (${g.blockers.length}):`);
  for (const n of g.blockers) lines.push(`- ${n.text}`);
  lines.push("");
  if (g.highlights.length) {
    lines.push(`Highlighty (${g.highlights.length}):`);
    for (const n of g.highlights) lines.push(`- ${n.text}`);
    lines.push("");
  }
  lines.push("Pełny log dzienny:");
  const byDay = new Map<string, Note[]>();
  for (const n of sorted) {
    const arr = byDay.get(n.date) ?? [];
    arr.push(n);
    byDay.set(n.date, arr);
  }
  for (const [date, arr] of byDay) {
    lines.push(`# ${format(parseISO(date), "EEEE, d MMM yyyy")}`);
    for (const n of arr) lines.push(`- [${n.type}/${n.status}]${n.review_highlight ? " ★" : ""} ${n.text}`);
    lines.push("");
  }
  lines.push(
    "Na podstawie powyższych notatek przygotuj podsumowanie do Sprint Review w 5-6 zdaniach. Uwzględnij: co zostało zrealizowane, co jest w trakcie, co przeszło do testów, ewentualne blockery i highlighty. Styl: profesjonalny, gotowy do odczytania na spotkaniu."
  );
  return lines.join("\n");
}

export function daysWithNotes(notes: Note[]): number {
  return new Set(notes.map((n) => n.date)).size;
}

export function sprintDayCount(sprint: Sprint): number {
  return differenceInCalendarDays(parseISO(sprint.end_date), parseISO(sprint.start_date)) + 1;
}
