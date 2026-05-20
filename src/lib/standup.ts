import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from "date-fns";

export type Sprint = {
  id: string;
  user_id: string;
  name: string;
  start_date: string;
  end_date: string;
  created_at: string;
};

export type Note = {
  id: string;
  sprint_id: string;
  user_id: string;
  date: string;
  text: string;
  created_at: string;
};

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

export function buildReviewPrompt(sprint: Sprint, notes: Note[]): string {
  const sorted = [...notes].sort((a, b) =>
    a.date === b.date ? a.created_at.localeCompare(b.created_at) : a.date.localeCompare(b.date)
  );
  const byDay = new Map<string, Note[]>();
  for (const n of sorted) {
    const arr = byDay.get(n.date) ?? [];
    arr.push(n);
    byDay.set(n.date, arr);
  }
  const lines: string[] = [];
  lines.push(`Sprint: ${sprint.name}`);
  lines.push(`Okres: ${sprint.start_date} – ${sprint.end_date}`);
  lines.push("");
  lines.push("Notatki dzienne:");
  lines.push("");
  for (const [date, arr] of byDay) {
    const dayLabel = format(parseISO(date), "EEEE, d MMM yyyy");
    lines.push(`# ${dayLabel}`);
    for (const n of arr) lines.push(`- ${n.text}`);
    lines.push("");
  }
  lines.push(
    "Na podstawie powyższych notatek przygotuj podsumowanie do Sprint Review w 5-6 zdaniach. Uwzględnij: co zostało zrealizowane, kluczowe aktywności, ewentualne przeszkody. Styl: profesjonalny, gotowy do odczytania na spotkaniu."
  );
  return lines.join("\n");
}

export function daysWithNotes(notes: Note[]): number {
  return new Set(notes.map((n) => n.date)).size;
}

export function sprintDayCount(sprint: Sprint): number {
  return differenceInCalendarDays(parseISO(sprint.end_date), parseISO(sprint.start_date)) + 1;
}
