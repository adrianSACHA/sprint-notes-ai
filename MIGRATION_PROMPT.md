# Prompt dla innego agenta: migracja StandupLog na GitHub + własny Supabase

Jesteś doświadczonym inżynierem full-stack. Pomóż mi przenieść aplikację **StandupLog** (daily standup notes tracker dla Scrum developera) z platformy Lovable na własne infrastruktury:
- **Kod źródłowy → GitHub** (repozytorium, git sync lub ręczny push)
- **Baza danych + auth → własny projekt Supabase** (supabase.com)

Poniżej masz pełny kontekst aplikacji. Nie zgaduj — jeśli czegoś brakuje, zapytaj mnie.

---

## 1. Czym jest aplikacja

**StandupLog** (roboczo też "Sprint Companion", skrót "SC") — aplikacja do logowania krótkich, dziennych notatek standupowych (1-5 zdań/dzień). Użytkownik tworzy sprinty (domyślnie 2 tygodniowe), dodaje notatki w dniach roboczych, a na koniec sprintu generuje prompt do ChatGPT/Claude z podsumowaniem sprintu. Może też wkleić odpowiedź AI jako `review_summary` sprintu.

Główne funkcje:
- Rejestracja/logowanie e-mail + hasło (Supabase Auth).
- Lista sprintów w zwijalnym sidebarze.
- Widok sprintu z zakładkami tygodniami (pon-pt).
- Szybkie dodawanie notatek (Enter zapisuje, Ctrl+Enter nową linię).
- Edycja inline notatek (Ctrl+Enter zapisz, Esc anuluj) i usuwanie.
- Metadane notatek: `type` (task/bug/review/meeting/blocker/note), `status` (in_progress/done/blocked/handoff_testing/info), `review_highlight` (gwiazdka), `edited_at`.
- Filtry notatek po typie, statusie i highlightach.
- Sprint Review: grupowanie notatek (dostarczone, do testów, w toku, blockery, highlighty) + kopiowanie promptu AI + pole na wklejenie podsumowania z AI.
- Edycja sprintu (nazwa, daty) i usuwanie sprintu.

---

## 2. Stack technologiczny

- **Framework:** TanStack Start v1 (full-stack React 19, SSR/SSG, server functions)
- **Router:** `@tanstack/react-router` (file-based routing)
- **Bundler:** Vite 7
- **Język:** TypeScript 5.8
- **Styling:** Tailwind CSS v4 (`src/styles.css` z `@theme inline` i zmiennymi oklch)
- **Komponenty UI:** shadcn/ui (komponenty w `src/components/ui/`)
- **Ikony:** lucide-react
- **Data:** date-fns
- **Backend/Auth/Baza:** Supabase (obecnie Lovable Cloud)
- **State management:** React `useState` + TanStack Query
- **Powiadomienia:** sonner (toast)
- **Fonty:** Inter + JetBrains Mono (ładowane przez `<link>` w `src/routes/__root.tsx`)

---

## 3. Struktura projektu (ważne pliki)

```
/
├── package.json              # zależności, skrypty: dev/build/lint/format
├── src/
│   ├── router.tsx            # konfiguracja TanStack Router + QueryClient
│   ├── start.ts              # createStart, middleware (attachSupabaseAuth, errorMiddleware)
│   ├── routes/
│   │   ├── __root.tsx        # root route, head/meta, fonty, favicon, <Outlet />
│   │   ├── index.tsx         # główna aplikacja (AuthProvider, Sidebar, SprintView)
│   │   └── auth.tsx          # strona logowania/rejestracji
│   ├── components/standup/
│   │   ├── Sidebar.tsx       # lista sprintów, nawigacja tygodniami, zwijanie
│   │   ├── SprintView.tsx    # widok sprintu, notatki, filtry, quick input
│   │   ├── NewSprintDialog.tsx
│   │   ├── EditSprintDialog.tsx
│   │   └── SprintReviewDialog.tsx
│   ├── lib/
│   │   ├── standup.ts        # typy, stałe, helpery dat, buildReviewPrompt, groupNotesForReview
│   │   ├── supabase-browser.ts # lazy load klienta Supabase (SSR-safe)
│   │   └── error-page.ts     # renderowanie strony błędu 500
│   ├── hooks/
│   │   └── useAuth.tsx       # kontekst auth, signIn/signUp/signOut
│   ├── integrations/supabase/
│   │   ├── client.ts         # AUTO-GENEROWANY — nie edytować
│   │   ├── client.server.ts  # AUTO-GENEROWANY — nie edytować
│   │   ├── auth-attacher.ts  # AUTO-GENEROWANY — nie edytować
│   │   └── ...               # inne auto-generowane pliki
│   ├── styles.css            # Tailwind v4, theme, dark mode
│   └── components/ui/        # shadcn/ui
├── public/
│   └── favicon.png           # wygenerowany favicon "SC"
├── supabase/export/
│   ├── README.md             # instrukcja migracji bazy
│   ├── schema.sql            # schemat tabel sprints + notes, RLS, grants, indeksy
│   └── data.sql              # dane: 7 sprintów + 257 notatek
└── MIGRATION_PROMPT.md       # ten plik
```

