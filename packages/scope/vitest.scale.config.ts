import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";
import { scopeScaleFiles } from "./vitest.scale-files.ts";
import { scaleDeadlineFactor } from "./test/support/archive-scale-deadline.ts";

// All scale owners retain the original Worker, setup and limits.
export default defineConfig({
  define: { __ARTROOM_SCALE_DEADLINE_FACTOR__: String(scaleDeadlineFactor(process.env["ARTROOM_SCALE_DEADLINE_FACTOR"])) },
  plugins: [cloudflareTest({ main: "./test/worker.ts", wrangler: { configPath: "./wrangler.test.jsonc" } })],
  test: {
    globalSetup: ["./test/support/local-clone-setup.ts", "./test/support/maintained-applications-setup.ts"],
    include: [...scopeScaleFiles],
    isolate: false,
    maxWorkers: 2,
    testTimeout: 30_000,
  },
});
