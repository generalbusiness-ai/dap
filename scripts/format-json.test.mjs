import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { selectedJsonFiles } from "./format-json.mjs";

test("tracked JSON formatting preserves the byte-compared Grow packet and retained evidence while selecting source", () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const paths = execFileSync("git", ["ls-files", "-z", "--", "*.json"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
  const packet = "examples/grow/demo/application.dap.json";
  assert.ok(paths.includes(packet), "The actual published byte-compared packet must exist");
  const selected = selectedJsonFiles(paths);
  assert.equal(selected.includes(packet), false, "The canonical packet reader must receive the original bytes");
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
