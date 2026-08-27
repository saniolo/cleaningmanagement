import { vi } from "vitest";

// Server Actions call revalidatePath(), which relies on Next.js's request-
// scoped AsyncLocalStorage and throws outside an actual request — inert it
// out here so action modules can be imported and exercised directly.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// React's cache() is only exported under the "react-server" module
// condition, which Next.js's build sets and plain Node/Vitest doesn't —
// stub it as an identity wrapper so lib/permissions/employee.ts (memoized
// per-request in production) still works as a plain function in tests.
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, cache: (fn: unknown) => fn };
});
