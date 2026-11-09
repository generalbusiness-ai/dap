// Format tracked JSON source; preserve literal protocol packets and retained evidence.
import { execFileSync, spawnSync } from "node:child_process";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The published reader requires these packet bytes to stay canonical.
export const CANONICAL_PROTOCOL_PACKETS = Object.freeze([
  "examples/grow/demo/application.dap.json",
]);

export function selectedJsonFiles(paths) {
  return paths.filter((path) => path.endsWith(".json")
    && !path.split("/").includes("node_modules")
    && !["package-lock.json", "npm-shrinkwrap.json", "bun.lock.json"].includes(basename(path))
    && !path.startsWith("notes/implementation/evidence/")
    && !CANONICAL_PROTOCOL_PACKETS.includes(path));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv.slice(2);
  if (mode.length > 1 || mode.length === 1 && mode[0] !== "--write") throw new Error("Use format-json.mjs [--write]");
  const root = fileURLToPath(new URL("../", import.meta.url));
  const paths = execFileSync("git", ["ls-files", "-z", "--", "*.json"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
  const files = selectedJsonFiles(paths);
  if (files.length) {
    const cli = fileURLToPath(new URL("../node_modules/prettier/bin/prettier.cjs", import.meta.url));
    const result = spawnSync(process.execPath, [cli, mode[0] ?? "--check", "--no-config", "--no-editorconfig", "--ignore-path", "/dev/null", "--", ...files], { cwd: root, stdio: "inherit" });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  }
}
