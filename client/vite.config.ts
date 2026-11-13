/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Development: forward API calls to the Express server, so the browser sees one origin.
    proxy: { "/api": "http://localhost:3000" },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./tests/setup.ts",
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
