# Sprint Companion

Build a web app called "StandupLog" — a daily standup notes tracker for a Scrum developer.



## Core concept

A developer logs short daily notes (1–5 sentences per day) about what they did / are doing. At the end of the sprint, they can generate a Sprint Review summary prompt ready to paste into ChatGPT/Claude.



## Tech stack

- React + TypeScript

- Tailwind CSS

- Supabase (auth + database)

- shadcn/ui components



## Database schema



### sprints

- id (uuid, PK)

- user_id (uuid, FK → auth.users)

- name (text) — e.g. "Sprint 12"

- start_date (date)

- end_date (date)

- created_at (timestamp)



### notes

- id (uuid, PK)

- sprint_id (uuid, FK → sprints)

- user_id (uuid, FK → auth.users)

- date (date) — the day this note belongs to

- text (text) — the note content (max 500 chars)

- created_at (timestamp)



Row Level Security: each user sees only their own data.



## Layout

- Left sidebar: list of sprints with note count badge, "New Sprint" button at the bottom

- Main area:

  - Sprint title + date range in the header

  - Row of stats: "Days with notes", "Total notes", "Sprint weeks"

  - Day tabs showing Mon–Fri of the currently selected week (highlight today, show a dot if day has notes)

  - Week navigation in the sidebar (below sprint list) when sprint has more than 1 week

  - Note list for the selected day, each note shows text + time (HH:MM)

  - Input at the bottom: textarea (Enter to submit, Shift+Enter for new line), send button



## Key interactions

- Pressing Enter in the textarea adds the note immediately

- Hovering a note shows a delete button (trash icon) on the right

- "New Sprint" opens a small modal with: sprint name input, start date, end date (defaults to next Monday + 14 days)

- "Sprint Review" button (top right of sprint view) opens a modal showing:

  1. Stats badges (days with notes, total notes)

  2. All notes grouped by week → by day (read-only preview)

  3. A highlighted code-like box with a ready-to-paste AI prompt (in Polish) that includes all notes and asks the AI to generate a Sprint Review summary in 5–6 sentences

  4. "Copy prompt" button that copies the prompt text to clipboard



## AI prompt template (inside the Sprint Review modal)

The generated prompt should be in Polish and follow this structure:

- Sprint name and date range

- All notes listed chronologically by day

- Instruction: "Na podstawie powyższych notatek przygotuj podsumowanie do Sprint Review w 5-6 zdaniach. Uwzględnij: co zostało zrealizowane, kluczowe aktywności, ewentualne przeszkody. Styl: profesjonalny, gotowy do odczytania na spotkaniu."



## Design

- Dark mode by default, light/dark toggle in the top bar

- Clean, minimal developer tool aesthetic (similar to Linear or Vercel dashboard)

- Neutral surfaces with teal as the primary accent color

- No colored borders on cards — use surface elevation (shadows, background) instead

- Left-aligned text throughout (not centered)

- Body font: Inter



## Auth

- Email/password login via Supabase Auth

- Simple login/register page, redirect to app after login

- No public access — full auth wall



## Empty states

- No sprints: centered message "Utwórz swój pierwszy sprint" with a primary button

- Noq notes for selected day: small message "Brak notatek – wpisz co robiłeś"

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/75ef6e99-d214-42f2-959f-4c253355a524).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
