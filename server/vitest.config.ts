import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // All API test files share one test database: run them one at a time.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
    globalSetup: "./tests/globalSetup.ts",
    setupFiles: ["./tests/setup.ts"],
  },
});
