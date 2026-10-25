import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { checkNotes } from "./check-notes.mjs";

const script = fileURLToPath(new URL("./check-notes.mjs", import.meta.url));
function fixture(run) {
  const cwd = mkdtempSync(join(tmpdir(), "artroom-check-notes-"));
  const git = (...args) => execFileSync("git", ["-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", ...args], { cwd, encoding: "utf8" }).trim();
  const put = (path, bytes) => { mkdirSync(dirname(join(cwd, path)), { recursive: true }); writeFileSync(join(cwd, path), bytes); };
  const commit = () => { git("add", "--all"); git("commit", "-m", "Fixture notes"); return git("rev-parse", "HEAD"); };
  const check = (base, head) => spawnSync(process.execPath, [script, base, head], { cwd, encoding: "utf8" });
  try {
    git("init", "-b", "main"); git("config", "user.name", "Notes test"); git("config", "user.email", "notes-test@example.invalid");
    run({ cwd, git, put, commit, check });
  } finally { rmSync(cwd, { recursive: true, force: true }); }
}

// Byte length and the committed head decide the warning. The bound is strict;
// unchanged historical notes and later working-tree edits do not change it.
test("changed implementation notes warn only above 40960 committed bytes without failing", () => fixture(({ cwd, git, put, commit, check }) => {
  put("notes/implementation/old.md", "x".repeat(40_961));
  put("notes/implementation/current.md", "small"); const base = commit();
  put("notes/implementation/current.md", "é".repeat(20_480) + "!");
  put("notes/implementation/exact.md", "x".repeat(40_960)); const head = commit();
  put("notes/implementation/current.md", "uncommitted shorter note");
  const before = git("status", "--porcelain");
  assert.deepEqual(checkNotes({ cwd, base, head }).warnings, [{ rule: "large-note", path: "notes/implementation/current.md", bytes: 40_961 }]);
  const result = check(base, head);
  assert.equal(result.status, 0); assert.equal(result.stderr, "");
  assert.equal(result.stdout.split("\n").filter(line => line.startsWith("warning:")).length, 1);
  assert.match(result.stdout, /current\.md.*40961 bytes/);
  assert.equal(git("status", "--porcelain"), before); assert.equal(git("rev-parse", "HEAD"), head);
}));

// The evidence rule concerns new paths, not modified legacy output. A manifest
// suffix is exact, and a filename with a newline still prints one warning line.
test("new non-manifest evidence paths warn while manifests and modified historical paths stay allowed", () => fixture(({ cwd, git, put, commit, check }) => {
  put("notes/implementation/evidence/legacy.json", "old"); const base = commit();
  const path = "notes/implementation/evidence/run\noutput.json";
  put(path, "new"); put("notes/implementation/evidence/run.manifest.json", "{}");
  put("notes/implementation/evidence/legacy.json", "changed"); const head = commit();
  const tree = git("rev-parse", "HEAD^{tree}");
  assert.deepEqual(checkNotes({ cwd, base, head }).warnings, [{ rule: "non-manifest-evidence", path }]);
  const result = check(base, head);
  assert.equal(result.status, 0); assert.equal(result.stderr, "");
  assert.equal(result.stdout.split("\n").filter(line => line.startsWith("warning:")).length, 1);
  assert.match(result.stdout, /run\\noutput\.json/);
  assert.equal(git("rev-parse", "HEAD^{tree}"), tree); assert.equal(git("status", "--porcelain"), "");
}));

// A clean range is quiet even with historical oversized/raw files. Findings
// never fail; missing Git/base data is an operational error, not a clean scan.
test("a clean head reports no warnings and a missing base remains an operational error", () => fixture(({ cwd, git, put, commit, check }) => {
  put("notes/implementation/old.md", "x".repeat(40_961));
  put("notes/implementation/evidence/old.log", "historical"); const head = commit();
  assert.deepEqual(checkNotes({ cwd, base: head, head }), { warnings: [] });
  const clean = check(head, head);
  assert.equal(clean.status, 0); assert.equal(clean.stdout, "notes: 0 warnings\n"); assert.equal(clean.stderr, "");
  const missing = check("", head);
  assert.equal(missing.status, 2); assert.match(missing.stderr, /base or head is missing/);
  assert.equal(git("rev-parse", "HEAD"), head); assert.equal(git("status", "--porcelain"), "");
}));
