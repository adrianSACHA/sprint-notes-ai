import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Standard Vite + React SPA config for StandupLog.
// - @vitejs/plugin-react enables the automatic Fast Refresh transform.
// - @tailwindcss/vite processes Tailwind CSS v4 styles in styles.css.
// - "@" alias maps to ./src (matches tsconfig paths).
// - VITE_* env vars (e.g. VITE_SUPABASE_URL) are auto-loaded from ".env".
// - base set to the GitHub Pages sub-path so assets load under <user>.github.io/sprint-notes-ai/.
export default defineConfig({
  // Deployed under https://adrianSACHA.github.io/sprint-notes-ai/ (repo name).
  base: "/sprint-notes-ai/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
