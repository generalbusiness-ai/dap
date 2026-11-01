import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, expect, test } from "vitest";
import { DIFF_BOUNDS, boundedDiff, boundedFile, boundedInterdiff, type BoundedInterdiff } from "../src/diff.ts";
import { GitRefusal, repositorySource, type GitSource } from "../src/index.ts";
import { cleanup, git, program, scratch } from "./support/repo.ts";

afterAll(cleanup);

// Real local Git: real commits, a real `git rebase`, and real `git diff`, `git apply` and `git show` as oracles. A local repository is not a host.
const lines = (count: number, word = "line") => Array.from({ length: count }, (_, n) => `${word} ${n}\n`).join("");
const edit = (dir: string, name: string, from: string, to: string): void => { const path = join(dir, name); writeFileSync(path, readFileSync(path, "utf8").replace(from, to)); };
const commit = (dir: string, message: string): string => { git(dir, ["add", "-A"]); git(dir, ["commit", "-qm", message]); return git(dir, ["rev-parse", "HEAD"]); };
const utf8 = (text: string) => new TextEncoder().encode(text);
const jsonBytes = (text: string) => new TextEncoder().encode(JSON.stringify(text)).length;
const LABELS = { from: "Version 1", to: "Version 2" };

let dir: string;
let source: GitSource;
/** Points of the scene. b1 and b2 are the two bases. Each v is an integration. */
let at: Record<"b1" | "b2" | "b3" | "v1" | "sameBase" | "rebased" | "rebasedEdited" | "conflict" | "dropped" | "many", string>;
beforeAll(() => {
  dir = scratch();
  git(dir, ["init", "-q", "-b", "main"]);
  mkdirSync(join(dir, "dir"));
  for (const [name, text] of [["kept.txt", lines(40, "kept")], ["moved.txt", lines(40, "moved")], ["base-only.txt", "base only\n"], ["dir/inner.txt", lines(10, "inner")], ["bin", "\0binary\0"]] as const) writeFileSync(join(dir, name), text);
  const b1 = commit(dir, "base one");
  // Version 1 edits kept.txt and moved.txt on base one.
  git(dir, ["checkout", "-qb", "change"]);
  edit(dir, "kept.txt", "kept 20\n", "kept twenty, by the change\n");
  edit(dir, "moved.txt", "moved 30\n", "moved thirty, by the change\n");
  const v1 = commit(dir, "version 1");
  // Version 2 on the same base edits one more line.
  git(dir, ["checkout", "-qb", "same-base"]);
  edit(dir, "kept.txt", "kept 25\n", "kept twenty five, after the review\n");
  const sameBase = commit(dir, "version 2 on the same base");
  // The base moves: it edits moved.txt far from the change's line, edits base-only.txt, and adds a file.
  git(dir, ["checkout", "-q", "main"]);
  edit(dir, "moved.txt", "moved 2\n", "moved two, by the base\n");
  writeFileSync(join(dir, "base-only.txt"), "base only, moved by the base\n");
  writeFileSync(join(dir, "dir/added-by-base.txt"), "added by the base\n");
  const b2 = commit(dir, "base two");
  // A real rebase of version 1, with no other edit.
  git(dir, ["checkout", "-qb", "rebased", v1]);
  git(dir, ["rebase", "-q", b2]);
  const rebased = git(dir, ["rev-parse", "HEAD"]);
  // The same rebase, then the edits the reviewer asked for: one in a file the base left alone and one in a file the base moved.
  git(dir, ["checkout", "-qb", "rebased-edited"]);
  edit(dir, "kept.txt", "kept 25\n", "kept twenty five, after the review\n");
  edit(dir, "moved.txt", "moved 35\n", "moved thirty five, after the review\n");
  const rebasedEdited = commit(dir, "version 2 rebased and edited");
  // A base that edits the change's own line: the rebase has a conflict, and its resolution is a new edit.
  git(dir, ["checkout", "-qb", "conflict-base", b2]);
  edit(dir, "moved.txt", "moved 30\n", "moved thirty, by the base\n");
  const b3 = commit(dir, "the base edits the change's line");
  writeFileSync(join(dir, "moved.txt"), readFileSync(join(dir, "moved.txt"), "utf8").replace("moved thirty, by the base\n", "moved thirty, by both\n"));
  edit(dir, "kept.txt", "kept 20\n", "kept twenty, by the change\n");
  const conflict = commit(dir, "version 2 resolved by hand");
  // A rebase that drops version 1's edit of moved.txt.
  git(dir, ["checkout", "-qb", "dropped", b2]);
  edit(dir, "kept.txt", "kept 20\n", "kept twenty, by the change\n");
  const dropped = commit(dir, "version 2 without the moved.txt edit");
  // Many edited files, for the bounds.
  git(dir, ["checkout", "-qb", "many", v1]);
  for (let n = 0; n < 6; n++) writeFileSync(join(dir, `file-${n}.txt`), lines(4000, `long line of file ${n}`));
  const many = commit(dir, "many");
  at = { b1, b2, b3, v1, sameBase, rebased, rebasedEdited, conflict, dropped, many };
  source = repositorySource(program(), dir);
});

