import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

// The installed launcher returns one JSON document on stdout and its actual exit agrees with the document.
test("the launcher preserves the JSON document and process exit for an early refusal", () => {
  const home = mkdtempSync(join(tmpdir(), "dap-json-process-"));
  try {
    const bin = fileURLToPath(new URL("../bin/dap.js", import.meta.url));
    const child = spawnSync(process.execPath, [bin, "mcp", "--json"], { encoding: "utf8", env: { ...process.env, DAP_HOME: home, ARTROOM_HOME: home }, timeout: 30_000 });
    expect(child.status).toBe(2); expect(child.stderr).toBe("");
    expect(child.stdout.split("\n")).toHaveLength(2);
    expect(JSON.parse(child.stdout)).toMatchObject({ command: ["mcp"], phase: "parse", status: "usage", exit: child.status, error: { code: "long-lived" } });
  } finally { rmSync(home, { recursive: true, force: true }); }
});
