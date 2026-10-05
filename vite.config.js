import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  // Tailwind v4 runs as a Vite plugin. No tailwind.config.js and no
  // content array: v4 auto-detects sources and is configured with CSS
  // `@theme` / `@custom-variant` at-rules instead.
  plugins: [react(), tailwindcss()],
});