---

## 4. Architektura aplikacji

### Routing
- `/auth` — strona logowania/rejestracji.
- `/` — główna aplikacja, wymaga sesji (przekierowuje na `/auth` jeśli brak).

### Auth
- `useAuth.tsx` dostarcza kontekst z sesją Supabase.
- Klient przeglądarki ładowany dynamicznie przez `getSupabaseBrowserClient()` w `src/lib/supabase-browser.ts` — rozwiązanie problemu SSR (`localStorage is not defined`).
- `src/start.ts` rejestruje `attachSupabaseAuth` jako `functionMiddleware`, żeby `createServerFn` z `.middleware([requireSupabaseAuth])` otrzymywał token.

### Komunikacja z bazą
- Bezpośrednio z klienta (RLS chroni dane):
  - `sprints` — SELECT/INSERT/UPDATE/DELETE dla `authenticated` gdzie `auth.uid() = user_id`.
  - `notes` — SELECT/INSERT/UPDATE/DELETE dla `authenticated` gdzie `auth.uid() = user_id`, kaskadowe usuwanie przy usuwaniu sprintu.

### Typy danych (src/lib/standup.ts)

```ts
type Sprint = {
  id: string;
  user_id: string;
  name: string;
  start_date: string;   // ISO yyyy-MM-dd
  end_date: string;
  created_at: string;
  review_summary?: string | null;
};

type Note = {
  id: string;
  sprint_id: string;
  user_id: string;
  date: string;         // ISO yyyy-MM-dd
  text: string;
  created_at: string;
  type: "task" | "bug" | "review" | "meeting" | "blocker" | "note";
  status: "in_progress" | "done" | "blocked" | "handoff_testing" | "info";
  review_highlight: boolean;
  edited_at: string | null;
};
```

---

## 5. Schemat bazy danych (supabase/export/schema.sql)

```sql
CREATE TABLE public.sprints (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL,
  name           text NOT NULL,
  start_date     date NOT NULL,
  end_date       date NOT NULL,
  review_summary text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sprints TO authenticated;
GRANT ALL ON public.sprints TO service_role;
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own sprints"
  ON public.sprints FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.notes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id        uuid NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL,
  date             date NOT NULL,
  text             text NOT NULL,
  type             text NOT NULL DEFAULT 'note',
  status           text NOT NULL DEFAULT 'in_progress',
  review_highlight boolean NOT NULL DEFAULT false,
  edited_at        timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT ALL ON public.notes TO service_role;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own notes"
  ON public.notes FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX notes_sprint_id_idx ON public.notes (sprint_id);
CREATE INDEX notes_user_date_idx ON public.notes (user_id, date);
CREATE INDEX sprints_user_start_idx ON public.sprints (user_id, start_date DESC);
```

---

## 6. Co już zostało przygotowane

W katalogu `supabase/export/` znajdują się:
- `schema.sql` — gotowy schemat do uruchomienia w nowym projekcie Supabase.
- `data.sql` — zrzut danych: **7 sprintów i 257 notatek**.
- `README.md` — instrukcja ręcznego przeniesienia bazy.

To oznacza, że część "przygotowanie eksportu" jest już zrobiona. Twoim zadaniem jest:
1. Dokończyć przeniesienie kodu na GitHub.
2. Dokończyć przeniesienie bazy na własny Supabase.
3. Połączyć aplikację z nowym Supabase (env vars).
4. Upewnić się, że wszystko działa lokalnie i można zbudować.

---

## 7. Plan migracji — krok po kroku

### A. Kod na GitHub

1. **Utwórz repozytorium GitHub** (prywatne lub publiczne, według preferencji użytkownika).
2. **Zainicjuj git w projekcie** (jeśli jeszcze nie ma) lub zmień remote:
   ```bash
   git init
   git add .
   git commit -m "Initial StandupLog commit"
   git branch -M main
   git remote add origin https://github.com/<user>/<repo>.git
   git push -u origin main
   ```
3. **Sprawdź `.gitignore`** — powinien zawierać przynajmniej:
   ```
   node_modules/
   dist/
   .env
   .env.local
   *.log
   ```
4. **Nie commituj sekretów** — `SUPABASE_SERVICE_ROLE_KEY`, ewentualne klucze AI, hasła — trzymaj je w GitHub Secrets / hostingu.
5. **README projektu** — dodaj krótki opis, stack, skrypty (`bun install`, `bun run dev`, `bun run build`).

### B. Baza na własny Supabase

1. **Utwórz nowy projekt Supabase** (supabase.com): nazwa np. `standuplog`, region `Central EU (Frankfurt)` lub najbliższy użytkownikowi.
2. **Uruchom `schema.sql`** w SQL Editor nowego projektu.
3. **Skonfiguruj auth e-mail:**
   - Authentication → Providers → Email: włączone.
   - Authentication → Sign In / Providers → Email: wyłącz *Confirm email* (auto-confirm), żeby można było logować się od razu po rejestracji.
   - Authentication → URL Configuration → Site URL: adres docelowy aplikacji (np. `http://localhost:8080` na razie, potem produkcyjny).
