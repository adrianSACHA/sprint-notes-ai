# Przeniesienie StandupLog na własny projekt Supabase

Ten katalog zawiera wszystko, co potrzebne do postawienia bazy na Twoim koncie Supabase.

| Plik | Co robi |
| --- | --- |
| `schema.sql` | Tabele `sprints` i `notes`, uprawnienia, RLS, indeksy |
| `data.sql` | Twoje dane: 7 sprintów + 257 notatek |

## 1. Utwórz projekt Supabase

1. Wejdź na https://supabase.com → **New project**.
2. Wybierz organizację, nazwę (np. `standuplog`), region **Central EU (Frankfurt)** i ustaw hasło do bazy (zapisz je w menedżerze haseł).
3. Poczekaj ~2 minuty na provisioning.

## 2. Załóż schemat

1. W projekcie otwórz **SQL Editor** → **New query**.
2. Wklej całą zawartość `schema.sql` → **Run**.

## 3. Skonfiguruj logowanie

1. **Authentication → Providers → Email**: włączone.
2. **Authentication → Sign In / Providers → Email**: wyłącz *Confirm email*, żeby móc się logować od razu po rejestracji (albo zostaw i potwierdzaj mailem).
3. **Authentication → URL Configuration → Site URL**: adres Twojej aplikacji.

## 4. Wgraj dane

1. Uruchom aplikację podłączoną do nowego projektu i **zarejestruj swoje konto** (ten sam e-mail co wcześniej).
2. W SQL Editorze sprawdź swoje nowe ID:
   ```sql
   select id, email from auth.users;
   ```
3. Wklej i uruchom `data.sql`.
4. Przepisz właściciela danych na swoje nowe konto (podmień UUID):
   ```sql
   update public.sprints set user_id = 'TWOJE_NOWE_USER_ID';
   update public.notes   set user_id = 'TWOJE_NOWE_USER_ID';
   ```
5. Weryfikacja:
   ```sql
   select count(*) from public.sprints;  -- 7
   select count(*) from public.notes;    -- 257
   ```

## 5. Podłącz aplikację

Aplikacja czyta konfigurację ze zmiennych środowiskowych:

```
VITE_SUPABASE_URL=https://<twoj-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon / publishable key>
SUPABASE_URL=https://<twoj-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<anon / publishable key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>   # tylko serwer, nigdy do repo
```

Klucze znajdziesz w **Project Settings → API Keys**. `anon` / `publishable` może być publiczny, `service_role` **nigdy** nie trafia do repozytorium — trzymaj go w sekretach hostingu.

Uruchomienie lokalne:

```bash
bun install
bun run dev
```
