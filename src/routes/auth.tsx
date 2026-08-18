import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth, AuthProvider } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: () => (
    <AuthProvider>
      <AuthPage />
    </AuthProvider>
  ),
});

function mapAuthError(raw: string, mode: "signin" | "signup") {
  const m = raw.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return {
      title: "Błędny e-mail lub hasło",
      hint: "Sprawdź pisownię e-maila i wielkość liter w haśle. Jeśli nie masz jeszcze konta, przejdź do zakładki Rejestracja.",
      offerSignup: true,
    };
  }
  if (m.includes("email not confirmed")) {
    return {
      title: "Konto nie zostało potwierdzone",
      hint: "Sprawdź skrzynkę e-mail i kliknij link potwierdzający, a potem zaloguj się ponownie.",
      offerSignup: false,
    };
  }
  if (m.includes("already registered") || m.includes("already exists") || m.includes("user already")) {
    return {
      title: "Konto z tym e-mailem już istnieje",
      hint: "Przejdź do zakładki Zaloguj i użyj swojego hasła.",
      offerSignup: false,
    };
  }
  if (m.includes("password") && (m.includes("least") || m.includes("short") || m.includes("weak"))) {
    return {
      title: "Hasło jest za słabe",
      hint: "Użyj co najmniej 6 znaków — najlepiej z cyfrą i znakiem specjalnym.",
      offerSignup: false,
    };
  }
  if (m.includes("invalid email") || m.includes("email address") || m.includes("validate email")) {
    return {
      title: "Nieprawidłowy adres e-mail",
      hint: "Podaj pełny adres w formacie nazwa@domena.pl.",
      offerSignup: false,
    };
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return {
      title: "Za dużo prób",
      hint: "Odczekaj chwilę i spróbuj ponownie.",
      offerSignup: false,
    };
  }
  if (m.includes("failed to fetch") || m.includes("network")) {
    return {
      title: "Brak połączenia z serwerem",
      hint: "Sprawdź internet i spróbuj ponownie za moment.",
      offerSignup: false,
    };
  }
  return {
    title: mode === "signin" ? "Nie udało się zalogować" : "Nie udało się utworzyć konta",
    hint: raw,
    offerSignup: false,
  };
}

function AuthPage() {
  const { session, signIn, signUp, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState<ReturnType<typeof mapAuthError> | null>(null);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/" });
  }, [session, loading, navigate]);

  function switchMode(next: "signin" | "signup") {
    setMode(next);
    setAuthError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setAuthError(null);
    const fn = mode === "signin" ? signIn : signUp;
    const { error } = await fn(email.trim(), password);
    setBusy(false);
    if (error) {
      const mapped = mapAuthError(error, mode);
      setAuthError(mapped);
      toast.error(mapped.title);
      return;
    }
    if (mode === "signup") toast.success("Konto utworzone");
    navigate({ to: "/" });
  }


  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">StandupLog</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Codzienne notatki standupowe dla devów
          </p>
        </div>

        <div className="rounded-lg bg-card p-6">
          <div className="flex gap-1 mb-5 p-1 rounded-md bg-secondary">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 px-3 py-1.5 text-sm rounded ${
                mode === "signin" ? "bg-background text-foreground" : "text-muted-foreground"
              }`}
            >
              Zaloguj
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 px-3 py-1.5 text-sm rounded ${
                mode === "signup" ? "bg-background text-foreground" : "text-muted-foreground"
              }`}
            >
              Rejestracja
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Hasło</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "..." : mode === "signin" ? "Zaloguj się" : "Załóż konto"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
