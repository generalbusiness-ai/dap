import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, renameSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { gateTestDecision, gateTestSelection } from "./gate-test-selection.mjs";

test("only a nonempty notes-only change skips the test step", () => {
  assert.equal(gateTestDecision(["notes/design.md", "notes/implementation/change.md"]).skip, true);
  for (const paths of [[], ["docs/testing.md"], ["notes/design.md", "packages/derive/src/grant.ts"], ["notes.md"]]) {
    assert.equal(gateTestDecision(paths).skip, false, JSON.stringify(paths));
  }
  assert.throws(() => gateTestDecision([null]), /complete changed-path list/);
});

test("the real merge-base range keeps earlier source changes and both sides of a rename", () => {
  // Real scratch Git, not a running gate or application. No checkout input changes.
  const cwd = mkdtempSync(join(tmpdir(), "artroom-gate-test-selection-"));
  const git = (...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: "pipe" }).trim();
  const put = (path, text) => { mkdirSync(dirname(join(cwd, path)), { recursive: true }); writeFileSync(join(cwd, path), text); };
  const commit = () => { git("add", "--all"); git("-c", "commit.gpgsign=false", "commit", "-m", "Change selection fixture"); };
  git("init", "--initial-branch=main", "--object-format=sha1");
  git("config", "user.name", "Selection test"); git("config", "user.email", "selection@example.invalid");
  put("notes/old note.md", "old\n"); put("packages/source.ts", "source\n"); commit();
  git("update-ref", "refs/remotes/origin/main", "HEAD");
  const base = git("merge-base", "HEAD", "origin/main");
  assert.equal(gateTestSelection({ cwd, base }).skip, false);
  put("notes/new\nnote.md", "new\n"); commit();
  assert.equal(gateTestSelection({ cwd, base }).skip, true);
  put("docs/guide.md", "guide\n"); commit();
  assert.equal(gateTestSelection({ cwd, base }).skip, false);
  git("switch", "-c", "mixed", "origin/main");
  put("packages/source.ts", "changed\n"); commit();
  put("notes/last.md", "last\n"); commit();
  assert.equal(gateTestSelection({ cwd, base }).skip, false, "the last note commit cannot hide earlier source changes");
  git("switch", "-c", "rename", "origin/main");
  mkdirSync(join(cwd, "docs"), { recursive: true });
  renameSync(join(cwd, "notes/old note.md"), join(cwd, "docs/moved note.md")); commit();
  const renamed = gateTestSelection({ cwd, base });
  assert.equal(renamed.skip, false);
  assert.deepEqual(renamed.changedPaths, ["docs/moved note.md", "notes/old note.md"]);
  assert.throws(() => gateTestSelection({ cwd, base: "" }), /needs a base and head/);
});
