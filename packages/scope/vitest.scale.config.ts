import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";
import { scopeScaleFiles } from "../../vitest.projects.mjs";

// The four complete scale owners retain the original Worker, setup and limits.
export default defineConfig({
  plugins: [cloudflareTest({ main: "./test/worker.ts", wrangler: { configPath: "./wrangler.test.jsonc" } })],
  test: {
    globalSetup: ["./test/support/local-clone-setup.ts", "./test/support/maintained-applications-setup.ts"],
    include: [...scopeScaleFiles],
    isolate: false,
    maxWorkers: 2,
    testTimeout: 30_000,
  },
});
