import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Standard Vite + React SPA config for StandupLog.
// - @vitejs/plugin-react enables the automatic Fast Refresh transform.
// - @tailwindcss/vite processes Tailwind CSS v4 styles in styles.css.
// - "@" alias maps to ./src (matches tsconfig paths).
// - VITE_* env vars (e.g. VITE_SUPABASE_URL) are auto-loaded from ".env".
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
