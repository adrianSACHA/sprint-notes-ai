import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactElement } from "react";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";
import { StandupHome } from "@/pages/StandupHome";
import { AuthPage } from "@/pages/AuthPage";

function Loading() {
  return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Ładowanie...</div>;
}

function RequireAuth({ children }: { children: ReactElement }) {
  const { session, loading } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Navigate to="/auth" replace />;
  return children;
}

function RedirectIfAuthed({ children }: { children: ReactElement }) {
  const { session, loading } = useAuth();
  if (loading) return <Loading />;
  if (session) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/auth" element={<RedirectIfAuthed><AuthPage /></RedirectIfAuthed>} />
        <Route path="/" element={<RequireAuth><StandupHome /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </AuthProvider>
  );
}

