import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

// The existing Lending story in its own real Worker and SQLite runtime.
// It needs neither the Node clone server nor maintained-package capture.
export default defineConfig({
  plugins: [cloudflareTest({ main: "./test/worker.ts", wrangler: { configPath: "./wrangler.test.jsonc" } })],
  test: {
    include: ["test/lending.test.ts"],
    isolate: false,
    maxWorkers: 1,
    // Preserve the story's existing framework allowance.
    testTimeout: 30_000,
  },
});
