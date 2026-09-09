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

## Local development & environment

The app is a standard Vite + React SPA (React Router with `HashRouter`) that talks to Supabase entirely in the browser (guarded by RLS).

Create a local `.env` (git-ignored) with:

```env
VITE_SUPABASE_URL=https://<your-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon / publishable key>
```

The SPA only needs those two `VITE_*` values (the anon key is intentionally public), read at build time via `import.meta.env`.

```sh
npm install
npm run dev      # local dev server
npm run build    # production build -> dist/
npx tsc --noEmit # type-check
```

## Build & deployment (GitHub Pages)

`.github/workflows/deploy-pages.yml` builds and publishes `dist/` to GitHub Pages on every push to `main`.

- Repo → **Settings → Pages**: Source = **GitHub Actions**.
- Repo → **Settings → Secrets and variables → Actions**:
  - **Variable** `VITE_SUPABASE_URL` = `https://<your-ref>.supabase.co`
  - **Secret** `VITE_SUPABASE_PUBLISHABLE_KEY` = `<anon key>`
- Vite `base` is `/sprint-notes-ai/` so assets resolve under `<user>.github.io/sprint-notes-ai/` (used together with `HashRouter`, no SPA rewrites needed).

Live URL: https://adrianSACHA.github.io/sprint-notes-ai/

## Supabase setup (one-time)

1. Create the schema (tables + RLS) from `supabase/export/schema.sql`.
2. Enable the Email provider: **Authentication → Providers → Email**.
3. Set **Authentication → URL Configuration → Site URL** to the app URL.
4. Load data (optional) from `supabase/export/data.sql`, adjusting `user_id` to your account.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
