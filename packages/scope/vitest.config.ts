import { defineConfig } from "vitest/config";

// Each witness runs once. Lending and the denial witness each have a
// separate real Worker runtime after the two-worker Scope project.
export default defineConfig({
  test: {
    projects: [
      { extends: "./vitest.worker.config.ts", test: { name: "scope", sequence: { groupOrder: 1 } } },
      { extends: "./vitest.lending.config.ts", test: { name: "scope-lending", sequence: { groupOrder: 2 } } },
      { extends: "./vitest.denial.config.ts", test: { name: "scope-denial", sequence: { groupOrder: 3 } } },
    ],
  },
});
