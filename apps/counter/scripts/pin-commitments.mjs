// Regenerate through the shared typed authoring and canonical-byte producer.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const script = fileURLToPath(new URL("../../../scripts/check-definition-pins.mjs", import.meta.url));
const result = spawnSync(process.execPath, ["--import", "tsx", script, "--write", "counter"], { stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
