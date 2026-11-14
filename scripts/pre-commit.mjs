import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { selectedJsonFiles } from "./format-json.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
function check() {
  if (!existsSync(join(root, "node_modules/prettier/bin/prettier.cjs"))) {
    console.error("pre-commit: local Prettier is missing; set up the committed dependencies with npm ci before committing.");
    return 1;
  }
  // The formatter reads working files. Refuse differences so its result also
  // describes the staged JSON, without changing the index or partial staging.
  const paths = execFileSync("git", ["diff", "--name-only", "--no-renames", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
  const unstaged = selectedJsonFiles(paths);
  if (unstaged.length) {
    console.error(`pre-commit: selected JSON differs from its staged version: ${unstaged.map(path => JSON.stringify(path)).join(", ")}`);
    console.error("Stage the formatted JSON before committing; the hook leaves partial staging unchanged.");
    return 1;
  }
  const result = spawnSync(process.execPath, ["scripts/format-json.mjs"], { cwd: root, stdio: "inherit" });
  if (result.error || result.signal || result.status !== 0) {
    console.error("pre-commit: run node scripts/format-json.mjs --write, review the changes, and stage them before committing.");
    return 1;
  }
  const helpers = spawnSync(process.execPath, ["scripts/check-shared-helpers.mjs"], { cwd: root, stdio: "inherit" });
  if (helpers.error || helpers.signal || helpers.status !== 0) {
    console.error("pre-commit: fix the shared-helper check before committing; import the existing helper or name the different meaning.");
    return 1;
  }
  return 0;
}

try { process.exitCode = check(); }
catch (error) {
  console.error(`pre-commit: cannot check formatting: ${error.message}`);
  process.exitCode = 1;
}