/** The paths real git reports between two commits. */
const changed = (a: string, b: string): string[] => git(dir, ["diff", "--name-only", "--no-renames", a, b]).split("\n").filter(Boolean);
const interdiff = (to: { base: string; integration: string }, bounds = DIFF_BOUNDS): Promise<BoundedInterdiff> => boundedInterdiff(source, { base: at.b1, integration: at.v1 }, to, LABELS, bounds);

test("a diff's text names both exact commits before its lines, and an empty one says no difference", async () => {
  const answer = await boundedDiff(source, at.b1, at.v1);
  const [title, base, integration] = answer.text.split("\n");
  expect([title, base, integration]).toEqual(["Diff between two exact commits.", `Base: ${at.b1}`, `Integration: ${at.v1}`]);
  expect((await boundedDiff(source, at.v1, at.v1)).text).toContain("No difference: the two commits hold the same files.\n");
});

test("each file of a diff lists the commit that holds it: the integration, or the base for a deleted path", async () => {
  const answer = await boundedDiff(source, at.b2, at.b1);
  expect(answer.paths?.map(item => [item.shown, item.commit])).toEqual([["base-only.txt", at.b1], ["dir/added-by-base.txt", at.b2], ["moved.txt", at.b1]]);
});

test("on an unchanged base, the interdiff names the four points, says every line comes from the change, and its text applies with git to version 2's exact tree", async () => {
  const answer = await interdiff({ base: at.b1, integration: at.sameBase });
  expect(answer.rebased).toBe(false);
  expect(answer.text.split("\n").slice(0, 3)).toEqual(["Interdiff between two versions of one change.", `Version 1: base ${at.b1}, integration ${at.v1}`, `Version 2: base ${at.b1}, integration ${at.sameBase}`]);
  expect(answer.text).toContain("Both versions name one base, so every line below comes from the change.");
  expect(answer.text).toContain("-kept 25\n+kept twenty five, after the review\n");
  expect(answer.text).not.toContain("kept twenty, by the change\n+");
  git(dir, ["read-tree", at.v1]);
  git(dir, ["apply", "--cached", "-p1", "--whitespace=nowarn", "-"], answer.text);
  expect(git(dir, ["write-tree"])).toBe(git(dir, ["rev-parse", `${at.sameBase}^{tree}`]));
  git(dir, ["read-tree", "HEAD"]);
  const none = await interdiff({ base: at.b1, integration: at.v1 });
  expect([none.files, none.text]).toEqual([0, expect.stringContaining("No difference: the two integrations hold the same files.")]);
});

test("a real rebase with no other edit: the interdiff says the version makes no edit of its own, names what the base moved and shows none of its lines", async () => {
  const answer = await interdiff({ base: at.b2, integration: at.rebased });
  expect([answer.rebased, answer.edited, answer.mixed, answer.carried, answer.baseOnly]).toEqual([true, 0, 0, 1, 2]);
  expect(answer.text).toContain(`Version 1: base ${at.b1}, integration ${at.v1}`);
  expect(answer.text).toContain(`Version 2: base ${at.b2}, integration ${at.rebased}`);
  expect(answer.text).toContain("Version 2 names a new base.");
  expect(answer.text).toContain("Version 2 makes no edit of its own");
  expect(answer.text).toContain("The same edit as Version 1 on the new base. These files show no lines:\nmoved.txt\n");
  expect(answer.text).toContain("Changed only by the new base. These files show no lines:\nbase-only.txt\ndir/added-by-base.txt\n");
  // Real git says these paths differ between the integrations, and the base's own lines are what the direct diff would show.
  expect(changed(at.v1, at.rebased).sort()).toEqual(["base-only.txt", "dir/added-by-base.txt", "moved.txt"]);
  for (const line of ["moved two, by the base", "base only, moved by the base", "added by the base", "moved thirty, by the change"]) expect(answer.text).not.toContain(line);
  expect(answer.text).not.toContain("Cannot separate. The new base");
});

