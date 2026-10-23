import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { checkHistory, checkMessage } from "./check-commit-messages.mjs";

// Invariant: the subject bound counts Unicode code points, not UTF-16 units;
// detail belongs after an empty line rather than extending the subject.
test("subjects accept 100 code points and refuse 101 or an unseparated body", () => {
  assert.deepEqual(checkMessage("😀".repeat(100)), []);
  assert.deepEqual(checkMessage("x".repeat(100) + "\n\nDetail."), []);
  assert.deepEqual(checkMessage("😀".repeat(101)), [{ line: 1, rule: "subject-length", length: 101 }]);
  assert.deepEqual(checkMessage("Subject\nDetail"), [{ line: 2, rule: "body-separator" }]);
  assert.deepEqual(checkMessage("Good subject\n\nBody exactb8a4dea1", { subjectOnly: true }), []);
});

// Invariant: words cannot obscure hash boundaries, but ordinary names and
// bare hexadecimal identities remain legal. A slash is not a word separator
// between a word and the hash glued inside that same token.
test("word/hash boundaries distinguish glued prefixes and suffixes from names and bare hashes", () => {
  assert.deepEqual(checkMessage("Record exactb8a4dea1/tree73587f1b").map(issue => issue.token), ["exactb8a4dea1", "tree73587f1b"]);
  assert.deepEqual(checkMessage("Record b8a4dea1suffix").map(issue => issue.token), ["b8a4dea1suffix"]);
  assert.deepEqual(checkMessage("Record TREE73587F1B").map(issue => issue.token), ["TREE73587F1B"]);
  for (const token of ["résumé1234567", "ééé1234567", "1234567résumé", "1234567ééé", "𐐀𐐀𐐀1234567", "1234567𐐀𐐀𐐀"]) {
    assert.deepEqual(checkMessage("Record " + token).map(issue => issue.token), [token]);
  }
  assert.deepEqual(checkMessage("Record abc1234tail").map(issue => issue.token), ["abc1234tail"]);
  assert.deepEqual(checkMessage("Record preface1234567").map(issue => issue.token), ["preface1234567"]);
  for (const text of ["base64url sha256 ed25519", "b8a4dea1 deadbeef123 ABC1234567", "abcabcdefg", "xy123abcd ab123abcd", "tree 73587f1b", "73587f1b/suffix"]) {
    assert.deepEqual(checkMessage(text), [], text);
  }
  assert.deepEqual(checkMessage("Subject\n\nUse exactb8a4dea1 here.").map(issue => [issue.line, issue.token]), [[3, "exactb8a4dea1"]]);
});

// Invariant: only the complete terminal, blank-separated trailer block is
// exempt. Moving a violating line into ordinary prose cannot hide it.
test("terminal trailers are exempt while body lookalikes and continuation text remain checked", () => {
  const trailers = "Gitseq-Approval: exactb8a4dea1\nReviewed-by: tree73587f1b\n";
  assert.deepEqual(checkMessage("Subject\n\nDetail.\n\n" + trailers), []);
  assert.deepEqual(checkMessage("Subject\n\n" + trailers), []);
  assert.equal(checkMessage("Subject\n\nDetail.\n" + trailers).filter(issue => issue.rule === "glued-hash").length, 2);
  assert.equal(checkMessage("Subject\n\n" + trailers + "Further prose.").filter(issue => issue.rule === "glued-hash").length, 2);
  assert.equal(checkMessage("Subject\n\n" + trailers + " continuation exactb8a4dea1").filter(issue => issue.rule === "glued-hash").length, 3);
  assert.equal(checkMessage("Subject\nGitseq-Approval: exactb8a4dea1").filter(issue => issue.rule === "glued-hash").length, 1);
});

// Invariant: the real Git boundary checks every introduced commit, including
// a bad side commit behind a clean merge, without checking or rewriting base.
test("the command checks the whole base..head range, including side history, and fails closed on a missing base", () => {
  const cwd = mkdtempSync(join(tmpdir(), "artroom-commit-messages-"));
  const script = fileURLToPath(new URL("./check-commit-messages.mjs", import.meta.url));
  let date = "2026-10-10T12:00:00Z";
  const git = (...args) => execFileSync("git", ["-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", ...args], { cwd, encoding: "utf8", env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } }).trim();
  const commit = (file, subject) => { writeFileSync(join(cwd, file), file); git("add", "--", file); git("commit", "-m", subject); return git("rev-parse", "HEAD"); };
  try {
    git("init", "-b", "main"); git("config", "user.name", "Commit test"); git("config", "user.email", "commit-test@example.invalid");
    const base = commit("base", "Old exactb8a4dea1");
    git("checkout", "-b", "side"); date = "2026-09-14T12:00:00Z";
    const side = commit("side", "New tree73587f1b");
    git("checkout", "main"); date = "2026-09-15T12:00:00Z"; commit("main", "Good subject");
    date = "2026-10-20T12:00:00Z"; git("merge", "--no-ff", "side", "-m", "Merge side");
    const head = git("rev-parse", "HEAD"), before = git("rev-parse", "HEAD^{tree}");
    const historical = checkHistory({ cwd, since: "1900-01-01T00:00:00Z", head });
    assert.equal(historical.subjectOnly, true); assert.equal(historical.checked, 4);
    assert.deepEqual(new Set(historical.flagged.map(row => row.id)), new Set([base, side]));
    // Both parents predate the cutoff, but their shared ancestor is newer.
    // A pruning --since walk would miss that reachable violating subject.
    const inverted = checkHistory({ cwd, since: "2026-10-01T00:00:00Z", head });
    assert.equal(inverted.checked, 2);
    assert.deepEqual(inverted.flagged.map(row => row.id), [base]);
    const report = checkHistory({ cwd, base, head });
    assert.equal(report.checked, 3); assert.deepEqual(report.flagged.map(row => row.id), [side]);
    assert.deepEqual(report.flagged[0].issues.map(issue => issue.token), ["tree73587f1b"]);
    assert.deepEqual(checkHistory({ cwd, base: head, head }), { checked: 0, subjectOnly: false, flagged: [] });
    const failed = spawnSync(process.execPath, [script, base, head], { cwd, encoding: "utf8" });
    assert.equal(failed.status, 1); assert.match(failed.stderr, /glued-hash: tree73587f1b/);
    const missing = spawnSync(process.execPath, [script, "", head], { cwd, encoding: "utf8" });
    assert.equal(missing.status, 2); assert.match(missing.stderr, /base or head is missing/);
    assert.equal(git("rev-parse", "HEAD"), head); assert.equal(git("rev-parse", "HEAD^{tree}"), before); assert.equal(git("status", "--porcelain"), "");
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});
