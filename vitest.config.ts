import path from "path";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Load .env.test.local (falling back to .env.test/.env/.env.local per
// Vite's normal precedence) regardless of how vitest is invoked. Without
// this, only `npm run test` (which wraps vitest in `dotenv -e
// .env.test.local --`) pointed at the isolated test database — a bare
// `npx vitest run` silently fell through to whatever `.env`/`.env.local`
// resolved, which is the real dev database. That let a session's worth of
// test runs write thousands of throwaway companies into dev data before
// being caught.
Object.assign(process.env, loadEnv("test", process.cwd(), ""));

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 15000,
    hookTimeout: 15000,
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
