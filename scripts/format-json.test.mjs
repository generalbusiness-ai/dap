import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { selectedJsonFiles } from "./format-json.mjs";

test("tracked JSON formatting preserves both byte-compared Grow packets and retained evidence while selecting source", () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const paths = execFileSync("git", ["ls-files", "-z", "--", "*.json"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
  const selected = selectedJsonFiles(paths);
  for (const packet of ["examples/grow/demo/application.dap.json", "examples/grow/fixtures/earlier-application.dap.json"]) {
    assert.ok(paths.includes(packet), "Each actual byte-compared packet must exist");
    assert.equal(selected.includes(packet), false, "The canonical packet reader must receive each packet's original bytes");
  }
  for (const source of ["examples/grow/check/dap.application.json", "examples/grow/check/fault-scenario.json"]) {
    assert.ok(paths.includes(source), "The actual source with a byte-limited CLI read must exist");
    assert.equal(selected.includes(source), false, "Formatting must preserve the bounded source input");
  }
  assert.equal(selected.some(path => path.startsWith("notes/implementation/evidence/")), false);
  assert.ok(selected.includes("apps/room/lanes/definitions/change.json"));
  assert.ok(selected.includes("packages/checkers/test/fixtures/reservation-record.json"));
  assert.ok(selected.includes("packages/scope/tsconfig.json"));
  assert.deepEqual(selectedJsonFiles([
    "notes/implementation/evidence/future.manifest.json", "nested/node_modules/data.json",
    "package-lock.json", "nested/npm-shrinkwrap.json", "bun.lock.json",
    "a file.json", "é.json", "source.ts", "settings.jsonc",
  ]), ["a file.json", "é.json"]);
});