4. **Wgraj dane:**
   - Uruchom aplikację lokalnie już podłączoną do nowego Supabase (zobacz sekcję C).
   - Zarejestruj konto w aplikacji (ten sam e-mail co wcześniej).
   - W SQL Editorze sprawdź nowe `id` użytkownika:
     ```sql
     select id, email from auth.users;
     ```
   - Uruchom `data.sql`.
   - Podmień `user_id` we wszystkich sprintach i notatkach na nowe ID:
     ```sql
     update public.sprints set user_id = 'TWOJE_NOWE_USER_ID';
     update public.notes   set user_id = 'TWOJE_NOWE_USER_ID';
     ```
   - Weryfikacja:
     ```sql
     select count(*) from public.sprints;  -- 7
     select count(*) from public.notes;    -- 257
     ```

### C. Podłączenie aplikacji do nowego Supabase

Aplikacja czyta konfigurację ze zmiennych środowiskowych. Utwórz plik `.env` w rootzie:

```env
VITE_SUPABASE_URL=https://<twój-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
SUPABASE_URL=https://<twój-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

Ważne:
- `VITE_*` — widoczne w przeglądarce (anon/publishable key).
- `SUPABASE_SERVICE_ROLE_KEY` — tylko po stronie serwera, **nigdy nie commituj do repo**.
- Nie podawaj tych kluczy w odpowiedzi — poproś użytkownika, żeby je wkleił w `.env` samodzielnie.

### D. Weryfikacja lokalna

1. Zainstaluj zależności:
   ```bash
   bun install
   ```
2. Uruchom dev server:
   ```bash
   bun run dev
   ```
3. Przejdź do `http://localhost:8080`:
   - zarejestruj konto,
   - zaloguj się,
   - sprawdź czy sprinty i notatki się wczytują,
   - dodaj testową notatkę,
   - otwórz Sprint Review i sprawdź prompt + podsumowanie AI.
4. Sprawdź build:
   ```bash
   bun run build
   ```

---

## 8. Pułapki i rzeczy, na które uważać

1. **SSR i `localStorage`:** Aplikacja rozwiązuje to przez `src/lib/supabase-browser.ts` (dynamiczny import klienta). Nie wracaj do top-level importu `@/integrations/supabase/client` w komponentach renderowanych po stronie serwera.
2. **Auto-generowane pliki Supabase:** Nie edytuj `src/integrations/supabase/client.ts`, `client.server.ts`, `auth-attacher.ts`, `auth-middleware.ts`, `types.ts`, `previewAuthStorage.ts`. Są one zarządzane przez Lovable/Supabase integration.
3. **Tailwind v4:** Nie używaj `@import` zdalnych URL-i w `src/styles.css` — fonty są ładowane przez `<link>` w `src/routes/__root.tsx`.
4. **RLS:** Bez `GRANT` i polityk aplikacja zwróci błędy uprawnień. Upewnij się, że `schema.sql` został uruchomiony w całości.
5. **`review_summary`:** Kolumna istnieje w `sprints` — można ją edytować z poziomu aplikacji (SprintReviewDialog).
6. **Service role key:** Używany tylko w server functions, jeśli kiedykolwiek potrzebny. Nie wystawiaj go w API ani nie umieszczaj w kodzie klienta.
7. **Git sync vs ręczny push:** Jeśli Lovable oferuje "Git sync" i użytkownik chce go użyć, można skonfigurować synchronizację zamiast ręcznego pusha. Wtedy repozytorium GitHub będzie lustrzanym odbiciem projektu Lovable.

---

## 9. Pytania do mnie (zapytaj zanim zaczniesz)

1. Czy masz już konto GitHub i chcesz utworzyć nowe repo, czy istnieje już repo docelowe?
2. Czy masz już projekt Supabase, czy mam przeprowadzić Cię przez jego utworzenie?
3. Czy chcesz migrować istniejące dane (7 sprintów, 257 notatek), czy zacząć od czystej bazy?
4. Czy chcesz użyć Git sync z Lovable, czy wolisz ręczne repozytorium?
5. Gdzie planujesz hostować aplikację produkcyjnie (Vercel, Netlify, Cloudflare Pages, inne)?

---

## 10. Oczekiwany wynik

Po zakończeniu:
- Kod źródłowy jest w repozytorium GitHub.
- Aplikacja działa lokalnie podłączona do nowego projektu Supabase.
- Użytkownik może się zalogować, zobaczyć swoje sprinty i notatki (jeśli migrowaliśmy dane).
- Build (`bun run build`) przechodzi bez błędów.
- Sekrety są bezpiecznie przechowywane w `.env` / GitHub Secrets, nie w repozytorium.

---

Powyższy prompt możesz skopiować i wkleić do dowolnego agenta AI (ChatGPT, Claude, Gemini, etc.). Zawiera wszystko, co potrzebne do zrozumienia aplikacji i przeprowadzenia migracji.
