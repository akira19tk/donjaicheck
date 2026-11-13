import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

// E2E runs against the development database with the seeded demo accounts (server/.env).
loadEnv({ path: "server/.env" });

const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    // Set PW_CHANNEL=chrome to use an installed Google Chrome instead of `npx playwright install chromium`.
    ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}),
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Production-like: the server serves the built client from one origin.
    command: "npm --prefix client run build && npm --prefix server run build && node server/dist/index.js",
    url: `http://localhost:${PORT}/api/ready`,
    env: { PORT: String(PORT) },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