test("a rebase with edits: an edit in a file the base left alone shows as version 2's, and an edit in a file the base moved says it cannot separate and shows both versions' patches", async () => {
  const answer = await interdiff({ base: at.b2, integration: at.rebasedEdited });
  expect([answer.edited, answer.mixed, answer.carried, answer.baseOnly]).toEqual([1, 1, 0, 2]);
  expect(answer.text).toContain("Edited by Version 2, shown below: 1 file.\nCannot separate from the new base, shown below: 1 file.\n");
  const edited = answer.text.slice(answer.text.indexOf("Edited by Version 2. The new base did not change these files:"), answer.text.indexOf("Cannot separate. The new base"));
  expect(edited).toContain("--- a/kept.txt\n+++ b/kept.txt\n");
  expect(edited).toContain("-kept 25\n+kept twenty five, after the review\n");
  expect(edited).not.toContain("moved.txt");
  const mixed = answer.text.slice(answer.text.indexOf("Cannot separate. The new base"), answer.text.indexOf("Changed only by the new base. These"));
  expect(mixed).toContain("A difference between the two patches can come from the new base or from Version 2.");
  expect(mixed).toContain(`Version 1's patch of moved.txt, from base ${at.b1} to integration ${at.v1}:`);
  expect(mixed).toContain(`Version 2's patch of moved.txt, from base ${at.b2} to integration ${at.rebasedEdited}:`);
  expect(mixed).toContain("-moved 30\n+moved thirty, by the change\n");
  expect(mixed).toContain("+moved thirty five, after the review\n");
  // The base's edit at line 2 lies outside both patches, so neither shows it.
  expect(answer.text).not.toContain("moved two, by the base");
  expect(answer.text).not.toContain("Version 2 makes no edit of its own");
});

test("a base that edits the change's own line: the hand resolution stays in the section that cannot separate, and each path git reports falls in one class", async () => {
  const answer = await interdiff({ base: at.b3, integration: at.conflict });
  expect(answer.mixed).toBe(1);
  expect(answer.text).toContain("Version 2's patch of moved.txt");
  expect(answer.text).toContain("-moved thirty, by the base\n+moved thirty, by both\n");
  for (const [base, to] of [[at.b2, at.rebased], [at.b2, at.rebasedEdited], [at.b3, at.conflict], [at.b2, at.dropped]] as const) {
    const each = await interdiff({ base, integration: to });
    expect(each.edited + each.mixed + each.carried + each.baseOnly, to).toBe(changed(at.v1, to).length);
    expect(each.files, to).toBe(changed(at.v1, to).length);
    expect(each.truncated, to).toBe(false);
  }
});

test("a rebase that drops an edit says that version does not change the file", async () => {
  const answer = await interdiff({ base: at.b2, integration: at.dropped });
  expect(answer.mixed).toBe(1);
  expect(answer.text).toContain("Version 2 does not change this file.\n");
  expect(answer.text).toContain("-moved 30\n+moved thirty, by the change\n");
  // And its reverse, with the versions named the other way: a file that only the later version edits.
  const reverse = await boundedInterdiff(source, { base: at.b2, integration: at.dropped }, { base: at.b1, integration: at.v1 }, LABELS);
  expect(reverse.text).toContain("Version 1 does not change this file.\n");
});

test("each file of an interdiff lists its holder, and a path that only the base changed lists nothing, because no version edits it", async () => {
  const answer = await interdiff({ base: at.b2, integration: at.rebasedEdited });
  expect(answer.paths.map(item => [item.shown, item.commit])).toEqual([["kept.txt", at.rebasedEdited], ["moved.txt", at.rebasedEdited]]);
});

