import { afterAll, beforeAll, expect, test } from "vitest";
import { DIFF_BOUNDS, boundedDiff, type DiffBounds } from "../src/diff.ts";
import { GitRefusal, repositorySource, type GitSource } from "../src/index.ts";
import { bare, blob, cleanup, commit, git, program, put, tree } from "./support/repo.ts";

afterAll(cleanup);

// Real local Git objects, read by object ID. Real `git apply` is the oracle for the text. A local repository is not a host.
let dir: string;
let source: GitSource;
let f: Record<"base" | "next" | "many" | "large" | "binary" | "long", string>;
const lines = (count: number, word = "line") => Array.from({ length: count }, (_, n) => `${word} ${n}\n`).join("");
beforeAll(() => {
  dir = bare();
  source = repositorySource(program(), dir);
  const kept = blob(dir, lines(40)), gone = blob(dir, "gone\n"), inner = blob(dir, "inner\n");
  const sub = tree(dir, [`100644 blob ${inner}\tinner`]);
  const base = commit(dir, tree(dir, [`040000 tree ${sub}\tdir`, `100644 blob ${gone}\tgone`, `100644 blob ${kept}\tkept`]), []);
  const edited = blob(dir, lines(40).replace("line 20\n", "line twenty\n")), added = blob(dir, "added, with no last newline"), innerNext = blob(dir, "inner next\n");
  const subNext = tree(dir, [`100644 blob ${innerNext}\tinner`, `100644 blob ${added}\tnew`]);
  const next = commit(dir, tree(dir, [`040000 tree ${subNext}\tdir`, `100644 blob ${edited}\tkept`]), [base]);
  const many = commit(dir, tree(dir, Array.from({ length: 6 }, (_, n) => `100644 blob ${blob(dir, `file ${n}\n`)}\tfile-${n}`)), []);
  const long = commit(dir, tree(dir, [`100644 blob ${blob(dir, lines(4000, "a long line of the change"))}\tkept`]), [base]);
  const large = commit(dir, tree(dir, [`100644 blob ${blob(dir, lines(30000))}\tkept`]), [base]);
  const binary = commit(dir, tree(dir, [`100644 blob ${put(dir, "blob", new Uint8Array([1, 0, 2]))}\tkept`]), [base]);
  f = { base, next, many, large, binary, long };
});

/** The tree that `git apply` makes from the diff's text on top of the base commit, in an index of its own. */
const applied = (base: string, patch: string): string => {
  git(dir, ["read-tree", base]);
  git(dir, ["apply", "--cached", "-p1", "--whitespace=nowarn", "-"], patch);
  return git(dir, ["write-tree"]);
};

test("the text of a bounded diff applies with git to the exact tree of the integration commit", async () => {
  const answer = await boundedDiff(source, f.base, f.next);
  expect(answer).toMatchObject({ base: f.base, integration: f.next, files: 4, truncated: false });
  expect(answer.text).not.toContain("truncated");
  expect(answer.text).toContain("--- a/gone\n+++ /dev/null\n");
  expect(answer.text).toContain("--- /dev/null\n+++ b/dir/new\n");
  expect(answer.text).toContain("\\ No newline at end of file\n");
  expect(answer.text).toContain("-line 20\n+line twenty\n");
  expect(applied(f.base, answer.text)).toBe(git(dir, ["rev-parse", `${f.next}^{tree}`]));
});

test("over a bound the answer says truncated and keeps what it read; a binary file is no truncation", async () => {
  const over = async (head: string, bounds: Partial<DiffBounds>) => boundedDiff(source, f.base, head, { ...DIFF_BOUNDS, ...bounds });
  const files = await over(f.many, { files: 2 });
  expect([files.truncated, files.files, files.text.split("\n").at(-2)]).toEqual([true, 2, "truncated: the answer reached its bound of 2 files. This diff does not show the whole change."]);
  const text = await boundedDiff(source, f.base, f.long);
  expect([text.truncated, text.text.endsWith("This diff does not show the whole change.\n")]).toEqual([true, true]);
  expect(text.text).toContain("truncated: the text reached its bound of 40960 bytes");
  expect(new TextEncoder().encode(JSON.stringify(text.text)).length).toBeLessThanOrEqual(DIFF_BOUNDS.textBytes + 512);
  const large = await over(f.large, { blobBytes: 2048 });
  expect([large.truncated, large.text]).toEqual([true, expect.stringContaining("omitted: the file kept is too large to read\n")]);
  expect(large.text).toContain("truncated: the file kept is over its bound of 2048 bytes");
  const objects = await over(f.next, { objects: 2 });
  expect([objects.truncated, objects.text]).toEqual([true, "truncated: the read reached its bound of 2 objects. This diff does not show the whole change.\n"]);
  let clock = 0;
  const late = await boundedDiff(source, f.base, f.next, DIFF_BOUNDS, () => (clock += DIFF_BOUNDS.milliseconds));
  expect([late.truncated, late.text]).toEqual([true, expect.stringContaining("truncated: the read reached its bound of 20000 ms")]);
  const binary = await boundedDiff(source, f.base, f.binary);
  expect([binary.truncated, binary.text]).toEqual([false, expect.stringContaining("Binary files a/kept and b/kept differ\n")]);
});

test("a read over the transport's bound says truncated; a missing object is a refusal and no invented change", async () => {
  const tooLarge: GitSource = { ...source, object: async () => { throw new GitRefusal("too-large", "upload response"); } };
  const pack = await boundedDiff(tooLarge, f.base, f.next);
  expect([pack.truncated, pack.files, pack.text]).toEqual([true, 0, "truncated: the base commit or the pack that holds it is over the read bound. This diff does not show the whole change.\n"]);
  const absent: GitSource = { ...source, object: async (id, limit) => id === f.next ? null : source.object(id, limit) };
  await expect(boundedDiff(absent, f.base, f.next)).rejects.toMatchObject({ reason: "missing-object" });
  await expect(boundedDiff(source, "not an id", f.next)).rejects.toBeInstanceOf(GitRefusal);
});
