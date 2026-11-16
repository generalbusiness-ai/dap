/** Check the existing pinned-value owners before the gate's test stages. */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const env = { ...process.env };
// The inventory check must compare retained documents, never rewrite them.
delete env.MCP_WRITE_DOCS;

const steps = [
  ["formal-sources", ".", ["scripts/check-formal-source-hashes.mjs"]],
  ["compatibility", ".", ["scripts/cloudflare-pool-compat.mjs"]],
  ["security", ".", ["--test", "scripts/security-entry-points.test.mjs"]],
  ["release", "packages/cli", ["../../node_modules/vitest/vitest.mjs", "run", "--config", "vitest.config.ts", "test/application-release-reproduction.test.ts"]],
  ["page", "apps/room/page", ["../../../node_modules/vitest/vitest.mjs", "run", "--config", "vitest.config.ts", "test/assets.test.ts"]],
  ["card", "packages/mcp", ["../../node_modules/vitest/vitest.mjs", "run", "--config", "vitest.config.ts", "test/view-resources.test.ts"]],
  ["examples", "packages/cli", ["../../node_modules/vitest/vitest.mjs", "run", "--config", "vitest.config.ts", "test/application-examples.test.ts"]],
  ["inventory", "packages/mcp", ["../../node_modules/vitest/vitest.mjs", "run", "--config", "vitest.config.ts", "test/inventory.test.ts"]],
];

const started = performance.now();
let budgetReported = false;
function overBudget(seconds) {
  if (seconds <= 60) return false;
  if (!budgetReported) {
    console.error(`pins exceeded 60 seconds (${seconds.toFixed(3)} s); stop and report the measured time to the planner`);
    budgetReported = true;
  }
  process.exitCode ||= 1;
  return true;
}
for (const [name, cwd, args] of steps) {
  const start = performance.now();
  const child = spawnSync(process.execPath, args, { cwd: resolve(root, cwd), env, stdio: "inherit" });
  const seconds = (performance.now() - start) / 1000;
  console.log(`pins ${name}: exit ${child.status ?? "none"}, elapsed ${seconds.toFixed(3)} s`);
  if (child.error || child.signal || child.status !== 0) {
    if (child.error) console.error(`pins ${name}: could not start`);
    if (child.signal) console.error(`pins ${name}: signal ${child.signal}`);
    process.exitCode = child.status || 1;
    break;
  }
  // Let each owner finish, then stop before another starts if the stage is over budget.
  if (overBudget((performance.now() - started) / 1000)) break;
}
const seconds = (performance.now() - started) / 1000;
console.log(`pins total: ${seconds.toFixed(3)} s`);
// Include completion overhead without killing an owner or changing its deadline.
overBudget((performance.now() - started) / 1000);