test("over a bound, an interdiff says truncated, stays inside the bound, and says which file and which paths it left out", async () => {
  const text = await interdiff({ base: at.b1, integration: at.many });
  expect(text.truncated).toBe(true);
  expect(jsonBytes(text.text)).toBeLessThanOrEqual(DIFF_BOUNDS.textBytes);
  expect(text.text).toContain("truncated: the text reached its bound of 40960 bytes. Left out: the last ");
  expect(text.text).toMatch(/Left out: the last \d+ lines of the patch of file-0\.txt and every path after it\. This interdiff does not show the whole change\.\n$/);
  expect(text.leftOut).toMatch(/^the last \d+ lines of the patch of file-0\.txt and every path after it$/);
  const files = await interdiff({ base: at.b1, integration: at.sameBase }, { ...DIFF_BOUNDS, files: 0 });
  expect(files.text).toContain("Left out: every changed path, because the read stopped before it reached one.");
  const small = await interdiff({ base: at.b1, integration: at.many }, { ...DIFF_BOUNDS, files: 2, blobBytes: 1024 });
  expect(small.text).toContain("omitted: the file file-0.txt is too large to read\n");
  expect(small.text).toContain("Left out: every path after file-1.txt, and 2 files or trees too large to read, each on an omitted line.");
  // A rebased walk: the reads of the bases count, and a stop in them says so.
  const stopped = await interdiff({ base: at.b2, integration: at.rebased }, { ...DIFF_BOUNDS, objects: 6 });
  expect(stopped.truncated).toBe(true);
  expect(stopped.text).toContain("truncated: the read reached its bound of 6 objects.");
  expect(stopped.text).toContain("This interdiff does not show the whole change.");
  expect(stopped.text).not.toContain("makes no edit of its own");
});

test("an interdiff shows no change it did not read: a version's missing commit is a refusal", async () => {
  const absent: GitSource = { ...source, object: async (id, limit) => id === at.v1 ? null : source.object(id, limit) };
  await expect(boundedInterdiff(absent, { base: at.b1, integration: at.v1 }, { base: at.b2, integration: at.rebased }, LABELS)).rejects.toMatchObject({ reason: "missing-object" });
  await expect(boundedInterdiff(source, { base: "not an id", integration: at.v1 }, { base: at.b2, integration: at.rebased }, LABELS)).rejects.toBeInstanceOf(GitRefusal);
});

test("a file view names its exact commit, and the same path at two commits shows each commit's bytes", async () => {
  const first = await boundedFile(source, at.b1, utf8("kept.txt")), second = await boundedFile(source, at.v1, utf8("kept.txt"));
  expect(first.text.split("\n").slice(0, 4)).toEqual(["File at an exact commit.", `Commit: ${at.b1}`, "Path: kept.txt", `Object: ${git(dir, ["rev-parse", `${at.b1}:kept.txt`])}`]);
  expect(first.text.endsWith(`${git(dir, ["show", `${at.b1}:kept.txt`])}\n`)).toBe(true);
  expect(second.text).toContain(`Commit: ${at.v1}`);
  expect(second.text).toContain("kept twenty, by the change\n");
  expect(first.text).not.toContain("by the change");
  expect([first.kind, first.lines, first.shown, first.truncated]).toEqual(["text", 40, 40, false]);
  const inner = await boundedFile(source, at.b1, utf8("dir/inner.txt"));
  expect(inner.text).toContain("inner 9\n");
});

test("a file view says what a commit holds at a path that is no text file", async () => {
  const of = async (path: string, commit = at.b1) => { const answer = await boundedFile(source, commit, utf8(path)); return [answer.kind, answer.truncated]; };
  expect(await of("nothing.txt")).toEqual(["absent", false]);
  expect(await of("kept.txt/below")).toEqual(["absent", false]);
  expect(await of("dir/added-by-base.txt")).toEqual(["absent", false]);
  expect(await of("dir/added-by-base.txt", at.b2)).toEqual(["text", false]);
  expect(await of("dir")).toEqual(["directory", false]);
  expect(await of("bin")).toEqual(["binary", false]);
  expect((await boundedFile(source, at.b1, utf8("nothing.txt"))).text).toContain("This commit holds no file at this path.");
  expect((await boundedFile(source, at.b1, utf8("bin"))).text).toContain("binary data");
});

test("over a bound, a file view says truncated and names the lines it left out", async () => {
  const long = await boundedFile(source, at.many, utf8("file-0.txt"));
  expect([long.truncated, long.lines, long.kind]).toEqual([true, 4000, "text"]);
  expect(long.shown).toBeGreaterThan(0);
  expect(long.leftOut).toBe(`lines ${long.shown + 1} to 4000 of 4000`);
  expect(long.text).toContain(`truncated: the text reached its bound of 40960 bytes. Left out: lines ${long.shown + 1} to 4000 of 4000. This view does not show the whole file.\n`);
  expect(jsonBytes(long.text)).toBeLessThanOrEqual(DIFF_BOUNDS.textBytes);
  const blob = await boundedFile(source, at.many, utf8("file-0.txt"), { ...DIFF_BOUNDS, blobBytes: 1024 });
  expect([blob.truncated, blob.kind, blob.leftOut]).toEqual([true, "omitted", "the whole file"]);
  expect(blob.text).toContain("truncated: the file is over its bound of 1024 bytes. Left out: the whole file.");
});
