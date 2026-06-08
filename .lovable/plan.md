## Co się dzieje

Strona zwraca 500 przy każdym żądaniu. Logi runtime pokazują:

```
ReferenceError: localStorage is not defined
  at src/integrations/supabase/client.ts:13
  at src/integrations/supabase/auth-attacher.ts:3
  at src/start.ts:4
```

Powód: `src/start.ts` importuje `attachSupabaseAuth`, który na poziomie modułu importuje przeglądarkowy klient Supabase. Klient w linii 13 odwołuje się do `localStorage`, którego nie ma w środowisku serwerowym (TanStack Start SSR/Worker). Cały moduł `start.ts` wybucha podczas SSR, stąd 500 i „This page didn't load".

`client.ts` jest plikiem auto-generowanym (nie wolno go edytować), więc fix musi być po stronie `auth-attacher.ts` — żeby nie ściągał przeglądarkowego klienta w czasie evaluacji modułu na serwerze.

## Plan zmian

1. `src/integrations/supabase/auth-attacher.ts`
   - Usunąć top-level `import { supabase } from './client'`.
   - Wewnątrz callbacka `.client(...)` użyć dynamicznego `await import('./client')` — middleware `.client(...)` i tak wykonuje się tylko w przeglądarce, więc `localStorage` będzie dostępny, a moduł nie crashuje przy SSR.

Po edycie sandbox sam się przeładuje. Zweryfikuję podglądem, że strona się ładuje i nie ma już błędu `localStorage is not defined`.

## Czego nie zmieniam

- `client.ts`, `client.server.ts`, `auth-middleware.ts`, `types.ts`, `.env` — auto-generowane.
- `start.ts` — rejestracja `attachSupabaseAuth` jako `functionMiddleware` jest poprawna.
- Żadnej logiki biznesowej (notatki, sprinty, review).
